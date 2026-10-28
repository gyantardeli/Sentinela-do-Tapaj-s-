import { PLACES, aqBand, display, stamp, type Sensor } from "./environment";
import { AIR_GRID, AIR_GRID_STEP, gridValue, type AirMapData } from "./air-quality-map";
import { forecastPoint, forecastStale, type ForecastLocation, type ForecastMapData } from "./weather-capture";

export type MapView = "detections" | "windy" | "air" | "forecast";
export type MapMarker = { id: string; lat: number; lon: number; label: string; detail: string; color: string; kind: "sensor" | "weather" | "city" };
export type MapCell = { id: string; lat: number; lon: number; color: string; value: number | null; detail: string };
export type ForecastMetric = "temperature" | "rainProbability" | "wind";
export type ForecastFrame = { horizon: "current" | "hourly" | "daily"; time: number | null; day: string | null; now: number };
export const FORECAST_UNITS: Record<ForecastMetric, string> = { temperature: "°C", rainProbability: "%", wind: "km/h" };
export function forecastValue(row: ForecastLocation | undefined, frame: ForecastFrame, metric: ForecastMetric): number | null {
  if (!row?.capture || forecastStale(row, frame.now)) return null;
  if (frame.horizon === "daily") {
    const d = row.capture.daily.find(d => d.day === frame.day);
    return metric === "temperature" ? d?.max ?? null : metric === "rainProbability" ? d?.rainProbability ?? null : null;
  }
  if (frame.horizon === "hourly" && frame.time === null) return null;
  return forecastPoint(row, frame.horizon === "current" ? null : frame.time, frame.now)?.[metric] ?? null;
}
export function forecastColor(value: number | null, metric: ForecastMetric) {
  if (value === null) return "#74837b";
  if (metric === "rainProbability") return value >= 75 ? "#245eac" : value >= 50 ? "#348ead" : value >= 25 ? "#439489" : "#70906e";
  if (metric === "wind") return value >= 40 ? "#80529c" : value >= 25 ? "#3769a1" : value >= 10 ? "#418b85" : "#70906e";
  return value >= 36 ? "#c0643e" : value >= 31 ? "#aa8439" : value >= 26 ? "#648a4e" : "#397e9c";
}
export function forecastMarkers(data: ForecastMapData | null, frame: ForecastFrame, metric: ForecastMetric): MapMarker[] {
  return PLACES.map(p => {
    const row = data?.locations.find(r => r.placeId === p.id), value = forecastValue(row, frame, metric);
    return { ...p, kind: "weather", color: forecastColor(value, metric), label: `${p.name} · ${display(value, metric === "wind" ? 1 : 0)} ${FORECAST_UNITS[metric]}`, detail: `${value === null ? "Sem dado válido. " : ""}${row?.state !== "ok" ? row?.detail ?? "Aguardando consulta. " : ""}Captura: ${stamp(row?.capture?.collectedAt, true)} · UTC−3` };
  });
}
export function airCells(data: AirMapData | null, time: number | null, now: number): MapCell[] {
  const rows = new Map(data?.cells.map(c => [c.id, c]) ?? []);
  return AIR_GRID.map(c => {
    const row = rows.get(c.id), value = gridValue(row, data?.times ?? [], time, "pm25", now), aqi = gridValue(row, data?.times ?? [], time, "aqiPm25", now);
    return { ...c, value, color: value === null || aqi === null ? "#87968d" : aqBand(aqi).color, detail: `CAMS · PM2,5 ${display(value)} µg/m³ · AQI EUA de PM2,5 ${display(aqi, 0)} · ${stamp(time, true)} · consulta ${stamp(row?.collectedAt, true)}` };
  });
}
export function cellGeoJSON(cells: MapCell[]) {
  const h = AIR_GRID_STEP / 2;
  return { type: "FeatureCollection" as const, features: cells.map(c => ({ type: "Feature" as const, properties: { id: c.id, color: c.color, detail: c.detail }, geometry: { type: "Polygon" as const, coordinates: [[[c.lon-h,c.lat-h],[c.lon+h,c.lat-h],[c.lon+h,c.lat+h],[c.lon-h,c.lat+h],[c.lon-h,c.lat-h]]] } })) };
}
export function sensorMarkers(sensors: Sensor[], now: number): MapMarker[] {
  return sensors.map(s => ({ ...s, kind: "sensor", color: s.kind === "model" ? "#8163a3" : "#1683a0", label: s.name, detail: `${s.kind === "model" ? "Modelo registrado" : "Leitura local"} · PM2,5 ${display(s.pm25)} µg/m³ · ${stamp(s.time, true)}${now - s.time > 7200 ? " · leitura anterior" : ""}` }));
}
export function routeFromHash(hash: string): { tab: "map" | "overview" | "collection"; view: MapView } {
  if (["#visao-geral", "#overview"].includes(hash)) return { tab: "overview", view: "detections" };
  if (["#coleta", "#saude-das-fontes", "#fontes"].includes(hash)) return { tab: "collection", view: "detections" };
  return { tab: "map", view: hash === "#qualidade-do-ar" ? "air" : hash === "#previsao" ? "forecast" : hash === "#windy" ? "windy" : "detections" };
}
