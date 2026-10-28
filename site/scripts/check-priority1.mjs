import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {harness,plain} from './priority1-harness.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinela-p1-')),filename=path.join(root,'preview.sqlite'),h=harness(filename);
let now=Math.floor(Date.now()/1000),load=h.loader(undefined,()=>now*1000),store=load('./lib/fire-store'),protocol=load('./lib/fire-snapshot'),collector=load('./lib/fire-collector');
const base=now,passed=[],header='lat,lon,data_hora_gmt,satelite,frp,risco_fogo,municipio',csv=(time,lat=-4.2761)=>header+`\n${lat},-55.9836,${new Date(time*1000).toISOString()},NPP-375,23,0.7,Itaituba\n`;
const day=time=>new Date(time*1000).toISOString().slice(0,10).replaceAll('-','');
const fetchCSV=(time,failed=null,text=csv(time-120))=>async url=>url.endsWith('10min/')?new Response('',{status:404}):failed&&url.includes(day(time-86400))?new Response('failed',{status:failed}):new Response(text);
async function packet(time,failed=null,text){return protocol.validateFirePacket(await protocol.collectFirePacket(time,fetchCSV(time,failed,text)),time);}
async function check(name,fn){await fn();passed.push(name);console.log('PASS '+name);}
const rawDB=()=>h.sql.prepare('SELECT key,value,updated_at FROM radar_settings ORDER BY key').all();
await check('Daily CSV validation, UTC, partial 404 and explicit successful files',async()=>{
  const p=await packet(now,404);assert.equal(p.collection.dailyComplete,false);assert.equal(p.collection.files.length,1);assert.equal(p.collection.fires[0].time,now-120);assert(p.failures.some(f=>f.detail==='HTTP 404'));
  const invalid=await protocol.collectFirePacket(now,async()=>new Response('<html>error</html>'));assert.equal(invalid.collection,null);assert(invalid.failures.some(f=>f.kind==='resposta_invalida'));
  const limit=await protocol.collectFirePacket(now,async()=>new Response('',{status:429,headers:{'Retry-After':'60'}}));assert.equal(limit.errorKind,'limite_de_requisicoes');assert(limit.failures.every(f=>/429/.test(f.detail)));
});
await check('Both daily failures preserve prior snapshot even if a ten-minute file responds',async()=>{
  const p=await protocol.collectFirePacket(now,async url=>url.endsWith('10min/')?new Response('<a href="focos_10min_'+day(now)+'_1200.csv">csv</a>'):url.includes('focos_10min')?new Response(csv(now-60)):new Response('',{status:404}));assert.equal(p.collection,null);assert(p.failures.filter(f=>f.file.includes('diario')).length===2);
});
await check('Durable D1 snapshot survives complete backend restart; existing keys stay byte-identical',async()=>{
  for(const [key,value]of [['environment:air','{"original":true}'],['environment:weather','{"original":true}'],['alerts:config','{"version":"initial","rules":[]}'],['areas:test','{"vertices":[1,2,3]}']])h.sql.prepare('INSERT INTO radar_settings VALUES (?,?,?)').run(key,value,now);
  const baseline=rawDB();const p=await packet(now);await store.saveFireSnapshot(p);h.sql.close();
  const restarted=harness(filename);h.sql=restarted.sql;h.DB=restarted.DB;h.hooks=restarted.hooks;h.loader=restarted.loader;load=h.loader(undefined,()=>now*1000);store=load('./lib/fire-store');protocol=load('./lib/fire-snapshot');collector=load('./lib/fire-collector');
  const state=await store.readFireSnapshot();assert.equal(state.collection.fires.length,1);assert.equal(state.collection.fires[0].frp,23);for(const r of baseline)assert.deepEqual(h.sql.prepare('SELECT key,value,updated_at FROM radar_settings WHERE key=?').get(r.key),r);
});
await check('Partial update merges 24h detections, deduplicates and keeps original FRP/risk',async()=>{
  now+=10;const p=await packet(now,404,csv(now-120,-4.3));p.collection.fires.push({...((await store.readFireSnapshot()).collection.fires[0]),frp:null,risk:null});await store.saveFireSnapshot(p);const s=await store.readFireSnapshot();assert.equal(s.collection.fires.length,2);assert.equal(s.collection.fires.find(f=>f.lat===-4.2761).frp,23);assert.equal(s.collection.fires.find(f=>f.lat===-4.2761).risk,0.7);
});
await check('Total failure keeps original collection time and reports cache then stale',async()=>{
  const before=await store.readFireSnapshot();now+=10;const p=await protocol.collectFirePacket(now,async()=>new Response('',{status:404}));await store.saveFireSnapshot(p);const s=await store.readFireSnapshot();assert.equal(s.collection.checkedAt,before.collection.checkedAt);assert.equal(s.collection.fires.length,2);const d=protocol.fireDiagnostics(s,now);assert.equal(d.estado,'cache_anterior');assert.equal(d.ultimaTentativa,now);assert.equal(d.tipoErro,'endereco_invalido');assert.equal(protocol.fireDiagnostics(s,now+7201).estado,'defasado');assert.equal(protocol.fireView(s,now+86401).fires.length,0);
  const health=JSON.parse(h.sql.prepare("SELECT value FROM source_health_history WHERE source_id='inpe' ORDER BY checked_at DESC LIMIT 1").get().value);assert.equal(health.status,'unavailable');assert.match(health.detail,/HTTP 404/);assert.equal(health.diagnostics.ultimaAtualizacao,before.collection.checkedAt);
});
await check('Two valid empty daily files replace old detections; coverage does not invent a confirmed zero',async()=>{
  now+=10;const p=await packet(now,null,header+'\n');assert.equal(p.collection.dailyComplete,true);assert.equal(p.collection.coverage.complete,false);await store.saveFireSnapshot(p);const s=await store.readFireSnapshot();assert.equal(s.collection.fires.length,0);assert.equal(protocol.fireDiagnostics(s,now).limiteInferior,true);
});
await check('Expired, future, invalid satellite and forged identity cannot enter the persistent writer',async()=>{
  const p=await packet(now);for(const change of [{time:now+1},{time:now-86401},{satellite:''},{id:'forged'},{lat:91}]){const bad=plain(p);Object.assign(bad.collection.fires[0],change);assert.throws(()=>protocol.validateFirePacket(bad,now));}
  const f=collector.parseInpeCsv(csv(now-120),now).fires[0],prior={...p.collection,fires:[f,{...f,time:now-86401,id:'expired'}]},fresh={...p.collection,dailyComplete:false,fires:[]};assert.equal(collector.mergeFireCollections(prior,fresh,now).fires.length,1);
});
await check('Old executions and identical replay make no writes and cannot replace a newer snapshot',async()=>{
  const rows=plain(rawDB()),changes=h.sql.prepare('SELECT total_changes() AS n').get().n;assert.equal((await store.saveFireSnapshot(await packet(base))).accepted,false);assert.equal((await store.saveFireSnapshot(await packet(now))).accepted,false);assert.deepEqual(plain(rawDB()),rows);assert.equal(h.sql.prepare('SELECT total_changes() AS n').get().n,changes);
});
await check('Concurrent partial writers retry the winning pointer without losing recovered points',async()=>{
  const middle=await packet(now+10,404,csv(now-120,-4.4)),newest=await packet(now+20,404,csv(now-120,-4.5));h.hooks.beforeBatch=()=>store.saveFireSnapshot(middle);now+=20;await store.saveFireSnapshot(newest);const s=await store.readFireSnapshot();assert(s.collection.fires.some(f=>f.lat===-4.4));assert(s.collection.fires.some(f=>f.lat===-4.5));assert.equal(s.collection.recovered,1);
});
await check('Atomic rollback preserves chunks, pointer and health on a database failure',async()=>{
  const rows=plain(rawDB()),health=h.sql.prepare('SELECT COUNT(*) AS n FROM source_health_history').get().n;h.hooks.failRun=q=>q.startsWith('INSERT INTO source_health_history');now+=10;const p=await packet(now);await assert.rejects(()=>store.saveFireSnapshot(p),/Injected D1 failure/);h.hooks.failRun=null;assert.deepEqual(plain(rawDB()),rows);assert.equal(h.sql.prepare('SELECT COUNT(*) AS n FROM source_health_history').get().n,health);
});
await check('Large snapshot is chunked; replacement reclaims chunks and a racing reader retries safely',async()=>{
  now+=10;const p=await packet(now),focus=p.collection.fires[0];p.collection.fires=Array.from({length:2400},(_,i)=>{const lat=-4+i/100000;return {...focus,lat,id:[lat.toFixed(5),focus.lon.toFixed(5),focus.time,focus.satellite].join('|')};});await store.saveFireSnapshot(p);assert(h.sql.prepare("SELECT COUNT(*) AS n FROM radar_settings WHERE key LIKE 'environment:inpe:chunk:%'").get().n>1);assert.equal((await store.readFireSnapshot()).collection.fires.length,2400);
  const replacement=await packet(now+10);h.hooks.beforeAll=async query=>{assert.match(query,/SELECT key,value/);await store.saveFireSnapshot(replacement);};now+=10;const s=await store.readFireSnapshot();assert.equal(s.attemptedAt,now);assert.equal(s.collection.fires.length,1);assert.equal(h.sql.prepare("SELECT COUNT(*) AS n FROM radar_settings WHERE key LIKE 'environment:inpe:chunk:%'").get().n,1);
});
await check('Writer rejects foreign origin, oversized streamed body and malformed data before changing storage',async()=>{
  const route=load('./app/api/fires/ingest/route'),rows=plain(rawDB());
  for(const [body,headers,status]of [['{}',{'content-type':'application/json',origin:'https://other.invalid'},403],['{}',{'content-type':'text/plain'},415],['{}',{'content-type':'application/json','content-length':'8000001'},413],['{}',{'content-type':'application/json'},400],[' '.repeat(8000001),{'content-type':'application/json'},413]]){const response=await route.POST(new Request('https://site.invalid/api/fires/ingest',{method:'POST',headers,body}));assert.equal(response.status,status);}
  assert.deepEqual(plain(rawDB()),rows);
});
await check('Health, source monitor and dashboard use the persisted snapshot with no GET writes',async()=>{
  // Clear intentionally opaque preservation sentinels, then seed valid original environmental contracts.
  h.sql.prepare("DELETE FROM radar_settings WHERE key IN ('environment:air','environment:weather')").run();
  const points=Array.from({length:24},(_,i)=>({time:now-(23-i)*3600,pm25:0,pm10:0,aqi:0})),places=load('./lib/environment').PLACES;
  await load('./lib/environment-store').saveEnvironment({revision:'environment-v1',collectedAt:now,air:places.map(p=>({placeId:p.id,points})),weather:places.map(p=>({placeId:p.id,value:{time:now,temperature:0,humidity:0,speed:0,direction:0,rain:0}})),failures:{}});
  const live=h.loader(async()=>Response.json({fields:[],data:[]}),()=>now*1000),changes=h.sql.prepare('SELECT total_changes() AS n').get().n;
  const health=await (await live('./app/api/health/route').GET()).json(),monitor=await (await live('./app/api/source-health/route').GET(new Request('https://site.invalid/api/source-health'))).json(),dashboard=await (await live('./app/api/dashboard/route').GET(new Request('https://site.invalid/api/dashboard?place=itaituba'))).json();
  assert.equal(health.layers.inpe.totalFocosEmCache,1);assert.equal(dashboard.fires.length,1);assert.equal(dashboard.fires[0].id,(await store.readFireSnapshot()).collection.fires[0].id);const last=monitor.sources.find(s=>s.id==='inpe').latest;assert.equal(last.diagnostics.ultimaTentativa,now);assert.match(last.detail,/Última atualização:.*Última tentativa:.*Arquivos:/);assert(!JSON.stringify(health.layers.inpe).includes('"fires"'));assert.equal(h.sql.prepare('SELECT total_changes() AS n').get().n,changes);
});
await check('Portable scheduled collector completes without importing a page or opening a browser',async()=>{
  const isolated=harness(path.join(root,'scheduled.sqlite')),attempt=Math.floor(Date.now()/1000),apiRequests=[];let runAt=attempt,failINPE=false;
  const modelAir=()=>Array.from({length:8},()=>({hourly_units:{pm2_5:'μg/m³'},hourly:{time:Array.from({length:24},(_,i)=>attempt-(23-i)*3600),pm2_5:Array(24).fill(0),pm10:Array(24).fill(0),us_aqi:Array(24).fill(0)}}));
  const modelWeather=()=>Array.from({length:8},()=>({current_units:{wind_speed_10m:'km/h',temperature_2m:'°C'},current:{time:attempt,temperature_2m:0,relative_humidity_2m:0,wind_speed_10m:0,wind_direction_10m:0,precipitation:0}}));
  const origin='https://sentinela-tapajos-ar.gyantardeli.chatgpt.site';let backend;
  const network=async(url,init={})=>{
    if(url.startsWith(origin)){
      assert.equal(new Headers(init.headers).get('OAI-Sites-Authorization'),'Bearer test-private-service');const pathname=new URL(url).pathname;apiRequests.push({path:pathname,method:init.method??'GET'});assert(pathname.startsWith('/api/'));
      const route=backend('.'+pathname.replace('/api/','/app/api/')+'/route');return route[init.method??'GET'](new Request(url,init));
    }
    if(url.includes('air-quality-api.open-meteo'))return Response.json(modelAir());
    if(url.includes('api.open-meteo'))return Response.json(modelWeather());
    if(url.includes('/diario/Brasil/'))return failINPE?new Response('',{status:429,headers:{'Retry-After':'60'}}):new Response(url.includes(day(attempt))?csv(attempt-120):header+'\n');
    if(url.endsWith('10min/'))return new Response('');
    return new Response('<rss><channel></channel></rss>');
  };
  const input=JSON.stringify({url:origin,token:'test-private-service'});
  const script=fs.readFileSync('public/radar-collector.mjs','utf8').replace('import { createInterface } from "node:readline";','').replace('import { execFileSync } from "node:child_process";','').replace('main().catch(error =>','main().finally(done).catch(error =>');
  async function run(){
    backend=isolated.loader(network,()=>runAt*1000);const logs=[];let done;const completed=new Promise(resolve=>done=resolve),mockProcess={stdin:{isTTY:false,pause(){}},exitCode:0};
    class Clock extends Date{constructor(...args){super(...(args.length?args:[runAt*1000]));}static now(){return runAt*1000;}}
    vm.runInNewContext(script,{process:mockProcess,createInterface:()=>({once(_event,fn){queueMicrotask(()=>fn(input));},close(){}}),execFileSync(){throw new Error('No shell or browser in headless test');},console:{log(s){try{logs.push(JSON.parse(s));}catch{}},error(s){logs.push({error:s});}},fetch:network,URL,URLSearchParams,Date:Clock,crypto,AbortSignal,Response,Request,Headers,TextEncoder,TextDecoder,Uint8Array,setTimeout,clearTimeout,queueMicrotask,done});
    await completed;await new Promise(resolve=>setTimeout(resolve,0));assert.equal(mockProcess.exitCode,0,JSON.stringify(logs.at(-1)));const final=logs.find(x=>x.revision==='radar-tapajos-v5');assert.equal(final.verified,true,JSON.stringify(logs));return final;
  }
  const final=await run();assert.equal(final.inpe.verified,true);assert.equal(final.run.checked,20);assert(final.environment.verified);assert(apiRequests.some(r=>r.path==='/api/fires/ingest'));assert(!apiRequests.some(r=>!r.path.startsWith('/api/')));
  runAt+=61;failINPE=true;const failed=await run();assert(failed.inpe.verified);assert.equal(failed.inpe.diagnostics.estado,'cache_anterior');assert.equal(failed.inpe.diagnostics.totalFocosEmCache,1);assert.equal(failed.inpe.diagnostics.ultimaAtualizacao,attempt);assert.equal(failed.inpe.diagnostics.ultimaTentativa,runAt);assert(failed.environment.verified);assert.equal(failed.run.checked,20);
  isolated.sql.close();const restarted=harness(path.join(root,'scheduled.sqlite')),fresh=restarted.loader();assert.equal((await fresh('./lib/fire-store').readFireSnapshot()).collection.fires.length,1);assert.equal((await fresh('./lib/radar-store').readRadar()).sources.length,20);assert.equal((await fresh('./lib/environment-store').readEnvironmentCache()).air.locations.length,8);restarted.sql.close();
});
fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/priority1-results.json',JSON.stringify({passed:true,groups:passed.length,checks:passed,network:'mocked',storage:'SQLite file across fresh backend modules',frontendOpened:false,productionWrites:0,sourceCommit:'b000690b9c354c6ccc7badef90a1c2972f765fa0',specificationCommit:'fa1250aa55669d45de464adff6ba5d08eacd7ed7'},null,2));h.sql.close();fs.rmSync(root,{recursive:true,force:true});console.log(JSON.stringify({passed:true,groups:passed.length,frontendOpened:false,productionWrites:0}));
