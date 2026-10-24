import { PLACES, display, nearestAir } from "./environment";
import type { EnvironmentCache } from "./environment-provider";
import { RADII, SOURCE_CATALOG, localDay, type FireArchivePacket, type HealthCheck } from "./monitoring";

export type AlertRule = { id: string; revision: string; enabled: boolean; kind: "fire" | "air" | "collection"; placeId: string; radius: number; satellite: string; threshold: number; cooldownHours: number; createdAt: number };
export type AlertConfig = { version: string; rules: AlertRule[] };
export type AlertState = { evaluatedAt: number; lastAlertAt: number | null; high: boolean; counts: Record<string, number>; pending: number; pendingCounts: Record<string, number>; condition: string };
export type AlertEvent = { id: string; ruleId: string; createdAt: number; kind: AlertRule["kind"]; title: string; detail: string; dataTime: number | null; readAt: number | null };
export type AlertData = { now: number; config: AlertConfig; events: AlertEvent[]; evaluatedAt: number | null; error?: string };
export function validateRules(input: unknown, previous: AlertRule[], now: number): AlertRule[] {
  if (!Array.isArray(input) || input.length > 12) throw new Error("Use até 12 regras.");
  const ids = new Set<string>();
  return input.map(r => {
    if (!r || typeof r.id !== "string" || !/^[a-zA-Z0-9-]{1,50}$/.test(r.id) || ids.has(r.id) || !["fire","air","collection"].includes(r.kind) || typeof r.enabled !== "boolean" || !PLACES.some(p => p.id === r.placeId) || !RADII.includes(r.radius) || typeof r.satellite !== "string" || !/^[a-zA-Z0-9_ .+/-]{1,60}$/.test(r.satellite) || !Number.isFinite(r.threshold) || r.threshold < 1 || r.threshold > (r.kind === "fire" ? 100000 : r.kind === "air" ? 1000 : 48) || (r.kind === "fire" && !Number.isInteger(r.threshold)) || ![1,3,6,12,24].includes(r.cooldownHours)) throw new Error("Revise local, limite e intervalo das regras.");
    ids.add(r.id);
    const fields = { id:r.id, enabled:r.enabled, kind:r.kind, placeId:r.placeId, radius:r.radius, satellite:r.satellite, threshold:r.threshold, cooldownHours:r.cooldownHours };
    const old = previous.find(p => p.id === r.id);
    const unchanged = old && Object.entries(fields).every(([k,v]) => old[k as keyof AlertRule] === v);
    return { ...fields, revision: unchanged ? old.revision : crypto.randomUUID(), createdAt: unchanged ? old.createdAt : now } as AlertRule;
  });
}
export function evaluateRule(rule: AlertRule, before: AlertState | null, input: { now: number; environment: EnvironmentCache; checks: HealthCheck[]; fires: FireArchivePacket[] }) {
  const { now } = input, place = PLACES.find(p => p.id === rule.placeId)!;
  const state: AlertState = before ? { ...before, counts:{...before.counts}, pendingCounts:{...before.pendingCounts}, evaluatedAt:now } : { evaluatedAt:now, lastAlertAt:null, high:false, counts:{}, pending:0, pendingCounts:{}, condition:"" };
  let title = "", detail = "", dataTime: number | null = null, evidence = "", due = false;
  if (rule.kind === "fire") {
    // Compare each contributor with its high-water mark. Missing files, reduced counts,
    // rolling windows and midnight changes must never create a false increase.
    const earliest = localDay(now - 86400);
    state.pendingCounts = Object.fromEntries(Object.entries(state.pendingCounts).filter(([day]) => day >= earliest));
    for (const file of input.fires) for (const part of file.parts) {
      if (part.placeId !== rule.placeId || part.radius !== rule.radius || part.day < earliest || part.day > localDay(now)) continue;
      const key = file.dayUtc + "|" + part.day, count = part.counts[rule.satellite] ?? 0;
      const baseline = state.counts[key];
      const delta = baseline !== undefined ? Math.max(0,count-baseline) : before && Date.parse(file.dayUtc + "T00:00:00Z") / 1000 >= rule.createdAt ? count : 0;
      if (delta > 0) state.pendingCounts[part.day] = (state.pendingCounts[part.day] ?? 0) + delta;
      state.counts[key] = Math.max(baseline ?? 0,count);
      if (file.last !== null) dataTime = Math.max(dataTime ?? 0,file.last);
    }
    state.counts = Object.fromEntries(Object.entries(state.counts).filter(([key]) => key.split("|")[1] >= earliest));
    state.pending = Object.values(state.pendingCounts).reduce((sum,count) => sum+count,0);
    due = !!before && state.pending >= rule.threshold;
    evidence = JSON.stringify(state.counts);
    title = `${place.name}: ${state.pending} detecções incorporadas ao arquivo`;
    detail = `Raio ${rule.radius} km; ${rule.satellite === "all" ? "todos os satélites" : rule.satellite}. Aumento acumulado desde a base ou o último aviso, nos arquivos de hoje e ontem (UTC−3). Pode incluir publicações atrasadas e observações repetidas do mesmo incêndio. Cobertura recente parcial; não é confirmação de novos incêndios.`;
  } else if (rule.kind === "air") {
    const location=input.environment.air?.locations.find(l=>l.placeId===rule.placeId);
    const point = nearestAir(location?.points ?? [],now);
    const fresh = point && Math.abs(now-point.time) <= 7200 && input.environment.air && !input.environment.air.failures?.[rule.placeId] && now-(location?.collectedAt??input.environment.air.collectedAt) <= 7200;
    if (!fresh || point.pm25 === null) return { state, event:null };
    const high = point.pm25 >= rule.threshold;
    due = high && (!before || !before.high);
    state.high = high; dataTime = point.time; evidence = String(point.time);
    title = `${place.name}: PM2,5 do modelo acima do limite`;
    detail = `CAMS / Open-Meteo: ${display(point.pm25)} µg/m³; limite configurado ${display(rule.threshold)} µg/m³. Referência na sede, não leitura de sensor nem limite legal. Um novo aviso depende de retorno abaixo do limite e nova ultrapassagem.`;
  } else {
    const issues = SOURCE_CATALOG.filter(s => s.automatic).flatMap(s => {
      const latest = input.checks.filter(c => c.sourceId === s.id).sort((a,b) => b.checkedAt-a.checkedAt)[0];
      if (!latest) return [{id:s.id,name:s.name,reason:"sem registro de coleta"}];
      if (latest.status === "unavailable") return [{id:s.id,name:s.name,reason:latest.detail}];
      return now-latest.checkedAt > rule.threshold*3600 ? [{id:s.id,name:s.name,reason:`última consulta há ${display((now-latest.checkedAt)/3600)} h`}] : [];
    });
    const condition = issues.map(s => s.id).sort().join("|");
    due = !!condition && (!before || before.condition !== condition);
    state.condition = condition; evidence = condition + "|" + (before?.evaluatedAt ?? now);
    title = `${issues.length} fontes com falha ou coleta atrasada`;
    detail = issues.map(s => `${s.name}: ${s.reason}`).join("; ").slice(0,3000) + `. Atraso configurado: ${display(rule.threshold)} h. Fontes com resultado vazio e índices parciais não são falhas; os quatro canais externos não entram nesta regra. Avaliação na próxima execução da coleta ou ao abrir o painel.`;
  }
  if (!due || (state.lastAlertAt !== null && now-state.lastAlertAt < rule.cooldownHours*3600)) {
    // A threshold crossing during cooldown remains pending until it can be shown.
    if (due && rule.kind === "air") state.high = false;
    if (due && rule.kind === "collection") state.condition = before?.condition ?? "";
    return { state,event:null };
  }
  state.lastAlertAt = now; if (rule.kind === "fire") {state.pending=0;state.pendingCounts={};}
  return { state,event:{ ruleId:rule.id,createdAt:now,kind:rule.kind,title,detail,dataTime,readAt:null,evidence } };
}
