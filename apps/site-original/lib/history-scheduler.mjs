/**
 * INPE UTC daily history: a bounded and idempotent plan.
 * Cold archives are preserved, and any missing day is backfilled gradually.
 */
const utcDay = seconds => new Date(seconds * 1000).toISOString().slice(0,10);
export function planFireArchiveDays(now, rows, limit = 3) {
  if (!Number.isInteger(now) || now <= 0 || !Array.isArray(rows) || !Number.isInteger(limit) || limit < 1 || limit > 3) throw new Error('Plano de arquivo inválido');
  const byDay = new Map(rows.filter(r => typeof r?.day_utc === 'string' && Number.isInteger(r?.collected_at))
    .map(r => [r.day_utc, r]));
  const dates = Array.from({length:31}, (_,i)=>utcDay(now - i*86400));
  const recent = [0,1,2].flatMap(i=>{
    const d=dates[i],row=byDay.get(d);
    const maxAge=[6,12,24][i]*3600;
    return !row || (i>0 && !row.closed) || now - row.collected_at >= maxAge ? [d] : [];
  });
  const olderMissing=dates.slice(1).filter(d=>!byDay.has(d)).reverse();
  const chosen=[...new Set([...recent.slice(0,2),...olderMissing.slice(0,1),...recent.slice(2),...olderMissing])];
  return chosen.slice(0,limit);
}
