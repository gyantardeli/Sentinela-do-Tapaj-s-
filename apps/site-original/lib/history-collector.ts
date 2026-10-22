import { PLACES, deduplicateFires, distance, type Fire } from "./environment";
import { sourceText, sourceJson } from "./source-http";
import { parseInpeCsv } from "./fire-collector";
import { airRequestUrl, parseAirResponse, type AirLocation } from "./environment-provider";
import { HISTORY_REVISION, RADII, localDay, utcDay, type FireArchivePacket } from "./monitoring";

export const INPE_DAILY = "https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil/";
export function summarizeFireDay(fires: Fire[], dayUtc: string, collectedAt: number): FireArchivePacket {
  const start = Date.parse(dayUtc + "T00:00:00Z") / 1000;
  const unique = deduplicateFires(fires.filter(f => f.time >= start && f.time < start + 86400 && f.time <= collectedAt + 300));
  const days = [localDay(start), localDay(start + 12 * 3600)];
  const parts = days.flatMap(day => PLACES.flatMap(place => RADII.map(radius => {
    const counts: Record<string, number> = { all: 0 };
    for (const f of unique) if (localDay(f.time) === day && distance(place, f) <= radius) { counts.all++; counts[f.satellite] = (counts[f.satellite] ?? 0) + 1; }
    return { day, placeId: place.id, radius, counts };
  })));
  return { revision: HISTORY_REVISION, kind: "fire-day", collectedAt, dayUtc, closed: dayUtc < utcDay(collectedAt), last: unique.length ? Math.max(...unique.map(f => f.time)) : null, parts };
}
export async function collectFireDay(dayUtc: string, collectedAt: number, fetcher: typeof fetch = fetch) {
  const parsed=parseInpeCsv(await sourceText(INPE_DAILY+"focos_diario_br_"+dayUtc.replaceAll("-","")+".csv",{fetcher,timeoutMs:25000,maxBytes:20*1024*1024}),collectedAt);
  if(parsed.rejected)throw new Error("CSV diário contém registros inválidos; histórico anterior preservado: "+dayUtc);
  return summarizeFireDay(parsed.fires,dayUtc,collectedAt);
}
export async function collectAirArchive(collectedAt: number, fetcher: typeof fetch = fetch): Promise<{ revision: string; kind: "air"; collectedAt: number; locations: AirLocation[] }> {
  const url = new URL(airRequestUrl()); url.searchParams.set("past_days", "31"); url.searchParams.set("forecast_days", "1");
  const locations = parseAirResponse(await sourceJson(url.toString(),{fetcher,timeoutMs:45000,maxBytes:2_000_000})).map(l => ({ ...l, points: l.points.filter(p => p.time <= collectedAt && p.time >= collectedAt - 32 * 86400) }));
  return { revision: HISTORY_REVISION, kind: "air", collectedAt, locations };
}
