import { env } from "cloudflare:workers";
import { collectAllSources } from "./radar-collector";
import type { RadarData, RadarItem, RadarRun, SourceCheck } from "./radar-core";
import { healthStatements } from "./monitoring-store";
let pending: Promise<{ run: RadarRun; reused: boolean }> | null = null;
function db() { if (!env.DB) throw new Error("Armazenamento do radar indisponível."); return env.DB; }
function itemFromRow(row: Record<string, any>): RadarItem { return { id: row.id, sourceId: row.source_id, title: row.title, url: row.url, publishedAt: row.published_at, firstSeen: row.first_seen, lastSeen: row.last_seen, mode: row.mode, places: JSON.parse(row.places), regions: JSON.parse(row.regions), topic: row.topic, tags: JSON.parse(row.tags), credit: row.credit }; }
function runFromRow(row: Record<string, any>): RadarRun { return { id: row.id, startedAt: row.started_at, completedAt: row.completed_at, checked: row.checked, available: row.available, accepted: row.accepted, status: row.status }; }
export async function readRadar(): Promise<RadarData> {
  const now = Math.floor(Date.now() / 1000);
  const connection = db();
  const [items, sources, run, schedule] = await Promise.all([
    connection.prepare("SELECT * FROM radar_items WHERE published_at >= ? ORDER BY published_at DESC LIMIT 1000").bind(now - 30 * 86400).all(),
    connection.prepare("SELECT * FROM radar_source_checks").all(),
    connection.prepare("SELECT * FROM radar_runs ORDER BY completed_at DESC LIMIT 1").first(),
    connection.prepare("SELECT value FROM radar_settings WHERE key = ?").bind("schedule").first<{ value: string }>(),
  ]);
  return { now, items: (items.results ?? []).map(itemFromRow), sources: (sources.results ?? []).map((r: Record<string, any>): SourceCheck => ({ sourceId: r.source_id, status: r.status, checkedAt: r.checked_at, lastOkAt: r.last_ok_at, found: r.found, accepted: r.accepted, detail: r.detail, methods: JSON.parse(r.methods) })), run: run ? runFromRow(run) : null, schedule: schedule ? JSON.parse(schedule.value) : null, storageReady: true };
}
export async function collectAndSave(): Promise<{ run: RadarRun; reused: boolean }> {
  if (pending) return pending;
  pending = (async () => {
    const connection = db(), startedAt = Math.floor(Date.now() / 1000);
    const recent = await connection.prepare("SELECT * FROM radar_runs ORDER BY completed_at DESC LIMIT 1").first<Record<string, any>>();
    if (recent && startedAt - recent.completed_at < 600) return { run: runFromRow(recent), reused: true };
    const result = await collectAllSources(startedAt);
    const run = await persistCollection(result, startedAt);
    return { run, reused: false };
  })().finally(() => { pending = null; });
  return pending;
}
export async function saveRadarSchedule(value: { id: string; enabled: boolean; cadence: string; timezone: string }) {
  await db().prepare("INSERT INTO radar_settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind("schedule", JSON.stringify(value), Math.floor(Date.now() / 1000)).run();
}

export async function persistCollection(result: { items: RadarItem[]; checks: SourceCheck[] }, startedAt: number, runId = crypto.randomUUID()): Promise<RadarRun> {
  const connection = db();
  const previous = await connection.prepare("SELECT * FROM radar_runs WHERE id = ?").bind(runId).first<Record<string, any>>();
  if (previous) return runFromRow(previous);
    const statements: D1PreparedStatement[] = [];
    const itemSql = `INSERT INTO radar_items (id,source_id,title,url,published_at,first_seen,last_seen,mode,places,regions,topic,tags,credit) VALUES %ROWS%
      ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen, published_at=MIN(radar_items.published_at,excluded.published_at),
      url=CASE WHEN excluded.mode='rss' OR radar_items.mode<>'rss' THEN excluded.url ELSE radar_items.url END,
      mode=CASE WHEN excluded.mode='rss' THEN 'rss' ELSE radar_items.mode END,
      places=CASE WHEN excluded.mode='rss' OR radar_items.mode<>'rss' THEN excluded.places ELSE radar_items.places END,
      regions=CASE WHEN excluded.mode='rss' OR radar_items.mode<>'rss' THEN excluded.regions ELSE radar_items.regions END,
      tags=CASE WHEN excluded.mode='rss' OR radar_items.mode<>'rss' THEN excluded.tags ELSE radar_items.tags END,
      credit=COALESCE(excluded.credit,radar_items.credit)`;
    // Seven rows use 91 bindings, below D1's 100-parameter limit.
    for (let i = 0; i < result.items.length; i += 7) {
      const chunk = result.items.slice(i, i + 7);
      const values = chunk.flatMap(item => [item.id, item.sourceId, item.title, item.url, item.publishedAt, item.firstSeen, item.lastSeen, item.mode, JSON.stringify(item.places), JSON.stringify(item.regions), item.topic, JSON.stringify(item.tags), item.credit]);
      statements.push(connection.prepare(itemSql.replace("%ROWS%", chunk.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?)").join(","))).bind(...values));
    }
    for (let i = 0; i < statements.length; i += 35) await connection.batch(statements.slice(i, i + 35));
    const checks: D1PreparedStatement[] = [];
    const checkSql = `INSERT INTO radar_source_checks (source_id,status,checked_at,last_ok_at,found,accepted,detail,methods) VALUES %ROWS%
      ON CONFLICT(source_id) DO UPDATE SET status=excluded.status,checked_at=excluded.checked_at,last_ok_at=COALESCE(excluded.last_ok_at,radar_source_checks.last_ok_at),found=excluded.found,accepted=excluded.accepted,detail=excluded.detail,methods=excluded.methods`;
    for (let i = 0; i < result.checks.length; i += 12) {
      const chunk = result.checks.slice(i, i + 12);
      const values = chunk.flatMap(check => [check.sourceId, check.status, check.checkedAt, check.lastOkAt, check.found, check.accepted, check.detail, JSON.stringify(check.methods)]);
      checks.push(connection.prepare(checkSql.replace("%ROWS%", chunk.map(() => "(?,?,?,?,?,?,?,?)").join(","))).bind(...values));
    }
    const completedAt = Math.floor(Date.now() / 1000), available = result.checks.filter(c => c.status === "ok" || c.status === "indexed").length;
    const run: RadarRun = { id: runId, startedAt, completedAt, checked: result.checks.length, available, accepted: result.items.length, status: available === 20 ? "complete" : "partial" };
    const health = healthStatements(result.checks.map(c => ({ sourceId: "radar:" + c.sourceId, checkedAt: c.checkedAt, status: c.status, detail: c.detail, dataTime: null, method: c.methods.join(" + "), accepted: c.accepted })));
    await connection.batch([...checks, ...health, connection.prepare("INSERT INTO radar_runs (id,started_at,completed_at,checked,available,accepted,status) VALUES (?,?,?,?,?,?,?)").bind(run.id, startedAt, completedAt, run.checked, run.available, run.accepted, run.status), connection.prepare("DELETE FROM radar_items WHERE published_at < ?").bind(startedAt - 30 * 86400), connection.prepare("DELETE FROM radar_runs WHERE completed_at < ?").bind(startedAt - 30 * 86400)]);
  return run;
}
