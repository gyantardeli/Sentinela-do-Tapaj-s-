import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const nativeRequire = createRequire(import.meta.url), modules = new Map();
const diagnosticEvents = [];
const testConsole = { ...console, error: value => diagnosticEvents.push(JSON.parse(value)) };
function load(name) {
  if (!name.startsWith('.')) return nativeRequire(name);
  const file = ['.ts', '.tsx'].map(ext => path.resolve(name + ext)).find(fs.existsSync);
  if (!file) throw new Error('Module not found: ' + name);
  if (modules.has(file)) return modules.get(file).exports;
  const mod = { exports: {} }; modules.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext('(function(require,module,exports){' + code + '\n})', { console: testConsole, setTimeout, clearTimeout, setInterval, clearInterval, fetch, Request, Response, URL, URLSearchParams, AbortSignal, TextEncoder, TextDecoder })(id => load(id.startsWith('.') ? './' + path.relative(process.cwd(), path.resolve(path.dirname(file), id)) : id), mod, mod.exports);
  return mod.exports;
}
const core = load('./lib/air-quality-map'), provider = load('./lib/air-quality-provider');
const now = Math.floor(Date.now() / 10800000) * 10800 + 1800, times = core.airTimes(now);
const { PLACES } = load('./lib/environment');
const checks = [];
async function check(name, action) { await action(); checks.push(name); }
function modelRow(cell, hours = times) { return { latitude: cell.lat, longitude: cell.lon, hourly_units: { pm2_5: 'μg/m³', us_aqi_pm2_5: 'USAQI' }, hourly: { time: hours, pm2_5: hours.map((_, i) => i), us_aqi_pm2_5: hours.map((_, i) => i * 2) } }; }
function mockProvider(url) {
  assert.equal(new URL(url).hostname, 'air-quality-api.open-meteo.com', 'No retired sensor provider may be called');
  const u = new URL(url), lat = u.searchParams.get('latitude').split(',').map(Number), lon = u.searchParams.get('longitude').split(',').map(Number);
  const start = Date.parse(u.searchParams.get('start_hour') + ':00Z') / 1000, end = Date.parse(u.searchParams.get('end_hour') + ':00Z') / 1000;
  const hours = Array.from({ length: (end - start) / 3600 + 1 }, (_, i) => start + i * 3600);
  return Response.json(lat.map((latitude, i) => modelRow({ lat: latitude, lon: lon[i] }, hours)));
}
function memoryCache() { const values = new Map(); return { values, async match(req) { return values.get(req.url)?.clone(); }, async put(req, response) { values.set(req.url, response.clone()); } }; }

await check('154 unique cells cover all eight municipal seats and 72 hours', () => {
  assert.equal(core.AIR_GRID.length,154); assert.equal(new Set(core.AIR_GRID.map(c=>c.id)).size,154);
  for (const p of PLACES) assert(core.nearestAirCell(p));
  assert.equal(core.nearestAirCell({lat:-20,lon:-46}),null);
  assert.equal(times.length,25); assert.equal(times.at(-1)-times[0],72*3600);
  assert(times.every(t=>t%10800===0));
});
await check('Concentration zero survives; missing data, wrong units, coordinates and composite AQI are rejected', () => {
  const cell=core.AIR_GRID[0], input=modelRow(cell), parsed=core.parseAirGridResponse(input,[cell],times,now).cells[0];
  assert.equal(parsed.pm25[0],0); assert.equal(parsed.aqiPm25[0],0);
  const missing=modelRow(cell);missing.hourly.pm2_5[1]=null; assert.equal(core.parseAirGridResponse(missing,[cell],times,now).cells[0].pm25[1],null);
  for (const invalid of [{...input,latitude:0},{...input,hourly_units:{...input.hourly_units,pm2_5:'mg/m³'}},{...input,hourly:{...input.hourly,us_aqi_pm2_5:undefined,us_aqi:Array(25).fill(90)}},{...input,hourly:{...input.hourly,time:Array(25).fill(times[0])}}]) assert.equal(core.parseAirGridResponse(invalid,[cell],times,now).cells.length,0);
  assert.throws(()=>core.parseAirGridResponse([], [cell], times,now));
});
await check('Only CAMS is queried; partial failures preserve other cells', async () => {
  const full=await provider.collectAirMap(now,{fetcher:async url=>mockProvider(url)});
  assert.equal(full.cells.length,154);assert.equal(full.model.state,'ok');assert(!('sensors' in full));assert(!('observations' in full));
  const partial=await provider.collectAirMap(now,{fetcher:async url=>url.includes('latitude=-2.4') ? new Response('denied',{status:403}) : mockProvider(url)});
  assert(partial.cells.length>0&&partial.cells.length<154);assert.equal(partial.model.state,'partial');assert(!('sensors' in partial));
  const failed=await provider.collectAirMap(now,{fetcher:async()=>new Response('',{status:403})});
  assert.equal(failed.cells.length,0);assert.equal(failed.model.state,'unavailable');assert(!('sensors' in failed));
});
await check('Failures explain the cause without exposing internal errors or implying clean air', async () => {
  const cases = [
    [async () => new Response('', { status: 429 }), 'limite de consultas', 'limite_de_requisicoes'],
    [async () => new Response('', { status: 403 }), 'recusou a consulta', 'acesso_negado'],
    [async () => { throw { name: 'TimeoutError' }; }, 'demorou além', 'tempo_esgotado'],
    [async () => Response.json([]), 'resposta inválida', 'resposta_invalida'],
    [async () => { throw new Error('internal error; reference = private-debug-id'); }, 'Falha de conexão', 'falha_de_rede_ou_formato'],
  ];
  for (const [fetcher, explanation, kind] of cases) {
    const result = await provider.collectAirMap(now, { fetcher });
    assert.equal(result.model.state, 'unavailable');
    assert.equal(result.cells.length, 0);
    assert(result.model.detail.includes(explanation));
    assert(result.model.detail.includes('Sem dados não significa ar limpo.'));
    assert(!/private-debug-id|internal error|emissão do modelo/.test(result.model.detail));
    assert.equal(diagnosticEvents.at(-1).kind, kind);
  }
});
await check('Shared cache avoids repeat calls and preserves original timestamps after a provider failure', async () => {
  const cache=memoryCache();let calls=0;
  const first=await provider.collectAirMap(now,{cache,fetcher:async url=>{calls++;return mockProvider(url);}});
  assert.equal(calls,4);
  const again=await provider.collectAirMap(now+120,{cache,fetcher:async()=>{throw new Error('Unexpected network call');}});
  assert.equal(again.cells[0].collectedAt,now);
  const fallback=await provider.collectAirMap(now+3*3600,{cache,fetcher:async()=>new Response('',{status:403})});
  assert.equal(fallback.cells[0].collectedAt,now);assert.equal(fallback.model.state,'partial');assert.equal(fallback.cells[0].pm25[0],first.cells[0].pm25[1]);assert.equal(fallback.cells[0].pm25.at(-1),null);
  assert.equal(core.gridValue(fallback.cells[0],fallback.times,fallback.times[0],'pm25',now+7*3600),null);
});
await check('Request uses CAMS Global, PM2.5-specific AQI and explicit UTC horizon', () => {
  const u=new URL(provider.gridRequestUrl(core.AIR_GRID.slice(0,40),times));
  assert.equal(u.searchParams.get('domains'),'cams_global');assert.equal(u.searchParams.get('hourly'),'pm2_5,us_aqi_pm2_5');assert.equal(u.searchParams.get('timezone'),'GMT');
  assert.equal(Date.parse(u.searchParams.get('end_hour')+':00Z')-Date.parse(u.searchParams.get('start_hour')+':00Z'),72*3600000);
});
await check('Read-only API, online maps, Portuguese controls and original PurpleAir remain intact', async () => {
  const route=fs.readFileSync('app/api/air-map/route.ts','utf8');assert(!/\.DB|INSERT|UPDATE|DELETE|POST\(/.test(route));
  const Panel=load('./components/purpleair-panel').default;
  const html=renderToStaticMarkup(React.createElement(Panel,{place:PLACES[0]}));
  assert(html.includes('Mapa PurpleAir')&&html.includes('<iframe'));
  assert(html.includes('Mapa IQAir · qualidade do ar'));
  assert(!html.includes('Mapa CAMS · estimativas e previsão'), 'CAMS is absent from the air-quality panel');
  assert(!html.includes('tile.openstreetmap.org'),'Legacy CAMS map is not mounted by the panel');
  const Map=load('./components/air-quality-map').default;
  const mapHtml=renderToStaticMarkup(React.createElement(Map,{place:PLACES[0]}));
  for(const label of ['Qualidade do ar · mapa integrado','Horário da previsão de qualidade do ar','Estimativa nas referências municipais','0/154']) assert(mapHtml.includes(label),label);
  assert(mapHtml.includes('tile.openstreetmap.org'));
  assert(!/SELVA|Sensores locais|Leituras locais disponíveis|sensores recentes/.test(mapHtml));
  const catalog=load('./lib/monitoring').SOURCE_CATALOG;assert(!catalog.some(s=>s.id==='selva'));
  const page=fs.readFileSync('app/page.tsx','utf8');assert(!/appselva\.com|SENSOR FÍSICO RECENTE|panel sensor-card|Registrar uma leitura do SELVA/.test(page));
  assert(page.includes('sentinela-selva-readings-v1'),'Existing manual records retain their storage key');
  assert(!/getSelva|appselva\.com/.test(fs.readFileSync('lib/data-service.ts','utf8')));
});

if(process.argv.includes('--live')) {
  const result=await provider.collectAirMap(Math.floor(Date.now()/1000));
  assert(result.cells.length>0,'No valid CAMS cells in the live response');
  console.log(JSON.stringify({live:true,cells:result.cells.length,frames:result.times.length,model:result.model.state,firstValue:result.cells[0].pm25[0],lastValue:result.cells[0].pm25.at(-1)}));
}
console.log(JSON.stringify({passed:true,groups:checks.length,checks}));
