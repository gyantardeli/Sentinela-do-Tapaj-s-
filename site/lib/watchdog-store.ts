import { env } from "cloudflare:workers";
import { SOURCE_CATALOG, type HealthCheck } from "./monitoring";
import { collectionIssues, type MonitorTarget, type WatchdogCheck, type WatchdogData } from "./watchdog";
import type { AlertEvent } from "./alerts";
function db(){if(!env.DB)throw new Error("Monitor indisponível.");return env.DB;}
export async function runWatchdog(mode:WatchdogCheck["mode"],now=Math.floor(Date.now()/1000)){
  const [run,settings,rows,prior]=await Promise.all([
    db().prepare("SELECT id,completed_at FROM radar_runs ORDER BY completed_at DESC LIMIT 1").first<{id:string;completed_at:number}>(),
    db().prepare("SELECT key,value FROM radar_settings WHERE key IN (?,?)").bind("environment:air","environment:weather").all<{key:string;value:string}>(),
    db().prepare("SELECT h.value FROM source_health_history h JOIN (SELECT source_id,MAX(checked_at) AS checked_at FROM source_health_history GROUP BY source_id) last ON h.source_id=last.source_id AND h.checked_at=last.checked_at").all<{value:string}>(),
    db().prepare("SELECT value FROM radar_settings WHERE key=?").bind("watchdog:condition").first<{value:string}>(),
  ]);
  const checks:HealthCheck[]=rows.results.map(r=>JSON.parse(r.value)),values=new Map(settings.results.map(r=>[r.key,JSON.parse(r.value)]));
  const targets:MonitorTarget[]=[{id:"radar-run",name:"Coleta das 20 fontes",lastAt:run?.completed_at??null,failure:null}];
  for(const id of ["air","weather","inpe"]){const check=checks.find(c=>c.sourceId===id),cache=values.get("environment:"+id);targets.push({id,name:SOURCE_CATALOG.find(s=>s.id===id)!.name,lastAt:id==="inpe"?check?.checkedAt??null:cache?.collectedAt??null,failure:check?.status==="unavailable"?check.detail:null});}
  for(const source of SOURCE_CATALOG.filter(s=>s.id.startsWith("radar:"))){const c=checks.find(v=>v.sourceId===source.id);targets.push({id:source.id,name:source.name,lastAt:c?.checkedAt??null,failure:c?.status==="unavailable"?c.detail:null});}
  const issues=collectionIssues(targets,now),condition=issues.map(i=>i.id).sort().join("|"),before=prior?JSON.parse(prior.value) as {condition:string;at:number}:null;
  const check:WatchdogCheck={id:crypto.randomUUID(),checkedAt:now,mode,status:issues.length?"attention":"ok",targets,issues,radarRunId:run?.id??null};
  const state=JSON.stringify({condition,at:now});
  const statements=[db().prepare("INSERT INTO watchdog_checks (id,checked_at,mode,value) VALUES (?,?,?,?)").bind(check.id,now,mode,JSON.stringify(check)),db().prepare("INSERT INTO radar_settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE radar_settings.value=? AND radar_settings.updated_at<=excluded.updated_at").bind("watchdog:condition",state,now,prior?.value??"")];
  if(condition!==(before?.condition??"")&&(!before||now>=before.at)){
    const event:AlertEvent={id:"watchdog-"+check.id,ruleId:"system-watchdog",createdAt:now,kind:"collection",title:issues.length?`Monitor da coleta: ${issues.length} pendências`:"Monitor da coleta: atualização recuperada",detail:issues.length?issues.map(i=>`${i.name}: ${i.reason}`).join("; ").slice(0,3400):"As coletas voltaram a responder dentro do limite de 90 min. A cobertura parcial e os índices de notícias continuam com seus limites próprios.",dataTime:run?.completed_at??null,readAt:null};
    statements.push(db().prepare("INSERT OR IGNORE INTO alert_events (id,rule_id,created_at,value,read_at) SELECT ?,?,?,?,NULL WHERE (SELECT value FROM radar_settings WHERE key=?)=?").bind(event.id,event.ruleId,now,JSON.stringify(event),"watchdog:condition",state));
  }
  statements.push(db().prepare("DELETE FROM watchdog_checks WHERE checked_at < ?").bind(now-30*86400),db().prepare("DELETE FROM alert_events WHERE created_at < ?").bind(now-30*86400));
  await db().batch(statements);
  return check;
}
export async function readWatchdog(now=Math.floor(Date.now()/1000)):Promise<WatchdogData>{
  const [latest,independent,recent,schedule]=await Promise.all([
    db().prepare("SELECT value FROM watchdog_checks ORDER BY checked_at DESC LIMIT 1").first<{value:string}>(),
    db().prepare("SELECT value FROM watchdog_checks WHERE mode=? ORDER BY checked_at DESC LIMIT 1").bind("independent").first<{value:string}>(),
    db().prepare("SELECT value FROM watchdog_checks ORDER BY checked_at DESC LIMIT 48").all<{value:string}>(),
    db().prepare("SELECT value FROM radar_settings WHERE key=?").bind("watchdog:schedule").first<{value:string}>(),
  ]);
  const last=independent?JSON.parse(independent.value) as WatchdogCheck:null;
  return {now,latest:latest?JSON.parse(latest.value):null,independent:last,overdue:!last||now-last.checkedAt>90*60,checks:recent.results.map(r=>JSON.parse(r.value)),schedule:schedule?JSON.parse(schedule.value):null};
}
export async function saveWatchdogSchedule(value:unknown){const s=value as Record<string,unknown>;if(!s||typeof s.id!=="string"||s.id.length>100||typeof s.enabled!=="boolean"||typeof s.cadence!=="string"||s.cadence.length>150||s.timezone!=="America/Bahia")throw new Error("Metadados do monitor inválidos.");await db().prepare("INSERT INTO radar_settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind("watchdog:schedule",JSON.stringify({id:s.id,enabled:s.enabled,cadence:s.cadence,timezone:s.timezone}),Math.floor(Date.now()/1000)).run();}
