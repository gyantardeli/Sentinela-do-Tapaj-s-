/**
 * Cloudflare Scheduled collection journal. This module has no I/O except an injected D1
 * binding; it is tested independently with a D1-like stub.
 */
export async function runScheduledCycle({ db, mode, tasks, now = () => Math.floor(Date.now() / 1000), id = () => crypto.randomUUID(), logger = console }) {
  if (!db || !['environment', 'radar'].includes(mode) || !Array.isArray(tasks) || !tasks.length) throw new Error('Invalid scheduled collection context');
  const startedAt = now(), results = [];
  for (const task of tasks) {
    const started = now();
    try {
      const report = await task.run();
      const status = ['ok', 'partial', 'unavailable'].includes(report?.status) ? report.status : 'unavailable';
      results.push({
        source: task.name, status, startedAt: started, completedAt: now(),
        accepted: Number.isSafeInteger(report?.accepted) && report.accepted >= 0 ? report.accepted : 0,
        detail: String(report?.detail || '').slice(0, 350),
        dataAt: Number.isInteger(report?.dataAt) ? report.dataAt : null,
      });
    } catch (error) {
      results.push({
        source: task.name, status: 'error', startedAt: started, completedAt: now(),
        accepted: 0, dataAt: null,
        detail: (error instanceof Error ? error.name + ': ' + error.message : 'Falha no coletor').slice(0, 350),
      });
    }
  }
  const completedAt = now();
  const status = results.every(x => x.status === 'ok') ? 'ok'
    : results.every(x => ['error', 'unavailable'].includes(x.status)) ? 'unavailable' : 'partial';
  const report = { version: 1, mode, status, startedAt, completedAt, results };
  await db.batch([
    db.prepare('INSERT INTO watchdog_checks (id, checked_at, mode, value) VALUES (?,?,?,?)')
      .bind(id(), completedAt, 'cron:' + mode, JSON.stringify(report)),
    db.prepare("DELETE FROM watchdog_checks WHERE checked_at < ? AND mode LIKE 'cron:%'")
      .bind(completedAt - 30 * 86400),
  ]);
  logger.log('sentinela.cron', JSON.stringify({ mode, status, startedAt, completedAt, sources: results.map(r => ({ name: r.source, status: r.status, accepted: r.accepted })) }));
  return report;
}
