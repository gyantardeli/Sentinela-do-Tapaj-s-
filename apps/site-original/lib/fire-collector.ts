import { deduplicateFires, fireRowTime, parseCsv, parseFireRows, type Fire } from "./environment";
import { SourceFailure, sourceText, sourceErrorKind, type SourceFetcher } from "./source-http";
const BASE = "https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/";
export type FileFailure = { file: string; kind: string; detail: string };
export type FireFile = { file: string; rows: number; last: number; rejected: number };
export type FireCollection = { fires: Fire[]; last: number; checkedAt: number; coverage: { start: number; end: number; complete: boolean }; detail: string; failures?: FileFailure[]; recovered?: number; files?: FireFile[]; dailyComplete?: boolean };
export function parseInpeCsv(text: string, now: number) {
  const h = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0].toLowerCase().replaceAll('"', "").split(/[,;]/).map(s => s.trim());
  if (!h.some(k => ["lat", "latitude"].includes(k)) || !h.some(k => ["lon", "longitude"].includes(k)) || !h.some(k => ["data_hora_gmt", "datahora_gmt", "datahora", "data_hora", "data", "datetime", "acq_date"].includes(k)) || !h.some(k => ["satelite", "satellite", "instrument"].includes(k))) throw new SourceFailure("CSV_INVALID", "Colunas obrigatórias do INPE ausentes.");
  let rows: Record<string,string>[];
  try { rows = parseCsv(text); } catch { throw new SourceFailure("CSV_INVALID", "Estrutura CSV do INPE inválida."); }
  const valid: Record<string, string>[] = []; let last = 0, rejected = 0;
  for (const row of rows) {
    const lat = row.lat ?? row.latitude, lon = row.lon ?? row.longitude, time = fireRowTime(row), satellite = row.satelite ?? row.satellite ?? row.instrument;
    if (!lat?.trim() || !lon?.trim() || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lon)) > 180 || !Number.isFinite(time) || time > now || !satellite?.trim()) { rejected++; continue; }
    last = Math.max(last, time); valid.push(row);
  } return { fires: parseFireRows(valid, "INPE"), last, rejected };
}
export async function collectFires(now: number, fetcher: SourceFetcher = fetch): Promise<FireCollection> {
  const day = (time: number) => new Date(time * 1000).toISOString().slice(0, 10).replaceAll("-", ""), days = [day(now - 86400), day(now)];
  const failures: FileFailure[] = [], fail = (file: string, e: unknown) => failures.push({ file, kind: sourceErrorKind(e), detail: e instanceof Error ? e.message.slice(0, 100) : "Falha na consulta." });
  const read = async (path: string, timeoutMs = 12000) => parseInpeCsv(await sourceText(BASE + path, { fetcher, timeoutMs, maxBytes: 20 * 1024 * 1024 }), now);
  const daily = await Promise.allSettled(days.map(async date => ({ ...await read("diario/Brasil/focos_diario_br_" + date + ".csv"), day: date })));
  for (const [i, result] of daily.entries()) if (result.status === "rejected") fail("focos_diario_br_" + days[i] + ".csv", result.reason);
  const recent: (Awaited<ReturnType<typeof read>> & {file:string})[] = [];
  try {
    const html = await sourceText(BASE + "10min/", { fetcher, timeoutMs: 4500, maxBytes: 1_000_000, attempts: 1 });
    const files = [...new Set(Array.from(html.matchAll(/href=["'](focos_10min_\d{8}_\d{4}\.csv)["']/g), m => m[1]))].sort().slice(-6);
    const snapshots = await Promise.allSettled(files.map(file => read("10min/" + file, 8000)));
    for (const [i, result] of snapshots.entries()) if (result.status === "fulfilled") recent.push({...result.value,file:files[i]}); else fail(files[i], result.reason);
  } catch (error) { fail("10min/", error); }
  const good = daily.flatMap(r => r.status === "fulfilled" ? [r.value] : []);
  for(const v of good)if(v.rejected)failures.push({file:"focos_diario_br_"+v.day+".csv",kind:"resposta_invalida",detail:`${v.rejected} registros com coordenadas, horário ou satélite inválidos.`});
  if (!good.length) throw Object.assign(new SourceFailure("INPE_UNAVAILABLE", "Nenhum CSV diário válido do INPE. " + failures.map(f => f.file + ": " + f.kind + " " + f.detail).join("; ").slice(0, 400)), { files: failures });
  const files = [...good, ...recent], fires = deduplicateFires(files.flatMap(v => v.fires).filter(f => f.time >= now - 86400 && f.time <= now)).sort((a, b) => b.time - a.time);
  const last = Math.max(0, ...files.map(v => v.last)), current = good.find(d => d.day === days[1]);
  const complete = good.length === 2 && !!current?.last && now - current.last <= 3600 && now - last <= 7200 && files.every(v => !v.rejected);
  return { fires, last, checkedAt: now, coverage: { start: now - 86400, end: last, complete }, failures, dailyComplete:good.length===2&&good.every(v=>!v.rejected), files:[...good.map(v=>({file:"focos_diario_br_"+v.day+".csv",rows:v.fires.length,last:v.last,rejected:v.rejected})),...recent.map(v=>({file:v.file,rows:v.fires.length,last:v.last,rejected:v.rejected}))], detail: complete ? "CSV diários e atualizações de 10 min; sujeito ao atraso dos satélites." : "Cobertura parcial: arquivos ausentes, inválidos ou atrasados; podem faltar detecções recentes. Zero não confirma ausência de focos." };
}
// Port of mergeINPEOnPartial from V2.2 b000690. A complete collection replaces
// the old copy (including zero); a partial one preserves only valid 24h points.
export function mergeFireCollections(prior: FireCollection | null, fresh: FireCollection, now: number): FireCollection {
  if (!prior || (fresh.dailyComplete ?? fresh.coverage.complete)) return { ...fresh, recovered: 0 };
  const valid = (f: Fire) => Number.isFinite(f.time) && f.time >= now - 86400 && f.time <= now && Number.isFinite(f.lat) && Math.abs(f.lat) <= 90 && Number.isFinite(f.lon) && Math.abs(f.lon) <= 180 && !!f.satellite;
  const items = new Map(fresh.fires.filter(valid).map(f => [f.id, f])); let recovered = 0;
  for (const point of prior.fires) {
    if (!valid(point)) continue;
    const current = items.get(point.id);
    if (current) items.set(point.id, deduplicateFires([current, point])[0]);
    else { items.set(point.id, point); recovered++; }
  }
  return { ...fresh, fires: [...items.values()].sort((a, b) => b.time - a.time), recovered, last: Math.max(fresh.last, ...[...items.values()].map(f => f.time)), detail: fresh.detail + (recovered ? ` ${recovered} detecções anteriores preservadas com seus horários originais.` : "") };
}
export function previousFires(prior: FireCollection, now: number, error?: unknown): FireCollection {
  return { ...prior, fires: prior.fires.filter(f => f.time >= now - 86400 && f.time <= now), coverage: { start: now - 86400, end: prior.last, complete: false }, failures: (error as { files?: FileFailure[] })?.files ?? [], detail: "Consulta ao INPE falhou. Última leitura disponível, com o horário original; cobertura parcial. " + (error instanceof Error ? error.message.slice(0, 350) : "") };
}
