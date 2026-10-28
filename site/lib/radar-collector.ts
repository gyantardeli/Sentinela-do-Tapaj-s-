import { RADAR_SOURCES, sourceIndexUrl, type RadarSource } from "./radar-sources";
import { acceptsPublisher, canonicalUrl, classifyText, cleanTitle, fold, parseFeed, type FeedMode, type RadarItem, type SourceCheck } from "./radar-core";
import { sourceText, sourceErrorKind, type SourceCooldowns } from "./source-http";
type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
async function hash(value: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join(""); }
export async function collectSource(source: RadarSource, now: number, fetcher: Fetcher = fetch, cooldowns:SourceCooldowns=new Map()): Promise<{ items: RadarItem[]; check: SourceCheck }> {
  const feeds=[...new Set([...(source.feeds??[]).slice(0,1),new URL("/feed/",source.url).href])];
  const targets: { url: string; mode: FeedMode }[] = [...feeds.map(url=>({url,mode:"rss" as const})), { url: sourceIndexUrl(source), mode: "index" }];
  const items = new Map<string, RadarItem>(); const errors: string[] = [], methods: string[] = [];
  let directOk = false, indexOk = false, indexEntries = 0, found = 0, undated = 0;
  for (const target of targets) {
    if(target.mode==="rss"&&directOk)continue;
    try {
      const content=await sourceText(target.url,{fetcher,cooldowns,attempts:1,timeoutMs:6500,maxBytes:2_000_000}); const entries=parseFeed(content);
      if (target.mode === "rss" && entries.length && !entries.some(entry => acceptsPublisher(entry, source, "rss"))) throw new Error("RSS sem links identificáveis da fonte esperada.");
      if (target.mode === "rss") directOk = true; else { indexOk = true; indexEntries = entries.length; }
      methods.push(target.mode); found += entries.length;
      for (const entry of entries) {
        if (!acceptsPublisher(entry, source, target.mode)) continue;
        const publishedAt = Math.floor(Date.parse(entry.date) / 1000);
        if (!Number.isFinite(publishedAt) || publishedAt > now + 300) { undated++; continue; }
        if (publishedAt < now - 30 * 86400) continue;
        const title = cleanTitle(entry.title, source), classified = classifyText(title, target.mode === "rss" ? entry.text : "");
        const url = canonicalUrl(entry.url);
        if (!classified || !url || title.length < 14) continue;
        const id = await hash(source.id + "|" + fold(title) + "|" + new Date(publishedAt * 1000).toISOString().slice(0, 10));
        const creditMatch = entry.text.match(/\bfonte\s*:\s*([^.;|\n]{4,90})/i)?.[1];
        const credit = creditMatch ? RADAR_SOURCES.find(s => s.id !== source.id && fold(creditMatch).includes(fold(s.name)))?.name ?? null : null;
        const candidate: RadarItem = { id, sourceId: source.id, title, url, publishedAt, firstSeen: now, lastSeen: now, mode: target.mode, ...classified, credit };
        const prior = items.get(id); if (!prior || target.mode === "rss") items.set(id, candidate);
      }
    } catch (error) { errors.push((target.mode === "rss" ? "RSS direto" : "Índice") + ": " + sourceErrorKind(error)+(error instanceof Error&&/HTTP \d{3}/.test(error.message)?" ("+error.message.match(/HTTP \d{3}/)![0]+")":"")); }
  }
  const status: SourceCheck["status"] = directOk ? "ok" : indexOk && indexEntries > 0 ? "indexed" : indexOk ? "empty" : "unavailable";
  let detail = directOk ? "RSS direto consultado; complementado pelo índice quando disponível." : indexOk ? indexEntries > 0 ? "Coleta pelo RSS do Google Notícias segmentado por domínio; a indexação pode ser incompleta." : "Índice acessível, sem itens encontrados. Isso não confirma ausência de notícias nem cobertura completa da fonte." : "Não foi possível consultar o RSS ou o índice nesta execução.";
  if (errors.length) detail += " " + errors.join(" ").slice(0, 150);
  if (undated) detail += ` ${undated} item(ns) ignorados por data ausente ou futura.`;
  return { items: [...items.values()], check: { sourceId: source.id, status, checkedAt: now, lastOkAt: directOk || (indexOk && indexEntries > 0) ? now : null, found, accepted: items.size, detail, methods } };
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
