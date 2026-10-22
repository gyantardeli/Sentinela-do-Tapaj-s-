import { RADAR_SOURCES, RADAR_LOCALITIES } from "./radar-sources";
import { canonicalUrl, acceptsPublisher, type RadarItem, type SourceCheck } from "./radar-core";
export const RADAR_REVISION = "radar-tapajos-v5";
export function validateCollection(input: unknown, now: number) {
  if (!input || typeof input !== "object") throw new Error("Coleta inválida.");
  const value = input as Record<string, any>;
  if (![RADAR_REVISION, "radar-tapajos-v4", "radar-tapajos-v3", "radar-tapajos-v2"].includes(value.revision) || typeof value.runId !== "string" || !/^[0-9a-f-]{36}$/i.test(value.runId)) throw new Error("Revisão ou identificador inválido.");
  const startedAt = value.collectedAt;
  if (!Number.isInteger(startedAt) || startedAt > now + 300 || startedAt < now - 7200) throw new Error("Horário da coleta inválido.");
  if (!Array.isArray(value.checks) || value.checks.length !== 20 || !Array.isArray(value.items) || value.items.length > 1500) throw new Error("Conjunto de fontes inválido.");
  if (new Set(value.checks.map((s: any) => s.sourceId)).size !== 20 || value.checks.some((s: any) => !RADAR_SOURCES.some(source => source.id === s.sourceId))) throw new Error("Fontes não reconhecidas.");
  const localities = new Set(RADAR_LOCALITIES.map(p => p.id));
  const topics = new Set(["Incêndio / ocorrência", "Fumaça / qualidade do ar", "Prevenção / preparação", "Monitoramento / contexto"]);
  const allowedTags = new Set(["Transporte / acesso", "Saúde / fumaça", "Comunidades", "Resposta ao fogo", "Impacto explícito no título"]);
  const allowedRegions = new Set(["Pará", "Tapajós / oeste do Pará", "Amazônia"]);
  const unique = new Map<string, RadarItem>();
  for (const raw of value.items) {
    const source = RADAR_SOURCES.find(s => s.id === raw.sourceId), url = typeof raw.url === "string" ? canonicalUrl(raw.url) : null;
    if (!source || !url || typeof raw.id !== "string" || !/^[a-f0-9]{64}$/.test(raw.id) || typeof raw.title !== "string" || raw.title.length < 14 || raw.title.length > 240) throw new Error("Publicação inválida.");
    if (raw.mode !== "rss" && raw.mode !== "index") throw new Error("Modo de coleta inválido.");
    if (raw.mode === "index" ? !(new URL(url).hostname === "news.google.com" || acceptsPublisher({ title: raw.title, url, date: "", text: "", sourceUrl: null }, source, "rss")) : !acceptsPublisher({ title: raw.title, url, date: "", text: "", sourceUrl: null }, source, "rss")) throw new Error("Link incompatível com a fonte.");
    if (!Number.isInteger(raw.publishedAt) || raw.publishedAt > now + 300 || raw.publishedAt < now - 30 * 86400) throw new Error("Data da publicação inválida.");
    if (!Array.isArray(raw.places) || raw.places.some((p: string) => !localities.has(p)) || !Array.isArray(raw.regions) || raw.regions.some((r: string) => !allowedRegions.has(r)) || (!raw.places.length && !raw.regions.length) || !topics.has(raw.topic)) throw new Error("Classificação inválida.");
    if (!Array.isArray(raw.tags) || raw.tags.some((t: string) => !allowedTags.has(t))) throw new Error("Etiquetas inválidas.");
    unique.set(raw.id, { id: raw.id, sourceId: source.id, title: raw.title, url, publishedAt: raw.publishedAt, firstSeen: startedAt, lastSeen: startedAt, mode: raw.mode, places: [...new Set(raw.places)] as string[], regions: [...new Set(raw.regions)] as string[], topic: raw.topic, tags: [...new Set(raw.tags)] as string[], credit: typeof raw.credit === "string" && RADAR_SOURCES.some(s => s.name === raw.credit) ? raw.credit : null });
  }
  const items = [...unique.values()];
  const checks: SourceCheck[] = value.checks.map((raw: Record<string, any>) => {
    if (!["ok", "indexed", "empty", "unavailable"].includes(raw.status) || !Number.isInteger(raw.found) || raw.found < 0 || raw.found > 1000) throw new Error("Situação de fonte inválida.");
    return { sourceId: raw.sourceId, status: raw.status, checkedAt: startedAt, lastOkAt: raw.status === "ok" || raw.status === "indexed" ? startedAt : null, found: raw.found, accepted: items.filter(i => i.sourceId === raw.sourceId).length, detail: typeof raw.detail === "string" ? raw.detail.slice(0, 500) : "", methods: Array.isArray(raw.methods) ? raw.methods.filter((m: string) => m === "rss" || m === "index") : [] };
  });
  return { result: { items, checks }, startedAt, runId: value.runId };
}
