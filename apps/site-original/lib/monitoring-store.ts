import { env } from "cloudflare:workers";
import { PLACES, nearestAir, type AirPoint, type Weather } from "./environment";
import type { AirLocation, EnvironmentPacket } from "./environment-provider";
import { RADAR_LOCALITIES } from "./radar-sources";
import { groupArticles, type RadarData } from "./radar-core";
import { HISTORY_REVISION, RADII, SOURCE_CATALOG, calendarDays, dayStart, localDay, utcDay, validDay, type FireArchivePacket, type HealthCheck, type HealthData, type HistoryData } from "./monitoring";

function db() { if (!env.DB) throw new Error("Histórico indisponível."); return env.DB; }
async function batches(statements: D1PreparedStatement[]) { for (let i = 0; i < statements.length; i += 30) await db().batch(statements.slice(i, i + 30)); }
export function healthStatements(checks: HealthCheck[]) {
  const statements: D1PreparedStatement[] = [];
  for (let i = 0; i < checks.length; i += 30) {
    const chunk = checks.slice(i, i + 30);
    statements.push(db().prepare("INSERT INTO source_health_history (source_id,checked_at,value) VALUES " + chunk.map(() => "(?,?,?)").join(",") + " ON CONFLICT(source_id,checked_at) DO UPDATE SET value=excluded.value").bind(...chunk.flatMap(c => [c.sourceId, c.checkedAt, JSON.stringify(c)])));
  }
  return statements;
}
function observationStatements(rows: { kind: string; placeId: string; time: number; collectedAt: number; value: unknown }[]) {
  const statements: D1PreparedStatement[] = [];
  for (let i = 0; i < rows.length; i += 20) {
    const chunk = rows.slice(i, i + 20);
    statements.push(db().prepare("INSERT INTO environment_observations (kind,place_id,valid_at,collected_at,value) VALUES " + chunk.map(() => "(?,?,?,?,?)").join(",") + " ON CONFLICT(kind,place_id,valid_at) DO NOTHING").bind(...chunk.flatMap(r => [r.kind, r.placeId, r.time, r.collectedAt, JSON.stringify(r.value)])));
  }
  return statements;
}
function airRows(locations: AirLocation[], collectedAt: number) {
  return locations.flatMap(l => l.points.filter(p => p.time <= collectedAt && p.time >= collectedAt - 32 * 86400).map(p => ({ kind: "air", placeId: l.placeId, time: p.time, collectedAt, value: p })));
}
export async function persistEnvironmentHistory(packet: EnvironmentPacket) {
  const rows = [...airRows(packet.air ?? [], packet.collectedAt), ...(packet.weather ?? []).map(l => ({ kind: "weather", placeId: l.placeId, time: l.value.time, collectedAt: packet.collectedAt, value: l.value }))];
  const checks = (["air", "weather"] as const).map((sourceId): HealthCheck => ({ sourceId, checkedAt: packet.collectedAt, status: packet[sourceId]?.length ? packet[sourceId]!.length < PLACES.length ? "partial" : "ok" : "unavailable", dataTime: sourceId === "air" ? nearestAir(packet.air?.[0]?.points ?? [], packet.collectedAt)?.time ?? null : packet.weather?.[0]?.value.time ?? null, accepted: packet[sourceId]?.length ?? 0, method: sourceId === "air" ? "CAMS global · modelo" : "Meteorologia · modelo", detail: packet[sourceId]?.length ? `Coleta de ${packet[sourceId]!.length}/8 municípios concluída. Horários do modelo preservados.` + (packet.failures[sourceId] ? " " + packet.failures[sourceId] : "") : packet.failures[sourceId] ?? "A fonte não respondeu nesta execução." }));
  await batches([...observationStatements(rows), ...healthStatements(checks)]);
}
export async function pruneMonitoring(now: number) {
  await db().batch([
    db().prepare("DELETE FROM environment_observations WHERE valid_at < ?").bind(now - 32 * 86400),
    db().prepare("DELETE FROM source_health_history WHERE checked_at < ?").bind(now - 30 * 86400),
    db().prepare("DELETE FROM fire_archive_days WHERE day_utc < ?").bind(utcDay(now - 32 * 86400)),
  ]);
}
export async function seedLatestMonitoring() {
  if (await db().prepare("SELECT key FROM radar_settings WHERE key=?").bind("monitoring:bootstrapped").first()) return;
  const [settings, sources] = await Promise.all([
    db().prepare("SELECT key,value FROM radar_settings WHERE key IN (?,?)").bind("environment:air", "environment:weather").all<{ key: string; value: string }>(),
    db().prepare("SELECT * FROM radar_source_checks").all<Record<string, any>>(),
  ]);
  for (const row of settings.results) {
    const part = JSON.parse(row.value), kind = row.key === "environment:air" ? "air" : "weather";
    if (Array.isArray(part.locations) && Number.isInteger(part.collectedAt)) {
      const packet: EnvironmentPacket = { revision: "environment-v1", collectedAt: part.collectedAt, air: null, weather: null, failures: {} };
      packet[kind] = part.locations;
      // Seed only known successful records, without creating a failure for the other source.
      const rows = kind === "air" ? airRows(part.locations, part.collectedAt) : part.locations.map((l: any) => ({ kind, placeId: l.placeId, time: l.value.time, collectedAt: part.collectedAt, value: l.value }));
      const check: HealthCheck = { sourceId: kind, checkedAt: part.collectedAt, status: "ok", dataTime: kind === "air" ? nearestAir(part.locations[0]?.points ?? [], part.collectedAt)?.time ?? null : part.locations[0]?.value.time ?? null, accepted: part.locations.length, method: "Coleta ambiental preservada", detail: "Registro importado do cache persistente com seu horário original." };
      await batches([...observationStatements(rows), ...healthStatements([check])]);
    }
  }
  await batches(healthStatements(sources.results.map(s => ({ sourceId: "radar:" + s.source_id, checkedAt: s.checked_at, status: s.status, detail: s.detail, dataTime: null, accepted: s.accepted, method: JSON.parse(s.methods).join(" + ") }))));
  await db().prepare("INSERT OR IGNORE INTO radar_settings (key,value,updated_at) VALUES (?,?,?)").bind("monitoring:bootstrapped", "true", Math.floor(Date.now() / 1000)).run();
}
export function validateHistoryPacket(input: unknown, now: number) {
  if (!input || typeof input !== "object") throw new Error("Pacote inválido.");
  const v = input as Record<string, any>;
  if (v.revision !== HISTORY_REVISION || !Number.isInteger(v.collectedAt) || v.collectedAt < now - 7200 || v.collectedAt > now + 300) throw new Error("Revisão ou horário inválido.");
  if (v.kind === "bootstrap") return { kind: "bootstrap" as const, collectedAt: v.collectedAt };
  if (v.kind === "fire-day") {
    if (!validDay(v.dayUtc) || v.dayUtc > utcDay(v.collectedAt) || v.dayUtc < utcDay(v.collectedAt - 32 * 86400) || v.closed !== (v.dayUtc < utcDay(v.collectedAt))) throw new Error("Dia do INPE inválido.");
    const start = Date.parse(v.dayUtc + "T00:00:00Z") / 1000, days = [localDay(start), localDay(start + 43200)];
    if (v.last !== null && (!Number.isInteger(v.last) || v.last < start || v.last >= start + 86400 || v.last > v.collectedAt + 300)) throw new Error("Referência inválida.");
    if (!Array.isArray(v.parts) || v.parts.length !== 64) throw new Error("Recortes incompletos.");
    const keys = new Set<string>();
    const parts = v.parts.map((p: any) => {
      if (!p || !days.includes(p.day) || !PLACES.some(l => l.id === p.placeId) || !RADII.includes(p.radius) || !p.counts || typeof p.counts !== "object" || Array.isArray(p.counts) || Object.keys(p.counts).length > 80) throw new Error("Recorte inválido.");
      const key = [p.day, p.placeId, p.radius].join("|"); if (keys.has(key)) throw new Error("Recorte duplicado."); keys.add(key);
      const counts: Record<string, number> = Object.create(null);
      for (const [k, n] of Object.entries(p.counts)) { if (!/^[a-zA-Z0-9_ .+/-]{1,60}$/.test(k) || k === "__proto__" || k === "constructor" || !Number.isInteger(n) || (n as number) < 0 || (n as number) > 1000000) throw new Error("Contagem inválida."); counts[k] = n as number; }
      if (!Object.hasOwn(counts, "all") || Object.entries(counts).filter(([k]) => k !== "all").reduce((n, [,v]) => n + v, 0) !== counts.all) throw new Error("Contagens inconsistentes.");
      return { day: p.day, placeId: p.placeId, radius: p.radius, counts };
    });
    return { revision: HISTORY_REVISION, kind: "fire-day" as const, collectedAt: v.collectedAt, dayUtc: v.dayUtc, closed: v.closed, last: v.last, parts } as FireArchivePacket;
  }
  if (v.kind === "air") {
    if (!Array.isArray(v.locations) || v.locations.length !== 8 || new Set(v.locations.map((l: any) => l?.placeId)).size !== 8) throw new Error("Locais inválidos.");
    const locations = v.locations.map((l: any): AirLocation => {
      if (!PLACES.some(p => p.id === l.placeId) || !Array.isArray(l.points) || l.points.length < 24 || l.points.length > 800) throw new Error("Série inválida.");
      let previous = 0;
      const points = l.points.map((p: any): AirPoint => {
        if (!p || !Number.isInteger(p.time) || p.time <= previous || p.time > v.collectedAt || p.time < v.collectedAt - 32 * 86400 || [p.pm25,p.pm10,p.aqi].some((n: any, i: number) => n !== null && (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > [10000,20000,5000][i]))) throw new Error("Valor do modelo inválido.");
        previous = p.time; return { time: p.time, pm25: p.pm25, pm10: p.pm10, aqi: p.aqi };
      });
      return { placeId: l.placeId, points };
    });
    return { kind: "air" as const, collectedAt: v.collectedAt, locations };
  }
  if (v.kind === "checks") {
    if (!Array.isArray(v.checks) || v.checks.length !== 1) throw new Error("Consulta inválida.");
    const c = v.checks[0];
    if (c.sourceId !== "inpe" || !["ok","partial","unavailable"].includes(c.status) || (c.dataTime !== null && (!Number.isInteger(c.dataTime) || c.dataTime > v.collectedAt + 300 || c.dataTime < v.collectedAt - 32 * 86400)) || !Number.isInteger(c.accepted) || c.accepted < 0 || c.accepted > 1000000) throw new Error("Estado inválido.");
    return { kind: "checks" as const, collectedAt: v.collectedAt, checks: [{ sourceId: "inpe", checkedAt: v.collectedAt, status: c.status, dataTime: c.dataTime, accepted: c.accepted, method: "CSV diários oficiais", detail: typeof c.detail === "string" ? c.detail.slice(0, 500) : "Consulta de arquivos diários." } as HealthCheck] };
  }
  throw new Error("Tipo de histórico inválido.");
}
export async function saveHistoryPacket(packet: ReturnType<typeof validateHistoryPacket>) {
  if (packet.kind === "bootstrap") await seedLatestMonitoring();
  else if (packet.kind === "fire-day") await db().prepare("INSERT INTO fire_archive_days (day_utc,collected_at,value) VALUES (?,?,?) ON CONFLICT(day_utc) DO UPDATE SET collected_at=excluded.collected_at,value=excluded.value WHERE excluded.collected_at>=fire_archive_days.collected_at").bind(packet.dayUtc, packet.collectedAt, JSON.stringify(packet)).run();
  else if (packet.kind === "air") {
    await batches(observationStatements(airRows(packet.locations, packet.collectedAt)));
    await db().prepare("INSERT INTO radar_settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE excluded.updated_at>=radar_settings.updated_at").bind("history:air-import", JSON.stringify({ collectedAt: packet.collectedAt }), packet.collectedAt).run();
  } else await batches(healthStatements(packet.checks));
  await pruneMonitoring(Math.floor(Date.now() / 1000));
}
export async function historyStatus() {
  const [fires, air, model] = await Promise.all([
    db().prepare("SELECT day_utc,collected_at,value FROM fire_archive_days ORDER BY day_utc").all<{ day_utc: string; collected_at: number; value: string }>(),
    db().prepare("SELECT place_id,MIN(valid_at) AS first_at,MAX(valid_at) AS last_at,COUNT(*) AS samples FROM environment_observations WHERE kind='air' GROUP BY place_id").all(),
    db().prepare("SELECT updated_at FROM radar_settings WHERE key=?").bind("history:air-import").first<{ updated_at: number }>(),
  ]);
  return { revision: HISTORY_REVISION, fireDays: fires.results.map(r => ({ dayUtc: r.day_utc, collectedAt: r.collected_at, closed: JSON.parse(r.value).closed })), air: air.results, modelImportedAt: model?.updated_at ?? null };
}
export async function readHealth(days: number, now: number): Promise<HealthData> {
  const dates = calendarDays(now, days), start = dayStart(dates[0]);
  const [rows, first] = await Promise.all([
    db().prepare("SELECT value FROM source_health_history WHERE checked_at >= ? AND checked_at <= ? ORDER BY checked_at").bind(now - 30 * 86400, now + 300).all<{ value: string }>(),
    db().prepare("SELECT MIN(checked_at) AS first_at FROM source_health_history").first<{ first_at: number | null }>(),
  ]);
  const checks: HealthCheck[] = rows.results.map(r => JSON.parse(r.value));
  return { now, days, startedAt: first?.first_at ?? null, sources: SOURCE_CATALOG.map(s => {
    const all = checks.filter(c => c.sourceId === s.id), selected = all.filter(c => c.checkedAt >= start), latest = all.at(-1) ?? null, responses = selected.filter(c => c.status !== "unavailable").length;
    return { ...s, latest, checks: selected.length, responses, failures: selected.length - responses, direct: selected.filter(c => c.status === "ok").length, empty: selected.filter(c => c.status === "empty").length, responseRate: selected.length ? responses / selected.length * 100 : null, lastResponseAt: all.filter(c => c.status !== "unavailable").at(-1)?.checkedAt ?? null, stale: s.automatic && (!latest || now - latest.checkedAt > 7200), timeline: dates.map(day => { const daily = selected.filter(c => localDay(c.checkedAt) === day); return { day, checks: daily.length, responses: daily.filter(c => c.status !== "unavailable").length, failures: daily.filter(c => c.status === "unavailable").length }; }) };
  }) };
}
export async function readHistory(placeId: string, radius: number, satellite: string, days: number, radar: RadarData, now: number): Promise<HistoryData> {
  const dates = calendarDays(now, days), start = dayStart(dates[0]);
  const [observations, archives, first, model, health] = await Promise.all([
    db().prepare("SELECT kind,value FROM environment_observations WHERE place_id=? AND valid_at>=? AND valid_at<=? ORDER BY valid_at").bind(placeId, start, now).all<{ kind: string; value: string }>(),
    db().prepare("SELECT value FROM fire_archive_days WHERE day_utc>=? ORDER BY day_utc").bind(utcDay(start)).all<{ value: string }>(),
    db().prepare("SELECT MIN(collected_at) AS first_at FROM environment_observations").first<{ first_at: number | null }>(),
    db().prepare("SELECT updated_at FROM radar_settings WHERE key=?").bind("history:air-import").first<{ updated_at: number }>(),
    db().prepare("SELECT MIN(checked_at) AS first_at FROM source_health_history").first<{ first_at: number | null }>(),
  ]);
  const packets: FireArchivePacket[] = archives.results.map(r => JSON.parse(r.value));
  const available = new Set<string>(); for (const packet of packets) for (const part of packet.parts) if (part.placeId === placeId && part.radius === radius) for (const s of Object.keys(part.counts)) if (s !== "all") available.add(s);
  const air = observations.results.filter(r => r.kind === "air").map(r => JSON.parse(r.value) as AirPoint);
  const weather = observations.results.filter(r => r.kind === "weather").map(r => JSON.parse(r.value) as Weather);
  const news = radar.items.filter(i => i.publishedAt >= start && i.publishedAt <= now && i.places.some(id => RADAR_LOCALITIES.find(l => l.id === id)?.municipality === placeId));
  const groups = groupArticles(news, placeId === "ruropolis" || placeId === "placas" ? "ruropolis-placas" : placeId, now);
  const daily = dates.map(day => {
    const contributors = packets.filter(p => p.parts.some(part => part.day === day && part.placeId === placeId && part.radius === radius));
    const complete = contributors.length === 2 && contributors.every(p => p.closed);
    const fireCount = contributors.length ? contributors.reduce((count, packet) => count + packet.parts.filter(p => p.day === day && p.placeId === placeId && p.radius === radius).reduce((n,p) => n + (p.counts[satellite] ?? 0), 0), 0) : null;
    const points = air.filter(p => localDay(p.time) === day && p.pm25 !== null), winds = weather.filter(p => localDay(p.time) === day && p.speed !== null);
    return { day, fireCount, fireCoverage: complete ? "full" as const : contributors.length ? "partial" as const : "missing" as const, pm25: points.length ? points.reduce((n,p) => n + p.pm25!, 0) / points.length : null, pmSamples: points.length, expectedHours: day === localDay(now) ? Math.floor((now - dayStart(day)) / 3600) + 1 : 24, wind: winds.length ? winds.reduce((n,p) => n + p.speed!, 0) / winds.length : null, weatherSamples: winds.length, newsGroups: groups.filter(g => localDay(g.lead.publishedAt) === day).length, newsPublications: news.filter(i => localDay(i.publishedAt) === day).length };
  });
  return { now, placeId, radius, satellite, days, daily, satellites: [...available].sort(), archiveStartedAt: first?.first_at ?? null, healthStartedAt: health?.first_at ?? null, modelImportedAt: model?.updated_at ?? null };
}
