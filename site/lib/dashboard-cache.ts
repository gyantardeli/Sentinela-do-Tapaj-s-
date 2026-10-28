import type { DashboardData } from "./environment";
export function usefulDashboard(input: unknown, placeId: string, now: number): input is DashboardData {
  if (!input || typeof input !== "object") return false;
  const d = input as DashboardData;
  if (d.place?.id !== placeId || !Number.isInteger(d.fetchedAt) || d.fetchedAt <= 0 || d.fetchedAt > now + 300 || !Array.isArray(d.sources) || !Array.isArray(d.air) || !Array.isArray(d.fires) || !Array.isArray(d.sensors) || !Array.isArray(d.regional)) return false;
  const number = (n: unknown) => typeof n === "number" && Number.isFinite(n);
  return d.air.some(p => p && number(p.pm25)) || !!d.weather && number(d.weather.speed) || d.fires.length > 0 || d.sensors.length > 0 || (d.fireCoverage?.complete === true && d.sources.some(s => s?.id === "inpe" && s.status === "ok"));
}
