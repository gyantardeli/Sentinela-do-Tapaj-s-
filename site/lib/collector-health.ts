import { PLACES } from "./environment";
import { municipalState } from "./environment-merge";
import type { EnvironmentCache, AirLocation, WeatherLocation } from "./environment-provider";
import type { RadarData } from "./radar-core";
import type { HealthCheck } from "./monitoring";
import { RADAR_SOURCES } from "./radar-sources";
import { fireDiagnostics,fireDiagnosticText,type FireSnapshot } from "./fire-snapshot";
export function collectorHealth(environment:EnvironmentCache,radar:RadarData,now:number,inpe:HealthCheck|null=null,snapshot:FireSnapshot|null=null) {
  const layers=Object.fromEntries((["air","weather"] as const).map(kind=>{const part=environment[kind],municipalities=PLACES.map(p=>{const s=municipalState<AirLocation|WeatherLocation>(part,p.id,now);return {id:p.id,status:s.status,observedAt:s.observedAt,collectedAt:s.collectedAt,stale:s.stale,error:s.error};});return [kind,{collectedAt:part?.collectedAt||null,attemptedAt:part?.attemptedAt??part?.collectedAt??null,status:municipalities.every(m=>m.status==="ok")?"ok":municipalities.every(m=>m.status==="unavailable")?"unavailable":"partial",municipalities}];}));
  const sources=RADAR_SOURCES.map(source=>{const c=radar.sources.find(c=>c.sourceId===source.id);return {id:source.id,name:source.name,status:c?.status??"not_checked",checkedAt:c?.checkedAt??null,lastOkAt:c?.lastOkAt??null,stale:!c||now-c.checkedAt>4*3600||c.checkedAt>now+300,methods:c?.methods??[]};});
  return {version:"2.3.0-preview",now,lastRunAt:radar.run?.completedAt??null,sourcesTotal:sources.length,directRSS:sources.filter(s=>!s.stale&&s.status==="ok"&&s.methods.includes("rss")).length,partialIndex:sources.filter(s=>!s.stale&&s.status==="indexed").length,staleSources:sources.filter(s=>s.stale&&s.checkedAt!==null).length,notChecked:sources.filter(s=>s.checkedAt===null).length,layers:{...layers,inpe:snapshot?{...fireDiagnostics(snapshot,now),detail:fireDiagnosticText(snapshot,now)}:{status:inpe?.status??"not_checked",checkedAt:inpe?.checkedAt??null,observedAt:inpe?.dataTime??null,stale:!inpe||now-inpe.checkedAt>5400||inpe.checkedAt>now+300,detail:inpe?.detail??"INPE ainda não consultado pelo coletor central."}},sources};
}
