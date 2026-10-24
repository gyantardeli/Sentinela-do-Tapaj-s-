import { env } from "cloudflare:workers";
import { FIRE_REVISION, mergeFireSnapshot, fireDiagnostics, fireDiagnosticText, type FirePacket, type FireSnapshot } from "./fire-snapshot";
import type { Fire } from "./environment";

// New namespaced keys only. Existing tables, keys, archives and alert data stay intact.
const KEY="environment:inpe",PREFIX=KEY+":chunk:";
type Manifest=FireSnapshot&{chunks:string[]};
function db(){if(!env.DB)throw new Error("Armazenamento INPE indisponível.");return env.DB;}
async function readStored():Promise<{raw:string|null;manifest:Manifest|null;state:FireSnapshot|null}> {
  for(let retry=0;retry<3;retry++){
    const row=await db().prepare("SELECT value FROM radar_settings WHERE key=?").bind(KEY).first<{value:string}>();
    if(!row)return {raw:null,manifest:null,state:null};
    const m=JSON.parse(row.value) as Manifest;
    if(m.revision!==FIRE_REVISION||!Number.isInteger(m.attemptedAt)||!Array.isArray(m.chunks)||m.chunks.length>90||m.chunks.some(k=>typeof k!=="string"||!k.startsWith(PREFIX))||new Set(m.chunks).size!==m.chunks.length||m.collection&&!Array.isArray(m.collection.fires))throw new Error("Snapshot INPE armazenado inválido.");
    const rows=m.chunks.length?await db().prepare("SELECT key,value FROM radar_settings WHERE key IN ("+m.chunks.map(()=>"?").join(",")+")").bind(...m.chunks).all<{key:string;value:string}>():{results:[]};
    if(rows.results.length!==m.chunks.length)continue; // A newer atomic snapshot retired these chunks; re-read the pointer.
    const byKey=new Map(rows.results.map(r=>[r.key,r.value])),fires=m.chunks.flatMap(k=>JSON.parse(byKey.get(k)!) as Fire[]);
    return {raw:row.value,manifest:m,state:{...m,collection:m.collection?{...m.collection,fires}:null}};
  }
  throw new Error("O snapshot INPE mudou durante a leitura. Tente novamente.");
}
export async function readFireSnapshot():Promise<FireSnapshot|null>{if(!env.DB)return null;return (await readStored()).state;}
function splitPoints(points:Fire[]){
  const result:string[]=[];let chunk:string[]=[],size=2;
  for(const point of points){const value=JSON.stringify(point),bytes=new TextEncoder().encode(value).byteLength+1;if(chunk.length&&size+bytes>180000){result.push("["+chunk.join(",")+"]");chunk=[];size=2;}chunk.push(value);size+=bytes;}
  if(chunk.length)result.push("["+chunk.join(",")+"]");
  if(result.length>90)throw new Error("Snapshot INPE excede o limite de armazenamento; a cópia anterior foi preservada.");
  return result;
}
export async function saveFireSnapshot(packet:FirePacket){
  const connection=db();
  for(let retry=0;retry<3;retry++){
    const before=await readStored();
    if(before.state&&before.state.attemptedAt>=packet.attemptedAt)return {accepted:false,state:before.state};
    const state=mergeFireSnapshot(before.state,packet),values=splitPoints(state.collection?.fires??[]),version=crypto.randomUUID(),keys=values.map((_,i)=>PREFIX+version+":"+i);
    const manifest:Manifest={...state,collection:state.collection?{...state.collection,fires:[]}:null,chunks:keys},value=JSON.stringify(manifest),expected=before.raw??"";
    const statements=values.map((v,i)=>connection.prepare("INSERT INTO radar_settings (key,value,updated_at) SELECT ?,?,? WHERE COALESCE((SELECT value FROM radar_settings WHERE key=?),'')=?").bind(keys[i],v,packet.attemptedAt,KEY,expected));
    statements.push(connection.prepare("INSERT INTO radar_settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE radar_settings.value=?").bind(KEY,value,packet.attemptedAt,expected));
    const diagnostic=fireDiagnostics(state,packet.attemptedAt),check={sourceId:"inpe",checkedAt:packet.attemptedAt,status:state.errorKind?"unavailable":diagnostic.status,detail:fireDiagnosticText(state,packet.attemptedAt),dataTime:diagnostic.observedAt,method:"CSV diários oficiais GMT/UTC + 10 min",accepted:state.errorKind?0:state.collection?.fires.length??0,diagnostics:diagnostic};
    statements.push(connection.prepare("INSERT INTO source_health_history (source_id,checked_at,value) SELECT ?,?,? WHERE (SELECT value FROM radar_settings WHERE key=?)=? ON CONFLICT(source_id,checked_at) DO UPDATE SET value=excluded.value").bind("inpe",packet.attemptedAt,JSON.stringify(check),KEY,value));
    if(before.manifest?.chunks.length)statements.push(connection.prepare("DELETE FROM radar_settings WHERE key IN ("+before.manifest.chunks.map(()=>"?").join(",")+") AND (SELECT value FROM radar_settings WHERE key=?)=?").bind(...before.manifest.chunks,KEY,value));
    await connection.batch(statements); // Chunk set, pointer and health change together, or none do.
    const after=await readStored();
    if(after.raw===value)return {accepted:true,state:after.state!};
    if(after.state&&after.state.attemptedAt>=packet.attemptedAt)return {accepted:false,state:after.state};
  }
  throw new Error("A gravação INPE concorreu com outra coleta. O último snapshot foi preservado.");
}
