import { RADAR_SOURCES } from "./radar-sources";

export const HISTORY_REVISION = "regional-history-v1";
export const RADII = [25, 50, 100, 200] as const;
export type HealthCheck = { sourceId: string; checkedAt: number; status: "ok" | "partial" | "indexed" | "empty" | "unavailable"; detail: string; dataTime: number | null; method: string; accepted: number; diagnostics?:ReturnType<typeof import("./fire-snapshot").fireDiagnostics> };
export type FireDayPart = { day: string; placeId: string; radius: number; counts: Record<string, number> };
export type FireArchivePacket = { revision: string; kind: "fire-day"; collectedAt: number; dayUtc: string; closed: boolean; last: number | null; parts: FireDayPart[] };
export const SOURCE_CATALOG = [
  { id: "inpe", name: "INPE · arquivos diários", family: "environment", url: "https://data.inpe.br/queimadas/portal/", automatic: true },
  { id: "air", name: "CAMS / Open-Meteo · ar", family: "environment", url: "https://open-meteo.com/en/docs/air-quality-api", automatic: true },
  { id: "weather", name: "Open-Meteo · meteorologia", family: "environment", url: "https://open-meteo.com/en/docs", automatic: true },
  ...RADAR_SOURCES.map(s => ({ id: "radar:" + s.id, name: s.name, family: "news", url: s.url, automatic: true })),
  { id: "selva", name: "SELVA", family: "external", url: "https://www.appselva.com.br/", automatic: false },
  { id: "windy", name: "Windy", family: "external", url: "https://www.windy.com/", automatic: false },
  { id: "accuweather", name: "AccuWeather", family: "external", url: "https://www.accuweather.com/", automatic: false },
  { id: "climaeradar", name: "Clima & Radar", family: "external", url: "https://www.climaeradar.com.br/", automatic: false },
];
export function localDay(time: number) { return new Date((time - 10800) * 1000).toISOString().slice(0, 10); }
export function utcDay(time: number) { return new Date(time * 1000).toISOString().slice(0, 10); }
export function dayStart(day: string) { return Date.parse(day + "T00:00:00-03:00") / 1000; }
export function calendarDays(now: number, days: number) { const start = dayStart(localDay(now)); return Array.from({ length: days }, (_, i) => localDay(start - (days - 1 - i) * 86400)); }
export function validDay(day: unknown): day is string { if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false; const time = Date.parse(day + "T00:00:00Z") / 1000; return Number.isFinite(time) && utcDay(time) === day; }
export type HistoryDay = { day: string; fireCount: number | null; fireCoverage: "full" | "partial" | "missing"; pm25: number | null; pmSamples: number; expectedHours: number; wind: number | null; weatherSamples: number; newsGroups: number; newsPublications: number };
export type HistoryData = { now: number; placeId: string; radius: number; satellite: string; days: number; daily: HistoryDay[]; satellites: string[]; archiveStartedAt: number | null; healthStartedAt: number | null; modelImportedAt: number | null; error?: string };
export type HealthSource = typeof SOURCE_CATALOG[number] & { latest: HealthCheck | null; checks: number; responses: number; failures: number; direct: number; empty: number; responseRate: number | null; lastResponseAt: number | null; stale: boolean; timeline: { day: string; checks: number; responses: number; failures: number }[] };
export type HealthData = { now: number; days: number; startedAt: number | null; sources: HealthSource[]; error?: string };
