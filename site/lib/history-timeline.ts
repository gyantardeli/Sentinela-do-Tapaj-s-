import type { HistoryDay, RegionalHistoryPlace } from "./monitoring";

export type HistoryMetric = "fire" | "air";
export const historyDate = (day: string) => day ? day.slice(8, 10) + "/" + day.slice(5, 7) : "—";

export function historyValue(day: HistoryDay | undefined, metric: HistoryMetric): number | null {
  if (!day) return null;
  const value = metric === "fire" ? day.fireCoverage === "missing" ? null : day.fireCount : day.pmSamples > 0 ? day.pm25 : null;
  return value !== null && Number.isFinite(value) ? value : null;
}
export function historyComplete(day: HistoryDay | undefined, metric: HistoryMetric) {
  return !!day && day.closed !== false && day.expectedHours === 24 && (metric === "fire" ? day.fireCoverage === "full" : day.pmSamples === 24) && historyValue(day, metric) !== null;
}
export function historyDifference(a: HistoryDay | undefined, b: HistoryDay | undefined, metric: HistoryMetric): number | null {
  return historyComplete(a, metric) && historyComplete(b, metric) ? historyValue(b, metric)! - historyValue(a, metric)! : null;
}
export function historyCoverage(day: HistoryDay | undefined, metric: HistoryMetric): string {
  if (historyValue(day, metric) === null) return metric === "fire" ? "Sem arquivo" : "Sem modelo";
  if (metric === "air") return `${day!.pmSamples}/${day!.expectedHours} h de modelo${day!.closed === false || day!.expectedHours < 24 ? " · em curso" : ""}`;
  return day!.fireCoverage === "full" ? "Arquivos completos" : "Arquivos parciais";
}
// One scale for the whole fetched period. Sliding the date never rescales the map.
export function historyScale(region: RegionalHistoryPlace[], metric: HistoryMetric, difference: boolean) {
  const values = region.flatMap(p => {
    const valid = p.daily.filter(d => !difference || historyComplete(d, metric)).map(d => historyValue(d, metric)).filter((n): n is number => n !== null);
    return difference ? valid.length ? [Math.max(...valid) - Math.min(...valid)] : [] : valid;
  });
  return Math.max(1, ...values);
}

export function historyProject(lat: number, lon: number, zoom: number) {
  const size = 256 * 2 ** zoom, phi = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
  return { x: (lon + 180) / 360 * size, y: (1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2 * size };
}
