export const WATCHDOG_REVISION="watchdog-v1";
export const COLLECTION_LIMIT_SECONDS=90*60;
export type MonitorTarget={id:string;name:string;lastAt:number|null;failure:string|null};
export type WatchdogCheck={id:string;checkedAt:number;mode:"independent"|"manual";status:"ok"|"attention";targets:MonitorTarget[];issues:{id:string;name:string;reason:string}[];radarRunId:string|null};
export type WatchdogData={now:number;latest:WatchdogCheck|null;independent:WatchdogCheck|null;overdue:boolean;checks:WatchdogCheck[];schedule:{id:string;enabled:boolean;cadence:string;timezone:string}|null;error?:string};
export function collectionIssues(targets:MonitorTarget[],now:number){return targets.flatMap(t=>{let reason="";if(t.failure)reason=t.failure;else if(t.lastAt===null)reason="Sem registro de coleta.";else if(t.lastAt>now+300)reason="Horário de coleta inválido, no futuro.";else if(now-t.lastAt>COLLECTION_LIMIT_SECONDS)reason=`Última coleta há ${Math.floor((now-t.lastAt)/60)} min; limite de 90 min.`;return reason?[{id:t.id,name:t.name,reason}]:[];});}
