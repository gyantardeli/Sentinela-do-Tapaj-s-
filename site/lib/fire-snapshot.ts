import { deduplicateFires, type Fire } from "./environment";
import { collectFires, mergeFireCollections, previousFires, type FileFailure, type FireCollection, type FireFile } from "./fire-collector";
import { sourceErrorKind, type SourceFetcher } from "./source-http";

export const FIRE_REVISION = "inpe-snapshot-v1";
export type FirePacket = { revision: string; attemptedAt: number; collection: FireCollection | null; failures: FileFailure[]; errorKind: string | null; message: string | null };
export type FireSnapshot = FirePacket;
export function validFire(f: Fire, now: number) {
  return !!f && Number.isInteger(f.time) && f.time >= now-86400 && f.time <= now && Number.isFinite(f.lat) && Math.abs(f.lat)<=90 && Number.isFinite(f.lon) && Math.abs(f.lon)<=180 && typeof f.satellite==="string" && f.satellite.trim().length>0;
}
export async function collectFirePacket(now: number, fetcher: SourceFetcher = fetch): Promise<FirePacket> {
  try {
    const collection = await collectFires(now,fetcher);
    return {revision:FIRE_REVISION,attemptedAt:now,collection,failures:collection.failures??[],errorKind:null,message:null};
  } catch(error) {
    const failures=(error as {files?:FileFailure[]})?.files??[];
    return {revision:FIRE_REVISION,attemptedAt:now,collection:null,failures,errorKind:failures[0]?.kind??sourceErrorKind(error),message:error instanceof Error?error.message.slice(0,800):"Consulta INPE indisponível."};
  }
}
export function validateFirePacket(input: unknown, now: number): FirePacket {
  if(!input||typeof input!=="object")throw new Error("Pacote INPE inválido.");
  const v=input as FirePacket, text=(s:unknown,n:number)=>typeof s==="string"&&s.length<=n;
  if(v.revision!==FIRE_REVISION||!Number.isInteger(v.attemptedAt)||v.attemptedAt<now-7200||v.attemptedAt>now+300)throw new Error("Revisão ou horário INPE inválido.");
  const failures=(values:unknown):FileFailure[]=>{
    if(!Array.isArray(values)||values.length>12)throw new Error("Falhas INPE inválidas.");
    return values.map(f=>{if(!f||!text(f.file,100)||!text(f.kind,60)||!text(f.detail,200))throw new Error("Diagnóstico INPE inválido.");return {file:f.file,kind:f.kind,detail:f.detail};});
  };
  const errors=failures(v.failures);
  if(v.collection===null){if(!text(v.errorKind,60)||!text(v.message,800))throw new Error("Causa INPE ausente.");return {revision:FIRE_REVISION,attemptedAt:v.attemptedAt,collection:null,failures:errors,errorKind:v.errorKind,message:v.message};}
  const c=v.collection;
  if(!c||c.checkedAt!==v.attemptedAt||!Number.isInteger(c.last)||c.last<0||c.last>v.attemptedAt||!c.coverage||c.coverage.start!==v.attemptedAt-86400||c.coverage.end!==c.last||typeof c.coverage.complete!=="boolean"||typeof c.dailyComplete!=="boolean"||!text(c.detail,1000)||!Array.isArray(c.fires)||c.fires.length>30000)throw new Error("Snapshot INPE inválido.");
  if(!Array.isArray(c.files)||!c.files.length||c.files.length>8)throw new Error("Arquivos INPE ausentes.");
  const dates=[0,1].map(i=>new Date((v.attemptedAt-i*86400)*1000).toISOString().slice(0,10).replaceAll("-",""));
  const fileNames=new Set<string>();
  const files:FireFile[]=c.files.map(f=>{
    if(!f||!text(f.file,100)||fileNames.has(f.file)||!(/^(focos_diario_br_\d{8}|focos_10min_\d{8}_\d{4})\.csv$/.test(f.file))||!Number.isInteger(f.rows)||f.rows<0||f.rows>1000000||!Number.isInteger(f.last)||f.last<0||f.last>v.attemptedAt||!Number.isInteger(f.rejected)||f.rejected<0)throw new Error("Arquivo INPE inválido.");
    fileNames.add(f.file);return {file:f.file,rows:f.rows,last:f.last,rejected:f.rejected};
  });
  const daily=files.filter(f=>dates.some(d=>f.file==="focos_diario_br_"+d+".csv"));
  if(!daily.length||c.dailyComplete!==(daily.length===2&&daily.every(f=>f.rejected===0))||c.coverage.complete&&(!c.dailyComplete||!c.last||v.attemptedAt-c.last>7200))throw new Error("Cobertura INPE inconsistente.");
  const points=c.fires.map((f):Fire=>{
    if(!validFire(f,v.attemptedAt)||!text(f.satellite,60)||f.id!==[f.lat.toFixed(5),f.lon.toFixed(5),f.time,f.satellite].join("|")||f.source!=="INPE")throw new Error("Detecção INPE inválida.");
    const point:Fire={id:f.id,lat:f.lat,lon:f.lon,time:f.time,satellite:f.satellite,source:"INPE",frp:null};
    for(const key of ["frp","droughtDays","precipitation","risk"] as const){const value=f[key];if(value!=null&&(typeof value!=="number"||!Number.isFinite(value)||value<0||key==="risk"&&value>1))throw new Error("Atributo INPE inválido.");if(value!==undefined)point[key]=value;}
    for(const key of ["municipality","state","biome"] as const){const value=f[key];if(value!=null&&!text(value,150))throw new Error("Local INPE inválido.");if(value!==undefined)point[key]=value;}
    return point;
  });
  return {revision:FIRE_REVISION,attemptedAt:v.attemptedAt,collection:{fires:deduplicateFires(points).sort((a,b)=>b.time-a.time),checkedAt:c.checkedAt,last:c.last,coverage:{...c.coverage},detail:c.detail,files,dailyComplete:c.dailyComplete,failures:errors,recovered:0},failures:errors,errorKind:null,message:null};
}
export function mergeFireSnapshot(prior: FireSnapshot|null, packet: FirePacket): FireSnapshot {
  if(prior&&prior.attemptedAt>=packet.attemptedAt)return prior;
  const collection=packet.collection?mergeFireCollections(prior?.collection??null,packet.collection,packet.attemptedAt):prior?.collection?previousFires(prior.collection,packet.attemptedAt):null;
  return {...packet,collection};
}
export function fireDiagnostics(state: FireSnapshot|null, now:number) {
  const c=state?.collection,points=c?.fires.filter(f=>validFire(f,now))??[],stale=!!c&&(now-c.checkedAt>7200||c.checkedAt>now+300),usingCache=!!c&&!!state?.errorKind;
  const partial=!c?.coverage.complete||usingCache||stale,failures=state?.failures??[];
  const status=!c?"unavailable":usingCache||stale||partial?"partial":"ok";
  return {status,estado:!state?"nao_consultado":!c?"sem_dados":stale?"defasado":usingCache?"cache_anterior":partial?"parcial":"atual",checkedAt:state?.attemptedAt??null,observedAt:c?.last||null,stale,arquivos:c?.files??[],errosParciais:state?.errorKind?[]:failures,falhasUltimaTentativa:failures,recuperadosCache:c?.recovered??0,totalFocosEmCache:c?points.length:null,ultimaAtualizacao:c?.checkedAt??null,ultimaTentativa:state?.attemptedAt??null,tipoErro:state?.errorKind??(failures.length?failures[0].kind:null),mensagem:state?.message??(failures.length?failures.map(f=>f.file+": "+f.detail).join("; "):null),usandoCache:usingCache,parcial:partial,limiteInferior:partial,ultimoFoco:points.length?points[0].time:null,janelaHoras:24};
}
export function fireDiagnosticText(state:FireSnapshot|null,now:number) {
  const d=fireDiagnostics(state,now),iso=(n:number|null)=>n===null?"sem registro":new Date(n*1000).toISOString();
  return `INPE: ${d.estado}. Última atualização: ${iso(d.ultimaAtualizacao)}. Última tentativa: ${iso(d.ultimaTentativa)}. Focos em cache (24 h): ${d.totalFocosEmCache??"indisponível"}; recuperados: ${d.recuperadosCache}. `+
    `Arquivos: ${d.arquivos.map(f=>f.file+" ("+f.rows+" detecções regionais, "+f.rejected+" rejeitadas)").join(", ")||"nenhum"}. `+
    (d.falhasUltimaTentativa.length?"Falhas da última tentativa: "+d.falhasUltimaTentativa.map(f=>f.file+": "+f.kind+" · "+f.detail).join("; ")+". ":"")+
    (d.mensagem?"Causa: "+d.mensagem+". ":"")+(d.limiteInferior?"Cobertura parcial; a contagem é um limite inferior e zero não confirma ausência de focos.":"Arquivos diários recebidos; detecções sujeitas ao atraso dos satélites.");
}
export function fireView(state:FireSnapshot,now:number):FireCollection|null {
  if(!state.collection)return null;
  const d=fireDiagnostics(state,now);
  return {...state.collection,fires:state.collection.fires.filter(f=>validFire(f,now)),coverage:{...state.collection.coverage,start:now-86400,complete:!d.parcial},failures:state.failures,detail:fireDiagnosticText(state,now)};
}
