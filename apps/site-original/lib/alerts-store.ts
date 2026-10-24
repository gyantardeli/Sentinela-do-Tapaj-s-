import { env } from "cloudflare:workers";
import { readEnvironmentCache } from "./environment-store";
import { evaluateRule, validateRules, type AlertConfig, type AlertData, type AlertEvent, type AlertState } from "./alerts";
import type { FireArchivePacket, HealthCheck } from "./monitoring";
function db() { if (!env.DB) throw new Error("Alertas indisponíveis."); return env.DB; }
export async function alertConfig(): Promise<AlertConfig> {
  const row = await db().prepare("SELECT value FROM radar_settings WHERE key=?").bind("alerts:config").first<{value:string}>();
  return row ? JSON.parse(row.value) : { version:"initial",rules:[] };
}
export async function saveAlertConfig(input: {version:unknown;rules:unknown},now:number) {
  const old = await alertConfig();
  if (input.version !== old.version) throw new Error("A configuração mudou em outra aba. Atualize antes de salvar.");
  const value: AlertConfig = {version:crypto.randomUUID(),rules:validateRules(input.rules,old.rules,now)};
  const result = old.version === "initial"
    ? await db().prepare("INSERT OR IGNORE INTO radar_settings (key,value,updated_at) VALUES (?,?,?)").bind("alerts:config",JSON.stringify(value),now).run()
    : await db().prepare("UPDATE radar_settings SET value=?,updated_at=? WHERE key=? AND json_extract(value,'$.version')=?").bind(JSON.stringify(value),now,"alerts:config",old.version).run();
  if (!result.meta.changes) throw new Error("A configuração mudou. Atualize e tente novamente.");
  return value;
}
export async function evaluateAlerts(now = Math.floor(Date.now()/1000)) {
  const config = await alertConfig(), rules = config.rules.filter(r => r.enabled);
  if (!rules.length) return { evaluatedAt:now,enabled:0,created:0 };
  const [environment,files,checks] = await Promise.all([
    readEnvironmentCache(),
    db().prepare("SELECT value FROM fire_archive_days WHERE day_utc >= ? ORDER BY day_utc").bind(new Date((now-3*86400)*1000).toISOString().slice(0,10)).all<{value:string}>(),
    db().prepare("SELECT h.value FROM source_health_history h JOIN (SELECT source_id,MAX(checked_at) AS checked_at FROM source_health_history GROUP BY source_id) last ON h.source_id=last.source_id AND h.checked_at=last.checked_at").all<{value:string}>(),
  ]);
  const input={now,environment,fires:files.results.map(r=>JSON.parse(r.value) as FireArchivePacket),checks:checks.results.map(r=>JSON.parse(r.value) as HealthCheck)};
  let created=0;
  for(const rule of rules) {
    const key="alerts:state:"+rule.id+":"+rule.revision;
    const row=await db().prepare("SELECT value FROM radar_settings WHERE key=?").bind(key).first<{value:string}>();
    const before:AlertState|null=row ? JSON.parse(row.value):null;
    if(before && now<=before.evaluatedAt)continue;
    const result=evaluateRule(rule,before,input);
    let event:AlertEvent|null=null;
    if(result.event){const bytes=new TextEncoder().encode(rule.revision+"|"+result.event.evidence);const id=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(n=>n.toString(16).padStart(2,"0")).join("");const {evidence,...value}=result.event;event={...value,id};}
    // A single batch and optimistic state guard prevent duplicate evaluations in concurrent tabs/runs.
    const change=db().prepare("INSERT INTO radar_settings (key,value,updated_at) SELECT ?,?,? WHERE (SELECT json_extract(value,'$.version') FROM radar_settings WHERE key='alerts:config')=? ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE radar_settings.value=?").bind(key,JSON.stringify(result.state),now,config.version,row?.value??"");
    if(event) {
      const statement=db().prepare("INSERT OR IGNORE INTO alert_events (id,rule_id,created_at,value,read_at) SELECT ?,?,?,?,NULL WHERE (SELECT value FROM radar_settings WHERE key=?)=?").bind(event.id,event.ruleId,event.createdAt,JSON.stringify(event),key,JSON.stringify(result.state));
      const saved=await db().batch([change,statement]);created+=saved[1].meta.changes??0;
    }else await change.run();
  }
  await db().batch([db().prepare("DELETE FROM alert_events WHERE created_at < ?").bind(now-30*86400),db().prepare("INSERT INTO radar_settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind("alerts:evaluated",JSON.stringify({at:now}),now)]);
  return {evaluatedAt:now,enabled:rules.length,created};
}
export async function readAlerts():Promise<AlertData> {
  const now=Math.floor(Date.now()/1000);
  const [config,events,last]=await Promise.all([alertConfig(),db().prepare("SELECT value,read_at FROM alert_events WHERE created_at >= ? ORDER BY created_at DESC LIMIT 100").bind(now-30*86400).all<{value:string;read_at:number|null}>(),db().prepare("SELECT value FROM radar_settings WHERE key=?").bind("alerts:evaluated").first<{value:string}>()]);
  return {now,config,events:events.results.map(r=>({...JSON.parse(r.value),readAt:r.read_at})),evaluatedAt:last?JSON.parse(last.value).at:null};
}
export async function markAlertsRead(now:number) { await db().prepare("UPDATE alert_events SET read_at=? WHERE read_at IS NULL AND created_at <= ?").bind(now,now).run(); }
