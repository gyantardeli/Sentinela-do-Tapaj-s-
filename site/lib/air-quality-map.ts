// Regional PM2.5 estimates from CAMS Global.
// https://open-meteo.com/en/docs/air-quality-api
export const AIR_MAP_REVISION = "tapajos-air-v2";
export const AIR_GRID_STEP = 0.4;
export const AIR_BOUNDS = { west: -58.2, east: -53.8, south: -7.8, north: -2.2 } as const;
export const AIR_MODEL_MAX_AGE = 6 * 3600;
export type AirGridCell = { id: string; lat: number; lon: number };
export type AirGridSeries = AirGridCell & { collectedAt: number; pm25: (number | null)[]; aqiPm25: (number | null)[] };
export type AirMapStatus = { state: "ok" | "partial" | "unavailable"; checkedAt: number; detail: string };
export type AirMapData = {
  revision: typeof AIR_MAP_REVISION; now: number; times: number[];
  cells: AirGridSeries[];
  model: AirMapStatus;
};

// The operational rectangle covers the eight existing seats, not the entire Tapajós basin.
export function airGrid(): AirGridCell[] {
  const cells: AirGridCell[] = [];
  for (let row = 0; row < 14; row++) for (let column = 0; column < 11; column++) {
    const lat = Number((-2.4 - row * AIR_GRID_STEP).toFixed(1));
    const lon = Number((-58 + column * AIR_GRID_STEP).toFixed(1));
    cells.push({ id: `${lat.toFixed(1)}:${lon.toFixed(1)}`, lat, lon });
  }
  return cells;
}
export const AIR_GRID = airGrid();
export function airTimes(now: number) {
  const base = Math.floor(now / (3 * 3600)) * 3 * 3600;
  return Array.from({ length: 25 }, (_, index) => base + index * 3 * 3600);
}
export function inAirRegion(point: { lat: number; lon: number }) {
  return Number.isFinite(point.lat) && Number.isFinite(point.lon) && point.lat >= AIR_BOUNDS.south && point.lat <= AIR_BOUNDS.north && point.lon >= AIR_BOUNDS.west && point.lon <= AIR_BOUNDS.east;
}
export function nearestAirCell(point: { lat: number; lon: number }, cells: readonly AirGridCell[] = AIR_GRID) {
  if (!inAirRegion(point)) return null;
  return cells.reduce<AirGridCell | null>((best, cell) => {
    const squared = (p: AirGridCell) => (p.lat - point.lat) ** 2 + (p.lon - point.lon) ** 2;
    return !best || squared(cell) < squared(best) ? cell : best;
  }, null);
}
export function airNumber(value: unknown, maximum = 10000): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum ? value : null;
}
export function gridValue(cell: AirGridSeries | undefined, times: readonly number[], time: number | null, metric: "pm25" | "aqiPm25", now: number): number | null {
  if (!cell || time === null || now - cell.collectedAt > AIR_MODEL_MAX_AGE || cell.collectedAt > now + 300) return null;
  const index = times.indexOf(time);
  return index < 0 ? null : airNumber(cell[metric][index]);
}
export function isForecastFrame(time: number | null, now: number) {
  return time !== null && time > Math.floor(now / (3 * 3600)) * 3 * 3600;
}
export function isObservationFrame(time: number | null, now: number) {
  return time !== null && time === airTimes(now)[0];
}

export function parseAirGridResponse(input: unknown, requested: readonly AirGridCell[], times: readonly number[], collectedAt: number) {
  const rows = Array.isArray(input) ? input : [input];
  if (rows.length !== requested.length) throw new Error("Lote de células incompleto.");
  const cells: AirGridSeries[] = [], missing: string[] = [];
  for (let index = 0; index < rows.length; index++) {
    const cell = requested[index], row = rows[index] as Record<string, unknown> | null;
    const h = row?.hourly as Record<string, unknown> | undefined;
    const units = row?.hourly_units as Record<string, unknown> | undefined;
    if (!row || row.error || typeof row.latitude !== "number" || typeof row.longitude !== "number" || Math.abs(row.latitude - cell.lat) > 0.02 || Math.abs(row.longitude - cell.lon) > 0.02 || !["µg/m³", "μg/m³"].includes(String(units?.pm2_5)) || units?.us_aqi_pm2_5 !== "USAQI" || !Array.isArray(h?.time) || h.time.length > 200 || !Array.isArray(h.pm2_5) || h.pm2_5.length !== h.time.length || !Array.isArray(h.us_aqi_pm2_5) || h.us_aqi_pm2_5.length !== h.time.length || !h.time.every((t: unknown, i: number, list: unknown[]) => typeof t === "number" && Number.isInteger(t) && (!i || t > (list[i - 1] as number)))) {
      missing.push(cell.id); continue;
    }
    const sourceTimes = h.time as number[], pm25 = h.pm2_5, aqi = h.us_aqi_pm2_5;
    const values = times.map(t => { const i = sourceTimes.indexOf(t); return i < 0 ? null : airNumber(pm25[i]); });
    if (!values.some(v => v !== null)) { missing.push(cell.id); continue; }
    cells.push({ ...cell, collectedAt, pm25: values, aqiPm25: times.map(t => { const i = sourceTimes.indexOf(t); return i < 0 ? null : airNumber(aqi[i]); }) });
  }
  return { cells, missing };
}

