import { PLACES, distance, type Place } from "./environment";
import { ACCU_LOCATIONS, CLIMA_LOCATIONS, weatherLinks } from "./weather-providers";
import { sourceText, SourceFailure, type SourceFetcher } from "./source-http";

export type ForecastProvider = "accuweather" | "climaeradar";
export type ForecastPoint = { time: number; temperature: number | null; feelsLike: number | null; rainProbability: number | null; wind: number | null; direction: number | null; humidity: number | null; condition: string | null };
export type ForecastDay = { day: string; min: number | null; max: number | null; rainProbability: number | null };
export type ForecastCapture = {
  provider: ForecastProvider; placeId: string; collectedAt: number; pageTime: number; sourceUrl: string;
  current: ForecastPoint | null; hourly: ForecastPoint[]; daily: ForecastDay[]; radarImage: string | null;
};
export type ForecastLocation = { placeId: string; state: "ok" | "partial" | "unavailable" | "stale"; attemptedAt: number; detail: string; capture: ForecastCapture | null };
export type ForecastMapData = { now: number; provider: ForecastProvider; locations: ForecastLocation[]; nextRefreshAt: number; method: "public-pages-v1"; error?: string };
export const FORECAST_PROVIDER_NAMES: Record<ForecastProvider, string> = { accuweather: "AccuWeather", climaeradar: "Clima & Radar" };
export const FORECAST_TTL = 900, FORECAST_MAX_AGE = 7200;
const dayAt = (time: number) => new Date((time - 10800) * 1000).toISOString().slice(0, 10);
const normal = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
function finite(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
function timeOf(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const time = Date.parse(value) / 1000;
  return Number.isInteger(time) ? time : null;
}
export function decodeWeatherHtml(text: string) {
  return text.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n: string) => { const code = n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n); return code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : ""; })
    .replace(/&(amp|quot|apos|lt|gt|nbsp|deg);/g, (_, key: string) => ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", deg: "°" })[key]!);
}
const textOnly = (html: string) => decodeWeatherHtml(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
function attribute(tag: string, name: string) { return decodeWeatherHtml(tag.match(new RegExp(`(?:^|\\s)${name}=["']([^"']*)["']`, "i"))?.[1] ?? ""); }
function classHas(attrs: string, name: string) { return attribute(attrs, "class").split(/\s+/).includes(name); }
function blocks(html: string, tag: string, name: string) {
  const result: { attrs: string; body: string }[] = [];
  for (const m of html.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}\\s*>`, "gi"))) if (classHas(m[1], name)) result.push({ attrs: m[1], body: m[2] });
  return result;
}
// Read one element with balanced tags. Nested divs must not truncate the current card.
function classBody(html: string, tag: string, name: string): string {
  const tags = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi"); let start = -1, depth = 0;
  for (const m of html.matchAll(tags)) {
    const closing = m[0].startsWith("</");
    if (start < 0) { if (!closing && classHas(m[0].slice(tag.length + 1), name)) { start = m.index! + m[0].length; depth = 1; } }
    else { depth += closing ? -1 : 1; if (!depth) return html.slice(start, m.index); }
  }
  return "";
}
function oneClassText(html: string, tag: string, name: string) { return textOnly(classBody(html, tag, name)); }
function firstNumber(text: string) { return Number(text.match(/-?\d+(?:[.,]\d+)?/)?.[0].replace(",", ".") ?? NaN); }
function celsius(n: number, unit: string) { return finite(unit === "F" ? (n - 32) * 5 / 9 : n, -80, 70); }
function probability(text: string) { const m = text.match(/(\d+(?:[.,]\d+)?)\s*%/); return m ? finite(m[1].replace(",", "."), 0, 100) : null; }
function ensurePlace(name: string, lat: unknown, lon: unknown, place: Place) {
  const latitude = finite(lat, -90, 90), longitude = finite(lon, -180, 180);
  if (!normal(name).startsWith(normal(place.name)) || latitude === null || longitude === null || distance(place, { lat: latitude, lon: longitude }) > 40) throw new Error("A fonte retornou outro município ou coordenadas incompatíveis.");
}
function checkPageTime(time: number | null, collectedAt: number): asserts time is number {
  if (time === null || time < collectedAt - FORECAST_MAX_AGE || time > collectedAt + 300) throw new Error("A página não apresentou uma referência recente e verificável.");
}
function sortedHours(points: ForecastPoint[], now: number) {
  return [...new Map(points.filter(p => p.time >= now - 3600 && p.time <= now + 48 * 3600 && (p.temperature !== null || p.rainProbability !== null)).map(p => [p.time, p])).values()].sort((a, b) => a.time - b.time).slice(0, 49);
}
export function safeAccuRadar(value: string, placeId: string): string | null {
  try { const u = new URL(value); return u.protocol === "https:" && u.hostname === "static-maps.accuweather.com" && !u.username && !u.password && !u.port && u.pathname === "/v1/radar/latest" && u.searchParams.get("locationKey") === ACCU_LOCATIONS[placeId] && [...u.searchParams.keys()].every(k => ["level", "theme", "size", "locationKey", "mode"].includes(k)) ? u.href : null; } catch { return null; }
}
export function parseAccuWeatherPage(html: string, place: Place, collectedAt: number): ForecastCapture {
  if (html.length > 2_000_000) throw new SourceFailure("OVERSIZE", "Página acima do limite.");
  const schemas = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m => attribute(m[1], "type") === "application/ld+json").flatMap(m => { try { return [JSON.parse(decodeWeatherHtml(m[2]))]; } catch { return []; } });
  const location = schemas.find(s => s?.["@type"] === "Place");
  ensurePlace(location?.name ?? "", location?.geo?.latitude, location?.geo?.longitude, place);
  if (location?.address?.addressRegion && normal(location.address.addressRegion) !== "para") throw new Error("Estado da fonte incompatível.");
  const card = blocks(html, "a", "cur-con-weather-card")[0]?.body ?? "";
  const unit = oneClassText(card, "span", "after-temp");
  if (unit !== "C" && unit !== "F") throw new Error("Unidade de temperatura ausente na página.");
  const pageDay = html.match(/"fdate"\s*:\s*"(\d{8})"/)?.[1];
  const date = pageDay ? `${pageDay.slice(0,4)}-${pageDay.slice(4,6)}-${pageDay.slice(6)}` : "";
  const clock = oneClassText(card, "p", "cur-con-weather-card__subtitle");
  const pageTime = timeOf(`${date}T${/^\d{1,2}:\d{2}$/.test(clock) ? clock.padStart(5, "0") : "invalid"}:00-03:00`);
  checkPageTime(pageTime, collectedAt);
  const current: ForecastPoint = { time: pageTime, temperature: celsius(firstNumber(oneClassText(card, "div", "temp")), unit), feelsLike: celsius(firstNumber(oneClassText(card, "div", "real-feel")), unit), rainProbability: null, wind: null, direction: null, humidity: null, condition: oneClassText(card, "span", "phrase").slice(0, 100) || null };
  for (const m of card.matchAll(/<div\b([^>]*)>/gi)) {
    if (!classHas(m[1], "detail")) continue;
    const part = classBody(card.slice(m.index), "div", "detail"), label = oneClassText(part, "span", "label"), value = oneClassText(part, "span", "value");
    if (label === "Vento") { const n = firstNumber(value); current.wind = finite(/(?:mi\/h|mph)/i.test(value) ? n * 1.609344 : /km\/h/.test(value) ? n : NaN, 0, 500); }
    if (/^(?:Humidade|Umidade)$/.test(label)) current.humidity = probability(value);
  }
  const hourly = sortedHours(blocks(html, "a", "hourly-list__list__item").flatMap(({ attrs, body }) => {
    const href = attribute(attrs, "href");
    const time = Number(href.match(/[?&]hour=(\d{10})(?:&|$)/)?.[1]);
    if (!Number.isInteger(time)) return [];
    return [{ time, temperature: celsius(firstNumber(oneClassText(body, "span", "hourly-list__list__item-temp")), unit), rainProbability: probability(textOnly(classBody(body, "div", "hourly-list__list__item-precip"))), feelsLike: null, wind: null, direction: null, humidity: null, condition: null }];
  }), collectedAt);
  const daily: ForecastDay[] = blocks(html, "a", "daily-list-item").flatMap(({ body }) => {
    const dateText = textOnly(classBody(body, "div", "date")).match(/(\d{1,2})\/(\d{1,2})/);
    if (!dateText) return [];
    const candidates = [Number(date.slice(0, 4)) - 1, Number(date.slice(0, 4)), Number(date.slice(0, 4)) + 1].map(y => `${y}-${dateText[2].padStart(2,"0")}-${dateText[1].padStart(2,"0")}`);
    const day = candidates.find(d => { const t = Date.parse(d + "T00:00:00-03:00") / 1000; return d >= dayAt(collectedAt) && t < collectedAt + 15 * 86400; });
    return day ? [{ day, min: celsius(firstNumber(oneClassText(body, "span", "temp-lo")), unit), max: celsius(firstNumber(oneClassText(body, "span", "temp-hi")), unit), rainProbability: probability(textOnly(classBody(body, "div", "precip"))) }] : [];
  });
  if (current.temperature === null || !hourly.length || !daily.length) throw new Error("Previsão pública incompleta ou formato alterado.");
  const image = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => safeAccuRadar(attribute(m[0], "data-src") || attribute(m[0], "src"), place.id)).find(Boolean) ?? null;
  return { provider: "accuweather", placeId: place.id, collectedAt, pageTime, sourceUrl: weatherLinks(place).accu, current, hourly, daily: [...new Map(daily.map(d => [d.day, d])).values()].sort((a,b) => a.day.localeCompare(b.day)).slice(0, 7), radarImage: image };
}

function climaPoint(row: any): ForecastPoint | null {
  const time = timeOf(row?.date); if (time === null) return null;
  const prob = finite(row.precipitation?.probability, 0, 1), humidity = finite(row.humidity, 0, 1);
  return { time, temperature: finite(row.air_temperature?.celsius, -80, 70), feelsLike: finite(row.apparent_temperature?.celsius, -80, 70), rainProbability: prob === null ? null : Math.round(prob * 1000) / 10, wind: finite(row.wind?.speed?.kilometer_per_hour?.value, 0, 500), direction: finite(row.wind?.direction, 0, 360), humidity: humidity === null ? null : Math.round(humidity * 1000) / 10, condition: ({ sunny: "Ensolarado", cloudy: "Nublado", partly_cloudy: "Parcialmente nublado", rain: "Chuva", thunderstorm: "Trovoada", clear: "Céu limpo" } as Record<string,string>)[row.weather_condition_image] ?? null };
}
export function parseClimaRadarPage(html: string, place: Place, collectedAt: number): ForecastCapture {
  if (html.length > 2_000_000) throw new SourceFailure("OVERSIZE", "Página acima do limite.");
  const script = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].find(m => attribute(m[1], "id") === "serverApp-state" && attribute(m[1], "type") === "application/json");
  if (!script) throw new Error("Dados públicos do Clima & Radar ausentes ou formato alterado.");
  const state = JSON.parse(script[2]);
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new Error("Página inválida.");
  // Read only the JSON already shipped in the public page. Never reuse its API URLs or app credentials.
  const values: any[] = Object.values(state);
  const geo = values.filter(Array.isArray).flat().find(v => v?.geoObject?.geoObjectKey === CLIMA_LOCATIONS[place.id])?.geoObject;
  ensurePlace(geo?.locationName ?? "", geo?.latitude, geo?.longitude, place);
  if (geo?.["iso-3166-2"] !== "BR-PA") throw new Error("Estado da fonte incompatível.");
  const forecasts = values.filter(v => v && typeof v === "object" && Array.isArray(v.hours) && v.current?.date);
  if (forecasts.length !== 1) throw new Error("Previsão da sede não identificada de forma única.");
  const forecast = forecasts[0], current = climaPoint(forecast.current), pageTime = current?.time ?? null;
  checkPageTime(pageTime, collectedAt);
  const hourly = sortedHours(forecast.hours.map(climaPoint).filter((p: ForecastPoint | null): p is ForecastPoint => p !== null), collectedAt);
  const dailySources = values.filter(v => v && typeof v === "object" && Array.isArray(v.days) && v.days.some((d: any) => d?.air_temperature?.max?.celsius !== undefined));
  if (dailySources.length !== 1) throw new Error("Série diária ambígua ou ausente.");
  const daily: ForecastDay[] = dailySources[0].days.flatMap((d: any) => {
    const t = timeOf(d.date), probability = finite(d.precipitation?.probability, 0, 1);
    if (t === null || dayAt(t) < dayAt(collectedAt) || t > collectedAt + 8 * 86400) return [];
    return [{ day: dayAt(t), min: finite(d.air_temperature?.min?.celsius, -80, 70), max: finite(d.air_temperature?.max?.celsius, -80, 70), rainProbability: probability === null ? null : Math.round(probability * 1000) / 10 }];
  }).slice(0, 7);
  if (current?.temperature === null || !hourly.length || !daily.length) throw new Error("Previsão pública incompleta.");
  return { provider: "climaeradar", placeId: place.id, collectedAt, pageTime, sourceUrl: weatherLinks(place).clima, current, hourly, daily, radarImage: null };
}

function failureDetail(error: unknown) {
  const e = error as { code?: string | number; name?: string; message?: string };
  if (e.code === 401 || e.code === 403) return "A fonte recusou a captura pública. Consulte o fornecedor diretamente.";
  if (e.code === 429) return "Limite de consultas da fonte; nova tentativa após o intervalo de espera.";
  if (/Timeout|Abort/.test(e.name ?? "")) return "A fonte excedeu o tempo de resposta.";
  if (typeof e.code === "number") return `Falha de consulta na fonte (HTTP ${e.code}).`;
  if (e.code === "OVERSIZE") return "A página ultrapassou o limite de tamanho da captura.";
  if (e.name === "SyntaxError") return "A fonte retornou dados públicos em formato inválido.";
  return e.message?.slice(0, 180) || "Não foi possível capturar a previsão.";
}
export function createForecastCollector(fetcher: SourceFetcher = fetch) {
  const rows = new Map<string, ForecastLocation>(), flights = new Map<string, Promise<ForecastLocation>>();
  async function location(provider: ForecastProvider, place: Place, now: number): Promise<ForecastLocation> {
    const key = `${provider}:${place.id}`, previous = rows.get(key);
    const interval = previous?.state === "ok" ? FORECAST_TTL : 60;
    if (previous && now - previous.attemptedAt < interval) return previous;
    if (flights.has(key)) return flights.get(key)!;
    const task = (async () => {
      let row: ForecastLocation;
      try {
        const links = weatherLinks(place), url = provider === "accuweather" ? links.accu : links.clima;
        const html = await sourceText(url, { fetcher, attempts: 1, timeoutMs: 9500, maxBytes: 2_000_000, accept: "text/html" });
        const capture = provider === "accuweather" ? parseAccuWeatherPage(html, place, now) : parseClimaRadarPage(html, place, now);
        row = { placeId: place.id, state: "ok", attemptedAt: now, detail: "Dados capturados na página pública; horários exibidos pelo fornecedor preservados.", capture };
      } catch (error) {
        const preserved = previous?.capture ?? null;
        row = { placeId: place.id, state: preserved ? now - Math.min(preserved.collectedAt, preserved.pageTime) > FORECAST_MAX_AGE ? "stale" : "partial" : "unavailable", attemptedAt: now, detail: failureDetail(error) + (preserved ? " Cópia anterior preservada com o horário original." : ""), capture: preserved };
      }
      rows.set(key, row); return row;
    })();
    flights.set(key, task);
    try { return await task; } finally { flights.delete(key); }
  }
  return async function collect(provider: ForecastProvider, now: number): Promise<ForecastMapData> {
    const locations = await Promise.all(PLACES.map(p => location(provider, p, now)));
    // Old snapshots may remain visible in tables, but never appear as current points on the map.
    const normalized = locations.map(row => row.capture && now - Math.min(row.capture.collectedAt, row.capture.pageTime) > FORECAST_MAX_AGE ? { ...row, state: "stale" as const } : row);
    return { now, provider, locations: normalized, nextRefreshAt: Math.min(...locations.map(r => r.attemptedAt + (r.state === "ok" ? FORECAST_TTL : 60))), method: "public-pages-v1" };
  };
}
export const collectForecastMap = createForecastCollector();
export function forecastStale(row: ForecastLocation | undefined, now: number) {
  return row?.state === "stale" || !!row?.capture && now - Math.min(row.capture.pageTime, row.capture.collectedAt) > FORECAST_MAX_AGE;
}
export function forecastPoint(row: ForecastLocation | undefined, time: number | null, now?: number): ForecastPoint | null {
  if (!row?.capture || row.state === "stale" || now !== undefined && forecastStale(row, now)) return null;
  if (time === null) return row.capture.current;
  return row.capture.hourly.find(p => p.time === time) ?? null;
}
