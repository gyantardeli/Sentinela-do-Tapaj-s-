import { RADAR_SOURCES, sourceIndexUrl, type RadarSource } from "./radar-sources";
import { acceptsPublisher, canonicalUrl, classifyText, cleanTitle, fold, parseFeed, type FeedMode, type RadarItem, type SourceCheck } from "./radar-core";
import { sourceText, sourceErrorKind, type SourceCooldowns } from "./source-http";
import { declaredPublisherFeeds, parsePublisherIndex } from "./publisher-index.mjs";
type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
async function hash(value: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join(""); }
export async function collectSource(source: RadarSource, now: number, fetcher: Fetcher = fetch, cooldowns:SourceCooldowns=new Map()): Promise<{ items: RadarItem[]; check: SourceCheck }> {
  const items=new Map<string,RadarItem>(), errors:string[]=[], methods:string[]=[];
  let directOk=false, siteOk=false, googleOk=false, found=0, undated=0;
  const accepted: Array<{entry:ReturnType<typeof parseFeed>[number];mode:FeedMode}> = [];
  const gather=(entries:ReturnType<typeof parseFeed>,mode:FeedMode)=>{
    found+=entries.length;
    for(const entry of entries){if(acceptsPublisher(entry,source,mode))accepted.push({entry,mode});}
  };
  const attemptFeed=async (link:string)=>{
    try{const entries=parseFeed(await sourceText(link,{fetcher,cooldowns,attempts:1,timeoutMs:7500,maxBytes:2_000_000}));
      if(entries.length&&!entries.some(e=>acceptsPublisher(e,source,"rss")))throw new Error("RSS sem origem verificavel");
      directOk=true;methods.push("rss");gather(entries,"rss");return true;
    }catch(error){errors.push("RSS: "+sourceErrorKind(error));return false;}
  };
  for(const feed of [...new Set((source.feeds??[]).slice(0,2))]){if(await attemptFeed(feed))break;}
  if(!directOk){
    try{
      const html=await sourceText(source.url,{fetcher,cooldowns,attempts:1,timeoutMs:7500,maxBytes:2_000_000,accept:"text/html"});
      for(const feed of declaredPublisherFeeds(html,source.url)){if(await attemptFeed(feed))break;}
      if(!directOk){
        const entries=parsePublisherIndex(html,source.url);
        if(entries.length){siteOk=true;methods.push("index");gather(entries,"index");}
        else errors.push("Pagina publica sem metadados de artigos datados");
      }
    }catch(error){errors.push("Site: "+sourceErrorKind(error));}
  }
  if(!directOk&&!siteOk){
    try{
      const entries=parseFeed(await sourceText(sourceIndexUrl(source),{fetcher,cooldowns,attempts:1,timeoutMs:8000,maxBytes:2_000_000}));
      googleOk=entries.length>0;methods.push("index");gather(entries,"index");
    }catch(error){errors.push("Indice: "+sourceErrorKind(error));}
  }
  for(const {entry,mode} of accepted){
    const publishedAt=Math.floor(Date.parse(entry.date)/1000);
    if(!Number.isFinite(publishedAt)||publishedAt>now+300){undated++;continue;}
    if(publishedAt<now-30*86400)continue;
    const title=cleanTitle(entry.title,source),classified=classifyText(title,mode==="rss"?entry.text:""),url=canonicalUrl(entry.url);
    if(!classified||!url||title.length<14)continue;
    const id=await hash(source.id+"|"+fold(title)+"|"+new Date(publishedAt*1000).toISOString().slice(0,10));
    const candidate:RadarItem={id,sourceId:source.id,title,url,publishedAt,firstSeen:now,lastSeen:now,mode,...classified,credit:null};
    const prior=items.get(id);if(!prior||mode==="rss")items.set(id,candidate);
  }
  const status:SourceCheck["status"]=directOk?"ok":(siteOk||googleOk)?"indexed":"unavailable";
  const route=directOk?"RSS autenticado pelo dominio da fonte":siteOk?"Indice publico do proprio veiculo com links e datas":googleOk?"Indice Google Noticias (cobertura parcial)":"Nenhum canal de coleta validado";
  return {items:[...items.values()],check:{sourceId:source.id,status,checkedAt:now,lastOkAt:status!=="unavailable"?now:null,found,accepted:items.size,detail:(route+". "+errors.join("; ")).slice(0,500)+(undated?"; itens sem data: "+undated:""),methods:[...new Set(methods)]}};
}

export async function collectAllSources(now: number, fetcher: Fetcher = fetch) {
  const cooldowns:SourceCooldowns=new Map();
  const results: Awaited<ReturnType<typeof collectSource>>[] = [];
  for (let start = 0; start < RADAR_SOURCES.length; start += 5) {
    const batch = await Promise.allSettled(RADAR_SOURCES.slice(start, start + 5).map(source => collectSource(source, now, fetcher,cooldowns)));
    for (let i = 0; i < batch.length; i++) { const result = batch[i]; if (result.status === "fulfilled") results.push(result.value); else results.push({ items: [], check: { sourceId: RADAR_SOURCES[start + i].id, status: "unavailable", checkedAt: now, lastOkAt: null, found: 0, accepted: 0, detail: "Falha na execução do coletor desta fonte.", methods: [] } }); }
  }
  return { items: results.flatMap(result => result.items), checks: results.map(result => result.check) };
}
