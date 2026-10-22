import { bearing, deduplicateFires, distance, type Fire, type Place } from "./environment";
import type { Coordinate, InterestArea } from "./areas";

export const EVENT_DISTANCE_KM = 2;
export const EVENT_GAP_SECONDS = 6 * 3600;
export type ReplayDetection = Fire & { detectionId: string; eventId: string };
export type FireReplay = { start: number; end: number; detections: ReplayDetection[]; times: number[] };
export type ReplayEvent = { id: string; firstAt: number; lastAt: number; detections: ReplayDetection[]; center: Coordinate };

// Labels identify observations, not physical flames. Event labels are local to a query.
export function observationLabel(id: string) {
  let a = 2166136261, b = 3339675911;
  for (let i = 0; i < id.length; i++) { a = Math.imul(a ^ id.charCodeAt(i), 16777619); b = Math.imul(b ^ id.charCodeAt(i), 2246822519); }
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}

export function buildFireReplay(raw: Fire[], start: number, end: number): FireReplay {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return { start: 0, end: 0, detections: [], times: [0] };
  const fires = deduplicateFires(raw.filter(f => f && typeof f.id === "string" && Number.isFinite(f.time) && Number.isFinite(f.lat) && Number.isFinite(f.lon) && f.lat >= -11 && f.lat <= 1 && f.lon >= -62 && f.lon <= -50 && f.time >= start && f.time <= end))
    .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  const last = new Map<string, Fire>(), cells = new Map<string, Set<string>>();
  const cell = (p: Coordinate) => [Math.floor(p.lon * 110.8 / EVENT_DISTANCE_KM), Math.floor(p.lat * 111.2 / EVENT_DISTANCE_KM)];
  const key = (p: Coordinate) => cell(p).join(":");
  const detections: ReplayDetection[] = [];
  for (const fire of fires) {
    const [x, y] = cell(fire);
    let eventId = "", best = Infinity;
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
      for (const id of cells.get(`${x + dx}:${y + dy}`) ?? []) {
        const prior = last.get(id)!;
        if (fire.time - prior.time > EVENT_GAP_SECONDS) continue;
        const gap = distance(prior, fire);
        if (gap <= EVENT_DISTANCE_KM && (gap < best || gap === best && id < eventId)) { eventId = id; best = gap; }
      }
    }
    if (!eventId) eventId = "EV-" + observationLabel(fire.id);
    const previous = last.get(eventId);
    if (previous) cells.get(key(previous))?.delete(eventId);
    last.set(eventId, fire);
    const bucketKey = key(fire), bucket = cells.get(bucketKey) ?? new Set<string>();
    bucket.add(eventId); cells.set(bucketKey, bucket);
    detections.push({ ...fire, detectionId: "D-" + observationLabel(fire.id), eventId });
  }
  return { start, end, detections, times: [...new Set([start, ...detections.map(f => f.time), end])].sort((a, b) => a - b) };
}

// Frames never use later detections to change earlier associations or summaries.
export function replayFrame(replay: FireReplay, at: number, eventId = "all", recentOnly = false) {
  const cursor = Math.max(replay.start, Math.min(replay.end, at));
  const observed = replay.detections.filter(f => f.time <= cursor);
  const groups = new Map<string, ReplayDetection[]>();
  for (const fire of observed) { const group = groups.get(fire.eventId) ?? []; group.push(fire); groups.set(fire.eventId, group); }
  const events: ReplayEvent[] = [...groups].map(([id, detections]) => ({ id, firstAt: detections[0].time, lastAt: detections.at(-1)!.time, detections,
    center: { lat: detections.reduce((n, f) => n + f.lat, 0) / detections.length, lon: detections.reduce((n, f) => n + f.lon, 0) / detections.length } }))
    .sort((a, b) => b.lastAt - a.lastAt || b.detections.length - a.detections.length || a.id.localeCompare(b.id));
  const visible = observed.filter(f => (eventId === "all" || f.eventId === eventId) && (!recentOnly || f.time >= cursor - 3600));
  return { cursor, observed, events, visible, recent: observed.filter(f => f.time >= cursor - 3600).length };
}

export function replayPoints(fires: ReplayDetection[], cursor: number) {
  return { type: "FeatureCollection" as const, features: fires.map(f => ({ type: "Feature" as const, id: f.detectionId,
    properties: { id: f.detectionId, eventId: f.eventId, time: f.time, recent: f.time >= cursor - 3600 ? 1 : 0, frp: f.frp, satellite: f.satellite },
    geometry: { type: "Point" as const, coordinates: [f.lon, f.lat] } })) };
}

function destination(p: Coordinate, km: number, degrees: number): [number, number] {
  const r = Math.PI / 180, d = km / 6371, phi = p.lat * r, theta = degrees * r;
  const lat = Math.asin(Math.sin(phi) * Math.cos(d) + Math.cos(phi) * Math.sin(d) * Math.cos(theta));
  const lon = p.lon * r + Math.atan2(Math.sin(theta) * Math.sin(d) * Math.cos(phi), Math.cos(d) - Math.sin(phi) * Math.sin(lat));
  return [lon / r, lat / r];
}
export function replayBoundary(place: Place, radius: number, area?: InterestArea | null) {
  const ring = (p: Coordinate, km: number) => Array.from({ length: 97 }, (_, i) => destination(p, km, i * 360 / 96));
  const lines: number[][][] = [];
  if (!area || area.kind === "circle") lines.push(ring(area?.points[0] ?? place, area?.radiusKm ?? radius));
  else if (area.kind === "polygon") lines.push([...area.points, area.points[0]].map(p => [p.lon, p.lat]));
  else {
    // The corridor is the union of geodesic segment buffers, including round ends.
    area.points.forEach(p => lines.push(ring(p, area.radiusKm)));
    area.points.slice(1).forEach((b, i) => { const a = area.points[i], direction = bearing(a, b);
      lines.push([destination(a, area.radiusKm, direction - 90), destination(b, area.radiusKm, direction - 90)]);
      lines.push([destination(a, area.radiusKm, direction + 90), destination(b, area.radiusKm, direction + 90)]);
    });
  }
  return { type: "FeatureCollection" as const, features: lines.map(coordinates => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates } })) };
}

export function replayCsv(fires: ReplayDetection[], cursor: number) {
  const rows: (string | number | null)[][] = [["id_deteccao", "grupo_estimado_recorte", "latitude", "longitude", "observacao_UTC", "satelite", "frp_MW", "municipio", "fonte", "quadro_UTC", "chave_original"]];
  for (const f of fires) rows.push([f.detectionId, f.eventId, f.lat, f.lon, new Date(f.time * 1000).toISOString(), f.satellite, f.frp, f.municipality ?? null, f.source, new Date(cursor * 1000).toISOString(), f.id]);
  return "\uFEFF" + rows.map(row => row.map(value => '"' + String(value ?? "").replaceAll('"', '""') + '"').join(";")).join("\r\n");
}
