import { SourceFailure, sourceErrorKind, sourceJson, type SourceFetcher } from "./source-http";
import { AIR_GRID, AIR_MAP_REVISION, airTimes, parseAirGridResponse, type AirGridCell, type AirGridSeries, type AirMapData } from "./air-quality-map";

type ModelChunk = { cells: AirGridSeries[]; missing: string[]; times: number[]; checkedAt: number; detail?: string };
type DataCache = Pick<Cache, "match" | "put">;
function failureDetail(error: unknown) {
  const kind = sourceErrorKind(error);
  const messages: Record<string, string> = {
    limite_de_requisicoes: "A fonte atingiu o limite de consultas; tente novamente mais tarde.",
    acesso_negado: "A fonte recusou a consulta do servidor.",
    tempo_esgotado: "A fonte demorou além do limite de consulta.",
    erro_servidor: "A fonte está temporariamente indisponível.",
    resposta_invalida: "A fonte retornou uma resposta inválida.",
    arquivo_excessivo: "A resposta da fonte excedeu o limite de tamanho.",
  };
  return messages[kind] ?? "Falha de conexão com a fonte CAMS. Tente atualizar a leitura em instantes.";
}
export function gridRequestUrl(cells: readonly AirGridCell[], times: readonly number[]) {
  const hour = (time: number) => new Date(time * 1000).toISOString().slice(0, 13) + ":00";
  return "https://air-quality-api.open-meteo.com/v1/air-quality?" + new URLSearchParams({
    latitude: cells.map(c => c.lat).join(","), longitude: cells.map(c => c.lon).join(","),
    hourly: "pm2_5,us_aqi_pm2_5", domains: "cams_global", timeformat: "unixtime", timezone: "GMT",
    start_hour: hour(times[0]), end_hour: hour(times[times.length - 1]), cell_selection: "nearest",
  });
}
// Cache only public provider data, with canonical keys independent of visitor identity.
// No mutable global promises and no D1 writes in a public read endpoint.
async function cached<T extends { checkedAt: number; detail?: string }>(cache: DataCache | undefined, key: Request, ttl: number, now: number, collect: () => Promise<T>): Promise<T> {
  let previous: T | null = null;
  try { const response = await cache?.match(key); if (response) { const value = await response.json() as T; if (Number.isInteger(value.checkedAt) && value.checkedAt <= now + 300 && now - value.checkedAt < 86400) previous = value; } } catch { /* Provider collection is still available without edge cache. */ }
  if (previous && now - previous.checkedAt < ttl) return previous;
  try {
    const value = await collect();
    try { await cache?.put(key, Response.json(value, { headers: { "Cache-Control": "public, max-age=86400" } })); } catch { /* A cache failure must not discard a provider response. */ }
    return value;
  } catch (error) {
    if (previous) return { ...previous, detail: "A atualização falhou; cópia anterior preservada com seu horário original." };
    throw error;
  }
}
export async function collectAirMap(now: number, options: { fetcher?: SourceFetcher; cache?: DataCache; origin?: string } = {}): Promise<AirMapData> {
  const fetcher = options.fetcher ?? fetch, times = airTimes(now), chunks: AirGridCell[][] = [];
  for (let i = 0; i < AIR_GRID.length; i += 40) chunks.push(AIR_GRID.slice(i, i + 40));
  const origin = options.origin ?? "https://sentinela-tapajos.invalid";
  const model = await Promise.allSettled(chunks.map((chunk, i) => cached<ModelChunk>(options.cache, new Request(`${origin}/__air-cache/${AIR_MAP_REVISION}/grid-${i}`), 3600, now, async () => {
    const response = await sourceJson(gridRequestUrl(chunk, times), { fetcher, attempts: 1, timeoutMs: 10000, maxBytes: 800_000 });
    let parsed: ReturnType<typeof parseAirGridResponse>;
    try { parsed = parseAirGridResponse(response, chunk, times, now); }
    catch { throw new SourceFailure("API_INVALID", "Lote de células inválido na resposta."); }
    if (!parsed.cells.length) throw new SourceFailure("API_INVALID", "Nenhuma célula válida na resposta.");
    return { ...parsed, times, checkedAt: now };
  })));
  for (const [chunk, result] of model.entries()) if (result.status === "rejected") console.error(JSON.stringify({ event: "air_map_collection_failed", chunk, kind: sourceErrorKind(result.reason) }));
  const valid = model.flatMap(r => r.status === "fulfilled" ? [r.value] : []);
  const cells = valid.flatMap(r => r.cells.map(c => ({ ...c,
    pm25: times.map(t => { const i = r.times.indexOf(t); return i < 0 ? null : c.pm25[i] ?? null; }),
    aqiPm25: times.map(t => { const i = r.times.indexOf(t); return i < 0 ? null : c.aqiPm25[i] ?? null; }),
  })));
  const fullModel = cells.length === AIR_GRID.length && valid.every(r => !r.detail && !r.missing.length) && cells.every(c => c.pm25.every(v => v !== null) && c.aqiPm25.every(v => v !== null));
  const failures = [...new Set(model.flatMap(r => r.status === "rejected" ? [failureDetail(r.reason)] : []))];
  return { revision: AIR_MAP_REVISION, now, times, cells,
    model: { state: fullModel ? "ok" : cells.length ? "partial" : "unavailable", checkedAt: now, detail: `${cells.length}/${AIR_GRID.length} células com série disponível. ${failures.join(" ")} ${valid.some(r => r.detail) ? "Há cópia anterior; confira a consulta de cada célula." : cells.length ? "Consulta por recorte; emissão do modelo não informada pela API." : "Sem dados não significa ar limpo."}`.replace(/\s+/g, " ") },
  };
}
