import { RADAR_LOCALITIES, RADAR_SOURCES, type RadarSource } from "./radar-sources";
export type FeedMode = "rss" | "index";
export type RadarItem = { id: string; sourceId: string; title: string; url: string; publishedAt: number; firstSeen: number; lastSeen: number; mode: FeedMode; places: string[]; regions: string[]; topic: string; tags: string[]; credit: string | null };
export type SourceCheck = { sourceId: string; status: "ok" | "indexed" | "empty" | "unavailable"; checkedAt: number; lastOkAt: number | null; found: number; accepted: number; detail: string; methods: string[] };
export type RadarRun = { id: string; startedAt: number; completedAt: number; checked: number; available: number; accepted: number; status: string };
export type RadarData = { items: RadarItem[]; sources: SourceCheck[]; run: RadarRun | null; schedule: { id: string; enabled: boolean; cadence: string; timezone: string } | null; storageReady: boolean; error?: string; now: number };
export type FeedEntry = { title: string; url: string; date: string; text: string; sourceUrl: string | null };
export function fold(text: string) { return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function decodeText(text: string) { return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(0x10ffff, parseInt(n, 16)))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(0x10ffff, Number(n)))).replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, x) => (ENTITIES[x] ?? x)); }
function plain(text: string) { return decodeText(decodeText(text).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }
export function parseFeed(xml: string): FeedEntry[] {
  if (xml.length > 2_000_000 || !/<(?:rss|feed)\b/i.test(xml)) throw new Error("Resposta não é um RSS/Atom válido.");
  const blocks = Array.from(xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi), m => m[2]).slice(0, 120);
  const tag = (text: string, name: string) => text.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">", "i"))?.[1] ?? "";
  return blocks.map(block => ({
    title: plain(tag(block, "title")), url: decodeText(tag(block, "link").trim() || block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1] || ""),
    date: plain(tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || tag(block, "dc:date")),
    text: plain(tag(block, "description") || tag(block, "summary")).slice(0, 700), sourceUrl: block.match(/<source\b[^>]*url=["']([^"']+)["']/i)?.[1] ?? null,
  }));
}
export function isFireText(text: string) {
  const s = fold(text);
  return /\b(incendios?|queimadas?|fumaca|focos? de calor|focos? de fogo|combate ao fogo|pegou fogo|pega fogo|em chamas|incendiar|incendiada|incendiado)\b/.test(s);
}
export function classifyText(title: string, body = "") {
  const combined = title + " " + body.slice(0, 500), s = fold(combined), t = fold(title);
  if (!isFireText(combined)) return null;
  const foreignAmbiguity = /\b(portugal|portuguesa?|distrito de santarem)\b/.test(s) && !/pará/i.test(combined) && !/\b(tapajos|fordlandia|oeste do para|baixo amazonas)\b/.test(s);
  const places = RADAR_LOCALITIES.filter(p => !(foreignAmbiguity && (p.id === "aveiro" || p.id === "santarem")) && p.aliases.some(a => (" " + s + " ").includes(" " + fold(a) + " "))).map(p => p.id);
  const regions: string[] = [];
  if (/pará/i.test(combined) || /\b(no para|do para|estado do para|paraense|paraenses)\b/.test(s)) regions.push("Pará");
  if (/\b(tapajos|baixo amazonas|oeste do para|sudoeste do para|flona do jamanxim|floresta nacional do jamanxim|flona do tapajos)\b/.test(s)) regions.push("Tapajós / oeste do Pará");
  if (/\b(amazonia|amazonica|amazonico|amazonia legal)\b/.test(s)) regions.push("Amazônia");
  if (!places.length && !regions.length) return null;
  const tags: string[] = [];
  if (/\b(br 163|br 230|transamazonica|rodovia|estrada|balsa|porto|aeroporto|aerodromo|visibilidade|transito)\b/.test(s)) tags.push("Transporte / acesso");
  if (/\b(saude|respirator\w*|pneumonia|qualidade do ar|insalubre|poluicao|hospital|fumaca)\b/.test(s)) tags.push("Saúde / fumaça");
  if (/\b(aldeia|indigena|indigenas|comunidade|comunidades|moradores|residencias|casas|desabrigados)\b/.test(s)) tags.push("Comunidades");
  if (/\b(brigadistas?|bombeiros|prevfogo|combate|resgate|brigadas?)\b/.test(s)) tags.push("Resposta ao fogo");
  if (/\b(interditad[ao]s?|bloquead[ao]s?|evacuacao|evacuad[ao]s?|suspensao de voos|voos suspensos|vitimas?|feridos?|mortos?|desabrigados)\b/.test(t)) tags.push("Impacto explícito no título");
  let topic = isFireText(title) ? "Incêndio / ocorrência" : "Monitoramento / contexto";
  if (/\b(prevencao|preventiv\w*|conscientiz\w*|campanha|capacit\w*|inscri\w*|processo seletivo|contratacao|orienta\w*|selecion\w*|recrut\w*|vagas?)\b/.test(t)) topic = "Prevenção / preparação";
  else if (/\b(previsao|risco|estiagem|seca|el nino|monitoramento|focos de calor|balanco|reduz\w*|queda|aument\w*|registra)\b/.test(t) && !/\b(atinge|destroi|queima|chamas|pegou fogo|pega fogo)\b/.test(t)) topic = "Monitoramento / contexto";
  else if (/\b(qualidade do ar|fumaca|insalubre|poluicao)\b/.test(t) && !/\b(incendio|chamas|queimada)\b/.test(t)) topic = "Fumaça / qualidade do ar";
  if (!places.length && topic === "Incêndio / ocorrência") topic = "Monitoramento / contexto";
  return { places, regions: [...new Set(regions)], tags, topic };
}
export function cleanTitle(title: string, source: RadarSource) {
  let text = title.replace(/\s+/g, " ").trim();
  const split = text.lastIndexOf(" - ");
  if (split >= 0) { const tail = fold(text.slice(split + 3)), name = fold(source.name); if (tail && (name.includes(tail) || tail.includes(name) || (source.id === "g1" && tail === "g1") || tail === "www gov br" || tail === "governo federal")) text = text.slice(0, split); }
  return text.slice(0, 240);
}
export function priority(item: RadarItem, axis: string, now: number) {
  let score = 0; const reasons: string[] = [];
  const local = RADAR_LOCALITIES.filter(p => item.places.includes(p.id));
  const exact = axis !== "all" && local.some(p => p.axis === axis || p.id === axis);
  if (exact) { score += 35; reasons.push("Menciona o local selecionado"); }
  else if (local.length) { score += 20; reasons.push("Menciona município ou distrito monitorado"); }
  else { score += item.regions.includes("Tapajós / oeste do Pará") ? 12 : 6; reasons.push("Contexto regional, sem local exato"); }
  const age = (now - item.publishedAt) / 3600;
  if (age <= 24) { score += 20; reasons.push("Publicado nas últimas 24 h"); }
  else if (age <= 72) { score += 12; reasons.push("Publicado nas últimas 72 h"); }
  else if (age <= 168) score += 6;
  score += item.topic === "Incêndio / ocorrência" ? 15 : item.topic === "Fumaça / qualidade do ar" ? 12 : 5;
  if (item.tags.includes("Impacto explícito no título")) { score += 20; reasons.push("Título menciona consequência ou restrição"); }
  else if (item.tags.includes("Transporte / acesso") || item.tags.includes("Saúde / fumaça") || item.tags.includes("Comunidades")) { score += 8; reasons.push("Menciona acesso, saúde ou comunidades"); }
  const source = RADAR_SOURCES.find(s => s.id === item.sourceId);
  if (source?.category === "official") { score += 10; reasons.push("Publicação de canal oficial"); }
  else score += source?.category === "local" ? 5 : 3;
  score = Math.min(100, score);
  return { score, label: score >= 75 ? "Alta" : score >= 50 ? "Média" : "Contexto", reasons, exact };
}
function tokens(title: string) { const stop = new Set("de da do das dos em no na nos nas para por com um uma e o a os as ao apos video veja fotos assista pa".split(" ")); return new Set(fold(title).split(" ").filter(x => x.length > 2 && !stop.has(x))); }
export type RadarGroup = { id: string; lead: RadarItem; members: RadarItem[]; publishers: number; score: number; label: string; reasons: string[] };
export function groupArticles(items: RadarItem[], axis: string, now: number): RadarGroup[] {
  const sorted = [...items].sort((a, b) => priority(b, axis, now).score - priority(a, axis, now).score || b.publishedAt - a.publishedAt);
  const groups: RadarGroup[] = [];
  for (const item of sorted) {
    const set = tokens(item.title);
    const group = groups.find(g => {
      if (Math.abs(g.lead.publishedAt - item.publishedAt) > 72 * 3600) return false;
      if (fold(g.lead.title) === fold(item.title)) return true;
      if (!item.places.some(p => g.lead.places.includes(p)) || set.size < 6) return false;
      const other = tokens(g.lead.title); if (other.size < 6) return false;
      const intersection = [...set].filter(t => other.has(t)).length;
      return intersection / (set.size + other.size - intersection) >= .76;
    });
    if (group) { group.members.push(item); group.publishers = new Set(group.members.map(m => m.sourceId)).size; }
    else { const ranked = priority(item, axis, now); groups.push({ id: item.id, lead: item, members: [item], publishers: 1, ...ranked }); }
  }
  return groups;
}
export function canonicalUrl(raw: string) {
  try { const url = new URL(raw); if (url.protocol !== "https:" && url.protocol !== "http:") return null; if (url.username || url.password) return null; for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid|trk)/.test(key)) url.searchParams.delete(key); url.hash = ""; return url.toString(); } catch { return null; }
}
export function acceptsPublisher(entry: FeedEntry, source: RadarSource, mode: FeedMode) {
  try { const [wanted,...path] = source.domain.split("/"), raw = mode === "index" ? entry.sourceUrl : entry.url; if (!raw) return false; const url = new URL(raw), host = url.hostname.replace(/^www\./, ""); const hostMatches = host === wanted || host.endsWith("." + wanted); const pathMatches = wanted === "gov.br" && path.length ? url.pathname.startsWith("/" + path[0] + "/") : true; return hostMatches && pathMatches; } catch { return false; }
}
