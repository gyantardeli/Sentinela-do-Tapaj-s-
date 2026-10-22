import { PLACES, nearestAir, type AirPoint, type Place, type Weather } from "./environment";
import { sourceJson, sourceErrorKind, type SourceFetcher } from "./source-http";

export const ENVIRONMENT_REVISION = "environment-v1";
export type AirLocation = { placeId: string; points: AirPoint[]; collectedAt?: number };
export type WeatherLocation = { placeId: string; value: Weather; collectedAt?: number };
export type MunicipalFailures = Partial<Record<"air" | "weather", Record<string, string>>>;
export type EnvironmentPacket = { revision: string; collectedAt: number; air: AirLocation[] | null; weather: WeatherLocation[] | null; failures: { air?: string; weather?: string }; municipalityFailures?: MunicipalFailures };
export type EnvironmentPart<T> = { collectedAt: number; locations: T[]; attemptedAt?: number; failures?: Record<string, string> };
export type EnvironmentCache = { air: EnvironmentPart<AirLocation> | null; weather: EnvironmentPart<WeatherLocation> | null };
type Fetcher = SourceFetcher;

export function describeSourceError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const status = message.match(/HTTP\s+(\d{3})/)?.[1];
  if (status === "429") return "Limite temporário de consultas na fonte (HTTP 429).";
  if (status) return `A fonte recusou ou não concluiu a consulta (HTTP ${status}).`;
  if (sourceErrorKind(error) === "arquivo_excessivo") return "A fonte retornou um arquivo acima do limite permitido.";
  if (error instanceof Error && /Timeout|Abort/i.test(error.name)) return "A fonte excedeu o tempo de resposta.";
  if (sourceErrorKind(error) === "resposta_invalida" || error instanceof SyntaxError || /ausente|inválid|incomplet|unidade/.test(message)) return "A fonte retornou dados incompletos ou inválidos.";
  return "Falha de conexão com a fonte.";
}
export function airRequestUrl(places: readonly Place[] = PLACES) {
  return "https://air-quality-api.open-meteo.com/v1/air-quality?" + new URLSearchParams({ latitude: places.map(p => p.lat).join(","), longitude: places.map(p => p.lon).join(","), hourly: "pm2_5,pm10,us_aqi", domains: "cams_global", past_days: "1", forecast_days: "3", timeformat: "unixtime", timezone: "GMT" });
}
export function weatherRequestUrl(places: readonly Place[] = PLACES) {
  return "https://api.open-meteo.com/v1/forecast?" + new URLSearchParams({ latitude: places.map(p => p.lat).join(","), longitude: places.map(p => p.lon).join(","), current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m", wind_speed_unit: "kmh", temperature_unit: "celsius", precipitation_unit: "mm", timeformat: "unixtime", timezone: "GMT", forecast_days: "1" });
}
function responseRows(input: unknown, length: number) { const rows = Array.isArray(input) ? input : [input]; if (rows.length !== length || rows.some(r => !r || typeof r !== "object")) throw new Error("Resposta incompleta."); return rows as Record<string, any>[]; }
const finite = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
export function parseAirResponse(input: unknown, places: readonly Place[] = PLACES): AirLocation[] {
  return responseRows(input, places.length).map((row, index) => {
    const h = row.hourly;
    if (row.error || !h || !Array.isArray(h.time) || h.time.length < 24 || h.time.length > 800 || !Array.isArray(h.pm2_5) || h.pm2_5.length !== h.time.length || !h.time.every((t: unknown, i: number) => typeof t === "number" && Number.isInteger(t) && (!i || t > h.time[i - 1]))) throw new Error("Série de ar inválida.");
    if (row.hourly_units?.pm2_5 !== "μg/m³" && row.hourly_units?.pm2_5 !== "µg/m³") throw new Error("Unidade de partículas inválida.");
    const points = h.time.map((time: number, i: number): AirPoint => ({ time, pm25: finite(h.pm2_5[i], 0, 10000), pm10: finite(h.pm10?.[i], 0, 20000), aqi: finite(h.us_aqi?.[i], 0, 5000) }));
    if (!points.some((p: AirPoint) => p.pm25 != null)) throw new Error("Série de PM2,5 ausente.");
    return { placeId: places[index].id, points };
  });
}
export function parseWeatherResponse(input: unknown, places: readonly Place[] = PLACES): WeatherLocation[] {
  return responseRows(input, places.length).map((row, index) => {
    const c = row.current;
    if (row.error || !c || !Number.isInteger(c.time) || row.current_units?.wind_speed_10m !== "km/h" || row.current_units?.temperature_2m !== "°C") throw new Error("Condição meteorológica ou unidade inválida.");
    const value: Weather = { time: c.time, temperature: finite(c.temperature_2m, -80, 70), humidity: finite(c.relative_humidity_2m, 0, 100), speed: finite(c.wind_speed_10m, 0, 500), direction: finite(c.wind_direction_10m, 0, 360), rain: finite(c.precipitation, 0, 1000) };
    if (value.speed == null || value.direction == null) throw new Error("Vento ausente.");
    return { placeId: places[index].id, value };
  });
}
export function parseMunicipalResponse(input: unknown, kind: "air" | "weather", collectedAt: number, places: readonly Place[] = PLACES) {
  const rows = Array.isArray(input) ? input : [input], failures: Record<string, string> = {};
  if (rows.length !== places.length) throw new Error("Resposta municipal incompleta; ordem dos municípios não confirmada.");
  const air: AirLocation[] = [], weather: WeatherLocation[] = [];
  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    try {
      if (kind === "air") { const location = parseAirResponse(rows[i], [place])[0], current = nearestAir(location.points, collectedAt); if (!current || current.pm25 == null || Math.abs(current.time - collectedAt) > 7200) throw new Error("Série sem referência atual."); air.push(location); }
      else { const location = parseWeatherResponse(rows[i], [place])[0]; if (location.value.time < collectedAt - 7200 || location.value.time > collectedAt + 300) throw new Error("Horário meteorológico inválido."); weather.push(location); }
    } catch (error) { failures[place.id] = describeSourceError(error); }
  }
  return { air, weather, failures };
}
export async function collectEnvironment(collectedAt: number, fetcher: Fetcher = fetch): Promise<EnvironmentPacket> {
  const results = await Promise.allSettled((["air", "weather"] as const).map(async kind => parseMunicipalResponse(await sourceJson(kind === "air" ? airRequestUrl() : weatherRequestUrl(), { fetcher, maxBytes: 2_000_000 }), kind, collectedAt)));
  const packet: EnvironmentPacket = { revision: ENVIRONMENT_REVISION, collectedAt, air: null, weather: null, failures: {}, municipalityFailures: {} };
  for (const [i, kind] of (["air", "weather"] as const).entries()) {
    const result = results[i]; if (result.status === "rejected") { packet.failures[kind] = describeSourceError(result.reason); continue; }
    if (kind === "air") packet.air = result.value.air.length ? result.value.air : null; else packet.weather = result.value.weather.length ? result.value.weather : null;
    if (Object.keys(result.value.failures).length) { packet.municipalityFailures![kind] = result.value.failures; packet.failures[kind] = `${Object.keys(result.value.failures).length}/8 municípios sem leitura válida; os demais foram preservados.`; }
  }
  return packet;
}
export function validateEnvironment(input: unknown, now: number): EnvironmentPacket {
  if (!input || typeof input !== "object") throw new Error("Coleta inválida.");
  const v = input as Record<string, any>;
  if (v.revision !== ENVIRONMENT_REVISION || !Number.isInteger(v.collectedAt) || v.collectedAt < now - 7200 || v.collectedAt > now + 300) throw new Error("Horário da coleta inválido.");
  const municipalityFailures: MunicipalFailures = {};
  for (const kind of ["air", "weather"] as const) {
    const map = v.municipalityFailures?.[kind]; if (!map) continue;
    if (typeof map !== "object" || Array.isArray(map) || Object.keys(map).some(id => !PLACES.some(p => p.id === id) || typeof map[id] !== "string" || !map[id].trim())) throw new Error("Falhas municipais inválidas.");
    municipalityFailures[kind] = Object.fromEntries(Object.entries(map).map(([id, detail]) => [id, String(detail).slice(0, 220)]));
  }
  const knownPlaces = (rows: any, kind: "air" | "weather") => Array.isArray(rows) && rows.length > 0 && rows.length <= PLACES.length && new Set(rows.map(r => r?.placeId)).size === rows.length && rows.every(r => PLACES.some(p => p.id === r?.placeId)) && PLACES.every(p => rows.some(r => r.placeId === p.id) !== !!municipalityFailures[kind]?.[p.id]);
  const safeNumber = (n: unknown, min: number, max: number) => n === null || finite(n, min, max) !== null;
  let air: AirLocation[] | null = null, weather: WeatherLocation[] | null = null;
  if (v.air !== null) {
    if (!knownPlaces(v.air, "air")) throw new Error("Locais de ar inválidos.");
    air = v.air.map((row: any) => {
      if (!Array.isArray(row.points) || row.points.length < 24 || row.points.length > 240) throw new Error("Série inválida.");
      let previous = 0;
      const points = row.points.map((p: any): AirPoint => {
        if (!p || !Number.isInteger(p.time) || p.time <= previous || p.time < v.collectedAt - 3 * 86400 || p.time > v.collectedAt + 7 * 86400 || !safeNumber(p.pm25, 0, 10000) || !safeNumber(p.pm10, 0, 20000) || !safeNumber(p.aqi, 0, 5000)) throw new Error("Ponto inválido.");
        previous = p.time; return { time: p.time, pm25: p.pm25, pm10: p.pm10, aqi: p.aqi };
      });
      const current = nearestAir(points, v.collectedAt);
      if (!current || current.pm25 == null || Math.abs(current.time - v.collectedAt) > 7200) throw new Error("Série sem referência atual.");
      return { placeId: row.placeId, points };
    });
  }
  if (v.weather !== null) {
    if (!knownPlaces(v.weather, "weather")) throw new Error("Locais meteorológicos inválidos.");
    weather = v.weather.map((row: any) => {
      const p = row.value;
      if (!p || !Number.isInteger(p.time) || p.time < v.collectedAt - 7200 || p.time > v.collectedAt + 300 || !safeNumber(p.temperature, -80, 70) || !safeNumber(p.humidity, 0, 100) || finite(p.speed, 0, 500) === null || finite(p.direction, 0, 360) === null || !safeNumber(p.rain, 0, 1000)) throw new Error("Meteorologia inválida.");
      return { placeId: row.placeId, value: { time: p.time, temperature: p.temperature, humidity: p.humidity, speed: p.speed, direction: p.direction, rain: p.rain } };
    });
  }
  const failures: EnvironmentPacket["failures"] = {};
  for (const kind of ["air", "weather"] as const) if (typeof v.failures?.[kind] === "string" && v.failures[kind].trim()) failures[kind] = v.failures[kind].slice(0, 220);
  if (!air && !weather && !failures.air && !failures.weather) throw new Error("Nenhuma fonte ambiental respondeu.");
  return { revision: ENVIRONMENT_REVISION, collectedAt: v.collectedAt, air, weather, failures, ...(Object.keys(municipalityFailures).length ? { municipalityFailures } : {}) };
}
