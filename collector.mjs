import { createHash } from 'node:crypto';
import { MUNICIPIOS, SOURCES } from './registry.mjs';

export const nowISO = () => new Date().toISOString();
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const NORMALIZE = (s='') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export const normalizar = NORMALIZE;
const sign = (str) => createHash('sha256').update(str).digest('hex').slice(0,24);
const MAX_DOWNLOAD = 20 * 1024 * 1024;
const USER_AGENT = 'SentinelaTapajos/2.0 (coleta publica; contato configuravel)';

export class HttpFailure extends Error {
  constructor(code, message, retryAfter=null){super(message);this.code=code;this.retryAfter=retryAfter;}
}

// Uma única função de transporte com timeout, tamanho máximo e recuos curtos.
// HTTP 429 não é refeito imediatamente, respeitando limitação da fonte.
export async function getText(url, { fetchFn=globalThis.fetch, timeout=8500, maxBytes=MAX_DOWNLOAD, attempts=2 } = {}) {
  let lastErr;
  for(let attempt=0;attempt<attempts;attempt++){
    try {
      const response = await fetchFn(url, {
        signal:AbortSignal.timeout(timeout),
        headers:{'User-Agent':USER_AGENT,'Accept':'text/csv, application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/html;q=0.7,*/*;q=0.3'}
      });
      if(!response.ok){
        const ra=response.headers?.get?.('retry-after');
        const secs = ra && /^\d+$/.test(ra) ? Math.min(Number(ra),3600) : null;
        throw new HttpFailure(response.status,`HTTP ${response.status}`,secs);
      }
      const declared=Number(response.headers?.get?.('content-length')||0);
      if(declared>maxBytes) throw new HttpFailure('OVERSIZE','Arquivo excede limite');
      // ArrayBuffer evita carregar corpos grandes sem aviso e valida limite real.
      let chunks=[], bytes=0;
      if(response.body?.getReader){
        const reader=response.body.getReader();
        try {
          while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes){await reader.cancel();throw new HttpFailure('OVERSIZE','Arquivo excede limite');}chunks.push(value);}
        } finally {reader.releaseLock?.();}
        const data=new Uint8Array(bytes);let pos=0;for(const chunk of chunks){data.set(chunk,pos);pos+=chunk.byteLength;}
        return new TextDecoder().decode(data);
      }
      const text=await response.text();
      if(Buffer.byteLength(text)>maxBytes)throw new HttpFailure('OVERSIZE','Arquivo excede limite');
      return text;
    } catch(err){
      lastErr=err;
      if(err.code===429 || err.code==='OVERSIZE' || (typeof err.code==='number' && err.code>=400 && err.code<500))break;
      if(attempt+1<attempts)await wait(400*(attempt+1));
    }
  }
  throw lastErr;
}

export function classifyError(err) {
  if(err?.code===429)return 'limite_de_requisicoes';
  if(err?.code===401 || err?.code===403)return 'acesso_negado';
  if(err?.code===404)return 'endereco_invalido';
  if(err?.code==='OVERSIZE')return 'arquivo_excessivo';
  if(typeof err?.code==='number' && err.code>=500)return 'erro_servidor';
  if(err?.name==='TimeoutError'||err?.name==='AbortError')return 'tempo_esgotado';
  if(err?.code==='XML_INVALID'||err?.code==='CSV_INVALID'||err?.code==='API_INVALID')return 'resposta_invalida';
  return 'falha_de_rede_ou_formato';
}

export function csvRows(text){
  const rows=[]; let row=[], cell='', quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;continue;}
    if(c===','&&!quoted){row.push(cell);cell='';continue;}
    if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';continue;
    }
    cell+=c;
  }
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  return rows;
}
export function haversine(lat1,lon1,lat2,lon2) {
  const toRad=x=>x*Math.PI/180, dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export function parseINPE(text, {now=Date.now(),municipios=MUNICIPIOS,radiusKm=200,hours=48}={}){
  const rows=csvRows(text.replace(/^\uFEFF/,''));
  if(rows.length===0)throw new HttpFailure('CSV_INVALID','CSV INPE vazio');
  const header=rows.shift().map(x=>NORMALIZE(x));
  const pick=(...names)=>names.map(x=>header.indexOf(x)).find(i=>i>=0)??-1;
  const iLat=pick('lat','latitude'),iLon=pick('lon','longitude'),iTime=pick('data_hora_gmt','datahora','data_hora','datahora_gmt'),iSat=pick('satelite','satellite');
  if([iLat,iLon,iTime,iSat].some(i=>i<0))throw new HttpFailure('CSV_INVALID',`Colunas INPE ausentes: ${header.join(',')}`);
  const out=[];
  for(const row of rows){
    const lat=Number((row[iLat]??'').trim()),lon=Number((row[iLon]??'').trim());
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
    let t=(row[iTime]??'').trim().replace(' ','T');
    if(!/[zZ]$|[+-]\d\d:\d\d$/.test(t))t+='Z'; // o campo é GMT/UTC
    const timestamp=Date.parse(t);
    if(!Number.isFinite(timestamp)||timestamp>now+300000 || now-timestamp>hours*3600000)continue;
    const satelite=String(row[iSat]??'').trim();
    if(!satelite)continue;
    const dist=Math.min(...municipios.map(m=>haversine(lat,lon,m.lat,m.lon)));
    if(dist>radiusKm)continue;
    out.push({lat,lon,data_hora_gmt:new Date(timestamp).toISOString(),satelite,origem:'INPE / Programa Queimadas'});
  }
  return out;
}

const dd=(date)=>date.toISOString().slice(0,10).replaceAll('-','');
export async function collectINPE({fetchFn=globalThis.fetch,now=Date.now(),municipios=MUNICIPIOS}={}){
  const dates=[0,1].map(offset=>dd(new Date(now-offset*86400000)));
  const good=[],errors=[], all=[];
  for(const date of dates){
    const url=`https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil/focos_diario_br_${date}.csv`;
    try {
      const text=await getText(url,{fetchFn,timeout:25000});
      const focos=parseINPE(text,{now,municipios,radiusKm:200,hours:24});
      good.push({date,url,linhas:focos.length});all.push(...focos);
    } catch(err){errors.push({date,tipo:classifyError(err),detalhe:String(err.message).slice(0,100)});}
  }
  if(!good.length)throw new HttpFailure('API_INVALID',`INPE indisponível: ${errors.map(x=>x.tipo).join(', ')}`);
  const uniq=new Map();for(const f of all)uniq.set(`${f.lat}|${f.lon}|${f.data_hora_gmt}|${f.satelite}`,f);
  const list=[...uniq.values()].sort((a,b)=>b.data_hora_gmt.localeCompare(a.data_hora_gmt));
  return {origem:'INPE CSV oficial',consultaEm:new Date(now).toISOString(),janelaHoras:24,focos:list,arquivos:good,errosParciais:errors,parcial:errors.length>0};
}

/**
 * Em coleta parcial, preserva apenas detecções previamente confirmadas ainda
 * dentro da janela de 24h. A contagem continua explicitamente INCOMPLETA.
 * Uma coleta completa substitui o cache, inclusive quando o resultado é zero.
 */
export function mergeINPEOnPartial(previous, fresh, now=Date.now()) {
  if (!fresh?.parcial || !Array.isArray(fresh.focos) || !Array.isArray(previous?.focos)) {
    return {...fresh, recuperadosCache:0};
  }
  const minTime=now-24*3600000;
  const valid=f=>{
    const t=Date.parse(f?.data_hora_gmt??'');
    return Number.isFinite(t) && t>=minTime && t<=now+300000 &&
      typeof f.lat==='number' && Number.isFinite(f.lat) && Math.abs(f.lat)<=90 &&
      typeof f.lon==='number' && Number.isFinite(f.lon) && Math.abs(f.lon)<=180 &&
      typeof f.satelite==='string' && f.satelite.length>0;
  };
  const key=f=>[f.lat,f.lon,f.data_hora_gmt,f.satelite].join('|');
  const results=new Map();
  for(const focus of fresh.focos)if(valid(focus))results.set(key(focus),focus);
  let recovered=0;
  for(const focus of previous.focos){
    if(!valid(focus)||results.has(key(focus)))continue;
    results.set(key(focus),focus);recovered++;
  }
  return {...fresh,focos:[...results.values()].sort((a,b)=>b.data_hora_gmt.localeCompare(a.data_hora_gmt)),
    recuperadosCache:recovered};
}

function validCurrent(c, names){
  if(!c||!c.time||!names.some(n=>typeof c[n]==='number'&&Number.isFinite(c[n])))throw new HttpFailure('API_INVALID','Sem leitura numérica e horário de referência');
  return c;
}
const stamp=(x)=> {let s=String(x||'');if(!s)return null;if(!/[zZ]$|[+-]\d\d:\d\d$/.test(s))s+='Z';let ms=Date.parse(s);return Number.isFinite(ms)?new Date(ms).toISOString():null;};
export function parseOpenMeteo(json,kind,municipios=MUNICIPIOS){
  const payload=Array.isArray(json)?json:[json];
  if(payload.length!==municipios.length)throw new HttpFailure('API_INVALID',`Quantidade de municípios inesperada: ${payload.length}`);
  return municipios.map((m,i)=>{
    const src=payload[i];if(src?.error)throw new HttpFailure('API_INVALID',`Resposta API com erro: ${src.reason||''}`);
    const c=validCurrent(src?.current,kind==='ar'?['pm2_5','pm10','us_aqi']:['wind_speed_10m','temperature_2m','precipitation']);
    const data={municipio:m.nome,lat:m.lat,lon:m.lon,modelo:true,observadoEm:stamp(c.time)};
    if(!data.observadoEm)throw new HttpFailure('API_INVALID','Horário inválido');
    if(kind==='ar'){
      data.pm25=c.pm2_5??null;data.pm10=c.pm10??null;data.aqiEUA=c.us_aqi??null;
      data.serie=(src.hourly?.time||[]).map((t,k)=>({horario:stamp(t),pm25:src.hourly?.pm2_5?.[k]??null,aqiEUA:src.hourly?.us_aqi?.[k]??null})).filter(x=>x.horario);
      data.origem='CAMS via Open-Meteo (modelo)';
    }else{
      data.ventoKmh=c.wind_speed_10m??null;data.ventoDeGraus=c.wind_direction_10m??null;
      data.temperaturaC=c.temperature_2m??null;data.umidadePct=c.relative_humidity_2m??null;data.precipitacaoMm=c.precipitation??null;
      data.origem='Open-Meteo previsão (modelo)';
    }
    return [m.id,data];
  });
}
// Uma falha municipal não invalida os outros sete resultados do mesmo lote.
// O formato individual do provedor é validado antes de entrar no cache.
export function parseOpenMeteoPartial(json,kind,municipios=MUNICIPIOS){
  const payload=Array.isArray(json)?json:[json],dados={},erros={};
  for(let i=0;i<municipios.length;i++){
    const m=municipios[i];
    try{
      if(!payload[i])throw new HttpFailure('API_INVALID','Município sem resposta');
      const [[id,value]]=parseOpenMeteo([payload[i]],kind,[m]);
      dados[id]=value;
    }catch(err){erros[m.id]=classifyError(err);}
  }
  if(Object.keys(dados).length===0)throw new HttpFailure('API_INVALID','Nenhum município com dado válido');
  return {dados,erros};
}

export async function collectMeteo(kind,{fetchFn=globalThis.fetch,municipios=MUNICIPIOS}={}){
  const base=kind==='ar'?'https://air-quality-api.open-meteo.com/v1/air-quality':'https://api.open-meteo.com/v1/forecast';
  const params=new URLSearchParams({
    latitude:municipios.map(x=>x.lat).join(','),longitude:municipios.map(x=>x.lon).join(','),
    timezone:'GMT',current:kind==='ar'?'pm2_5,pm10,us_aqi':'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m',
    ...(kind==='ar'?{hourly:'pm2_5,us_aqi',past_days:'1',forecast_days:'2'}:{wind_speed_unit:'kmh'})
  });
  const txt=await getText(`${base}?${params}`,{fetchFn,timeout:14000,maxBytes:2_000_000});
  let data;try{data=JSON.parse(txt);}catch{throw new HttpFailure('API_INVALID','Resposta não JSON');}
  return parseOpenMeteoPartial(data,kind,municipios);
}

const xmlDec=(str)=>String(str??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&(?:amp|lt|gt|quot|apos|#(\d+)|#x([0-9a-f]+));/gi,(m,dec,hex)=>{
  if(dec||hex){const cp=parseInt(dec||hex,hex?16:10);return cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):m;}
  return {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[m.toLowerCase()]||m;
}).replace(/<[^>]*>/g,'').trim();
const elem=(block,tag)=>{const m=block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));return m?xmlDec(m[1]):'';};
const atomLink=(s)=>s.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)/i)?.[1] || s.match(/<link\b[^>]*href=["']([^"']+)/i)?.[1];
export function parseFeed(xml){
  if(!/<\?xml|<rss\b|<feed\b|<rdf:RDF\b/i.test(xml) || !/<(?:item|entry|channel|feed)\b/i.test(xml))throw new HttpFailure('XML_INVALID','Não é um RSS/Atom reconhecível');
  const blocks=[...(xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi)||[]),...(xml.match(/<entry\b[^>]*>[\s\S]*?<\/entry>/gi)||[])];
  return blocks.map(b=>({title:elem(b,'title'),link:elem(b,'link')||atomLink(b)||'',date:elem(b,'pubDate')||elem(b,'published')||elem(b,'updated')||'',source:elem(b,'source'),sourceUrl:b.match(/<source\b[^>]*url=[\"']([^\"']+)/i)?.[1]||''}));
}
const scanFeeds=(html,base)=>{
  const found=[];
  for(const match of html.matchAll(/<link\b[^>]*>/gi)){
    const el=match[0];if(!/(?:rss\+xml|atom\+xml)/i.test(el))continue;
    const href=el.match(/\bhref=["']([^"']+)/i)?.[1];if(!href)continue;
    try{const u=new URL(href,base);if(u.protocol==='https:' && u.hostname===new URL(base).hostname)found.push(u.href);}catch{}
  }
  return [...new Set(found)].slice(0,3);
};
const SITE_WORDS=/queimad|inc[eê]ndios? florestais?|inc[eê]ndio na (?:mata|floresta|vegeta)|focos? de calor|fuma[cç]a|qualidade do ar|brigadist|prevfogo|fogo em vegeta|combate a inc[eê]ndios florestais|seca e fogo|desmatamento e fogo/i;
// Não se deve classificar todo incêndio no estado do Pará como notícia local.
// Somente municípios, eixos ou expressões geográficas que identifiquem o oeste do Pará.
const LOCAL_WORDS=/itaituba|miritituba|jacareacanga|cururu|novo progresso|moraes almeida|castelo dos sonhos|rur[oó]polis|\bplacas\b|aveiro|fordl[aâ]ndia|trair[aã]o|santar[eé]m|rio tapaj[oó]s|bacia do tapaj[oó]s|regi[aã]o do tapaj[oó]s|oeste do par[aá]|sudoeste do par[aá]/i;
const LOCAL_PRIORITY=/itaituba|miritituba|jacareacanga|cururu|novo progresso|moraes almeida|castelo dos sonhos|rur[oó]polis|\bplacas\b|aveiro|fordl[aâ]ndia|trair[aã]o|santar[eé]m/i;
export function validArticle(a, now=Date.now()){
  const title=String(a.title||'').replace(/\s+/g,' ').trim();
  if(title.length<22||title.length>300||!SITE_WORDS.test(title)||!LOCAL_WORDS.test(title))return null;
  if(/^(fuma[cç]a|inc[eê]ndio|queimadas?)\s*[—-]\s*not[ií]cias de /i.test(title))return null;
  let date=Date.parse(a.date||'');
  if(!Number.isFinite(date)||date>now+300000||now-date>30*86400000)return null;
  let u;try{u=new URL(a.link);if(u.protocol!=='https:'&&u.protocol!=='http:')return null;}catch{return null;}
  const loc=title.match(LOCAL_WORDS)?.[0]||'Contexto regional';
  const high=LOCAL_PRIORITY.test(loc);
  return {id:sign(`${u.href}|${new Date(date).toISOString()}`),titulo:title,link:u.href,publicadoEm:new Date(date).toISOString(),local:loc,prioridade:high?'municipio':'contexto_regional'};
}
function hostMatches(srcHost,host){
  const a=String(srcHost).replace(/^www\./,'').toLowerCase(),b=String(host).replace(/^www\./,'').toLowerCase();
  return a===b || a.endsWith('.'+b) || b.endsWith('.'+a);
}
function googleFeedURL(source){
  const q=`site:${source.dominio} (queimada OR incendio OR fumaça OR brigadistas) when:30d`;
  return `https://news.google.com/rss/search?${new URLSearchParams({q,hl:'pt-BR',gl:'BR',ceid:'BR:pt-419'})}`;
}
export async function collectSource(source,{fetchFn=globalThis.fetch,now=Date.now(),previous={}}={}){
  const query=async url=>parseFeed(await getText(url,{fetchFn,timeout:8500,maxBytes:2_500_000}));
  const failures=[];let items=null,mode=null,provider=null;
  let tried=[];
  try{
    const html=await getText(source.url,{fetchFn,timeout:6500,maxBytes:1_000_000,attempts:1});
    tried=scanFeeds(html,source.url);
  }catch(err){failures.push(`Página de descoberta: ${classifyError(err)}`);}
  // Fallback WordPress é tentado mesmo se os RSS descobertos estiverem quebrados.
  // O endpoint /feed/ só conta como RSS após resposta XML válida.
  try{
    const wp=new URL('/feed/',source.url).href;
    if(!tried.includes(wp))tried.push(wp);
  }catch{}
  for(const url of tried){
    try{items=await query(url);mode='rss_direto';provider=url;break;}
    catch(err){failures.push(`RSS: ${classifyError(err)}`);}
  }
  if(!items){
    try {items=await query(googleFeedURL(source));mode='indice_parcial';provider='https://news.google.com/';}
    catch(err){
      const status=classifyError(err);
      return {id:source.id,nome:source.nome,url:source.url,status:'erro',tipoErro:status,motivos:[...failures,`Índice: ${status}`],atualizadoEm:new Date(now).toISOString(),retentarEm:err.retryAfter?new Date(now+err.retryAfter*1000).toISOString():null,artigos:[]};
    }
  }
  let invalidSource=0;
  const accepted=[];
  for(const a of items){
    if(mode==='indice_parcial'){
      // Indice Google nao confirma identidade do veiculo apenas pelo site: da busca.
      // So aceitar itens cujo <source url="..."> aponta para o dominio esperado.
      const srcUrl=(a.sourceUrl||'');
      if(!srcUrl){invalidSource++;continue;}
      try {if(!hostMatches(new URL(srcUrl).hostname,source.dominio)){invalidSource++;continue;}}
      catch{invalidSource++;continue;}
    }
    const n=validArticle(a,now);if(n)accepted.push({...n,fonteId:source.id,fonte:source.nome,modoColeta:mode});
  }
  const status=accepted.length?(mode==='rss_direto'?'ok_rss':'parcial_indice'):(mode==='rss_direto'?'rss_sem_resultados':'indice_sem_resultados');
  return {id:source.id,nome:source.nome,url:source.url,status,modo:mode,provedor:provider,totalIndice:items.length,descartadosOrigem:invalidSource,totalAceitos:accepted.length,motivos:failures,atualizadoEm:new Date(now).toISOString(),artigos:accepted};
}

async function pool(arr, limit, fn){
  const out=new Array(arr.length),workers=Array.from({length:Math.min(limit,arr.length)},async (_,worker)=>{
    for(let i=worker;i<arr.length;i+=Math.min(limit,arr.length))out[i]=await fn(arr[i],i);
  });await Promise.all(workers);return out;
}

const staleMs={ar:3*3600000,tempo:3*3600000,inpe:3*3600000};
export function layer(oldLayer, fresh,err,kind,now=Date.now()) {
  const prior=oldLayer||{dados:null};
  if(err){
    return {...prior,estado:prior.dados?'cache_anterior':'erro',tipoErro:classifyError(err),mensagem:err.message||String(err),ultimaTentativa:new Date(now).toISOString(),origemRecuperada:false};
  }
  return {dados:fresh,estado:'atual',tipoErro:null,mensagem:null,ultimaTentativa:new Date(now).toISOString(),ultimaAtualizacao:new Date(now).toISOString(),origemRecuperada:true};
}
export function markStale(l,now=Date.now(),kind='tempo'){
  if(!l?.dados)return {...l,estado:l?.estado||'sem_dados'};
  const last=Date.parse(l.ultimaAtualizacao||'');
  if(Number.isFinite(last)&&now-last>staleMs[kind])return {...l,estado:'defasado',defasado:true,usandoCache:l.estado==='cache_anterior'};
  return l;
}
export const emptyState = () => ({versao:2,ultimaExecucao:null,camadas:{},fontes:{},noticias:[],execucoes:[]});
export async function collectAll(state,{fetchFn=globalThis.fetch,now=Date.now(),municipios=MUNICIPIOS,sources=SOURCES,newsConcurrency=4}={}){
  const base=structuredClone(state||emptyState()),started=new Date(now).toISOString();
  // Uma execução com carimbo antigo nunca substitui um estado mais recente.
  if(base.ultimaExecucao && Date.parse(base.ultimaExecucao)>now)return base;
  const tasks=[
    ['ar',()=>collectMeteo('ar',{fetchFn,municipios})],
    ['tempo',()=>collectMeteo('tempo',{fetchFn,municipios})],
    ['inpe',()=>collectINPE({fetchFn,now,municipios})]
  ];
  await Promise.all(tasks.map(async ([kind,fn])=>{
    try{
      const fresh=await fn();
      if(kind==='inpe'){
        const merged=mergeINPEOnPartial(base.camadas[kind]?.dados,fresh,now);
        const result=layer(base.camadas[kind],merged,null,kind,now);
        result.estado=fresh.parcial?'parcial':'atual';
        base.camadas[kind]=result;
      }else{
        const last=base.camadas[kind]?.dados||{};
        const merged={...last},failures={...fresh.erros};
        for(const [city,value] of Object.entries(fresh.dados)){
          const previous=merged[city];
          if(previous && Date.parse(previous.observadoEm)>Date.parse(value.observadoEm)){
            failures[city]='resposta_antiga';continue;
          }
          merged[city]=value;
        }
        const result=layer(base.camadas[kind],merged,null,kind,now);
        result.estado=Object.keys(failures).length?'parcial':'atual';
        result.falhasMunicipais=failures;
        result.municipiosAtualizados=Object.keys(fresh.dados).length-Object.values(failures).filter(x=>x==='resposta_antiga').length;
        base.camadas[kind]=result;
      }
    }catch(err){base.camadas[kind]=layer(base.camadas[kind],null,err,kind,now);}
  }));
  const responses=await pool(sources,newsConcurrency,async src=>{
    const old=base.fontes[src.id];
    if(old?.retentarEm && now<Date.parse(old.retentarEm))return {...old,artigos:[],puladoPorBackoff:true};
    try{return await collectSource(src,{fetchFn,now,previous:old});}
    catch(err){return {id:src.id,nome:src.nome,url:src.url,status:'erro',tipoErro:classifyError(err),atualizadoEm:started,motivos:[String(err.message)],artigos:[]};}
  });
  const allNew=[];
  for(const res of responses){if(!res)continue;const {artigos=[],...status}=res;base.fontes[res.id]=status;allNew.push(...artigos);}
  const cutoff=now-30*86400000, byId=new Map();
  for(const a of base.noticias||[])if(Date.parse(a.publicadoEm)>=cutoff && validArticle({title:a.titulo,link:a.link,date:a.publicadoEm},now))byId.set(a.id,a);
  for(const a of allNew)byId.set(a.id,a);
  base.noticias=[...byId.values()].sort((a,b)=>b.publicadoEm.localeCompare(a.publicadoEm)).slice(0,1000);
  base.ultimaExecucao=started;
  const statuses=Object.values(base.fontes);
  const summary={data:started,fontesTotal:sources.length,fontesRSS:statuses.filter(s=>s.status==='ok_rss'||s.status==='rss_sem_resultados').length,fontesIndice:statuses.filter(s=>s.status==='parcial_indice'||s.status==='indice_sem_resultados').length,fontesErro:statuses.filter(s=>s.status==='erro').length,camadas:Object.fromEntries(Object.entries(base.camadas).map(([k,v])=>[k,v.estado]))};
  base.execucoes=[summary,...(base.execucoes||[])].slice(0,200);
  return base;
}
