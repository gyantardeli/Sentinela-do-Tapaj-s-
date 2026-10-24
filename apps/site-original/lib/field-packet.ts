import { areaDescription, filterAreaFires, type InterestArea } from "./areas";
import { filterFires, filterSatellite, nearestAir, type AirPoint, type DashboardData, type Fire, type Place, type SourceState, type Weather } from "./environment";
import { bulletinView, type Bulletin } from "./bulletin";
import type { RadarData } from "./radar-core";

export const FIELD_KEY = "sentinela-field-v1";
export const FIELD_SYNC_KEY = "sentinela-field-autosync-v1";
export const FIELD_MAX_BYTES = 10_000_000;
export type FieldPacket = {
  schema: "sentinela-field-v1"; capturedAt: number; savedAt: number; autoSync: boolean;
  place: Place; radius: number; hours: number; satellite: string; area: InterestArea | null; scopeLabel: string;
  fires: Fire[]; air: AirPoint | null; weather: Weather | null; sources: Pick<SourceState, "id" | "name" | "status" | "dataTime">[];
  news: { title: string; url: string; source: string; publishedAt: number; copies: number }[];
  newsCollectedAt: number | null; missing: string[];
};
// Copy only display fields. Session identifiers, service tokens and raw API payloads never enter a packet.
export function createFieldPacket(dashboard: DashboardData, radius: number, hours: number, satellite: string, area: InterestArea | null, radar: RadarData | null, autoSync = true, now = Math.floor(Date.now() / 1000)): FieldPacket {
  if (![25, 50, 100, 200].includes(radius) || ![6, 12, 24].includes(hours) || !Number.isInteger(dashboard.fetchedAt) || dashboard.fetchedAt > now + 300) throw new Error("Consulta inválida para o pacote de campo.");
  const capturedAt = dashboard.fetchedAt;
  const fires = filterSatellite(area ? filterAreaFires(dashboard.fires, area, hours, capturedAt) : filterFires(dashboard.fires, dashboard.place, radius, hours, capturedAt), satellite)
    .filter(f => f.time <= capturedAt && Number.isFinite(f.lat) && Number.isFinite(f.lon))
    .map(f => ({ id: f.id, lat: f.lat, lon: f.lon, time: f.time, satellite: f.satellite, frp: f.frp, source: f.source, municipality: f.municipality ?? null }));
  const bulletin: Bulletin = { revision: "bulletin-v1", capturedAt, scope: "local", placeId: dashboard.place.id, radius, hours, satellite, area, dashboard, radar, regional: null, history: null, health: null, missing: [] };
  const view = bulletinView(bulletin), air = nearestAir(dashboard.air, capturedAt), w = dashboard.weather;
  const inpe = dashboard.sources.find(s => s.id === "inpe");
  const packet: FieldPacket = {
    schema: "sentinela-field-v1", capturedAt, savedAt: now, autoSync,
    place: { id: dashboard.place.id, name: dashboard.place.name, lat: dashboard.place.lat, lon: dashboard.place.lon }, radius, hours, satellite,
    area: area ? { id: area.id, name: area.name, kind: area.kind, points: area.points.map(p => ({ lat: p.lat, lon: p.lon })), radiusKm: area.radiusKm, updatedAt: area.updatedAt } : null,
    scopeLabel: area ? `${area.name} · ${areaDescription(area)}` : `${dashboard.place.name} · raio ${radius} km`,
    fires, air: air && !dashboard.sources.find(s=>s.id==="air")?.stale && Math.abs(air.time - capturedAt) <= 7200 ? { time: air.time, pm25: air.pm25, pm10: air.pm10, aqi: air.aqi } : null,
    weather: w && !dashboard.sources.find(s=>s.id==="weather")?.stale && Math.abs(w.time - capturedAt) <= 7200 ? { time: w.time, temperature: w.temperature, humidity: w.humidity, speed: w.speed, direction: w.direction, rain: w.rain } : null,
    sources: dashboard.sources.map(s => ({ id: s.id, name: s.name, status: s.status, dataTime: s.dataTime })),
    news: view.news.map(g => ({ title: g.lead.title, url: g.lead.url, source: view.sourceName(g.lead.sourceId), publishedAt: g.lead.publishedAt, copies: g.members.length })),
    newsCollectedAt: radar?.run?.completedAt ?? null,
    missing: [...(!inpe || inpe.status === "unavailable" ? ["detecções INPE"] : []), ...(!radar ? ["notícias"] : [])],
  };
  if (!validFieldPacket(packet) || new TextEncoder().encode(JSON.stringify(packet)).length > FIELD_MAX_BYTES) throw new Error("O pacote excede o limite ou contém dados inválidos.");
  return packet;
}
export function validFieldPacket(value: unknown): value is FieldPacket {
  if (!value || typeof value !== "object") return false;
  const p = value as FieldPacket;
  return p.schema === "sentinela-field-v1" && Number.isInteger(p.capturedAt) && p.capturedAt > 0 && p.capturedAt <= Date.now() / 1000 + 300 && Number.isInteger(p.savedAt) && p.savedAt >= p.capturedAt && typeof p.autoSync === "boolean" &&
    !!p.place && typeof p.place.name === "string" && Number.isFinite(p.place.lat) && Math.abs(p.place.lat) <= 90 && Number.isFinite(p.place.lon) && Math.abs(p.place.lon) <= 180 &&
    [25,50,100,200].includes(p.radius) && [6,12,24].includes(p.hours) && typeof p.satellite === "string" && typeof p.scopeLabel === "string" &&
    Array.isArray(p.fires) && p.fires.length <= 30000 && p.fires.every(f => typeof f.id === "string" && Number.isFinite(f.lat) && Math.abs(f.lat) <= 90 && Number.isFinite(f.lon) && Math.abs(f.lon) <= 180 && Number.isInteger(f.time) && f.time <= p.capturedAt && f.time >= p.capturedAt - p.hours * 3600 && typeof f.satellite === "string" && (f.frp === null || Number.isFinite(f.frp))) &&
    Array.isArray(p.news) && p.news.length <= 30 && p.news.every(n => typeof n.title === "string" && typeof n.url === "string" && Number.isInteger(n.publishedAt)) && Array.isArray(p.sources) && p.sources.length <= 30 && Array.isArray(p.missing);
}
export function readFieldPacket(): FieldPacket | null {
  try { const text = localStorage.getItem(FIELD_KEY); if (!text || text.length > FIELD_MAX_BYTES) return null; const value = JSON.parse(text); return validFieldPacket(value) ? value : null; } catch { return null; }
}
