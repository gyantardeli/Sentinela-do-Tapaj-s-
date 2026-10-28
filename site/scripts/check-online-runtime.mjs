import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
const native=createRequire(import.meta.url),plain=x=>JSON.parse(JSON.stringify(x)),checks=[];
async function check(name,fn){await fn();checks.push(name);}
const compile=f=>ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function loader(globals,overrides={}){const modules=new Map();function load(file){if(modules.has(file))return modules.get(file).exports;const mod={exports:{}};modules.set(file,mod);vm.runInNewContext('(function(require,module,exports){'+compile(file)+'\n})',{console,URL,URLSearchParams,AbortSignal,Response,Request,Date,Intl,TextEncoder,TextDecoder,...globals})(id=>{if(id in overrides)return overrides[id];if(id.endsWith('.css'))return {};if(!id.startsWith('.'))return native(id);const p=path.resolve(path.dirname(file),id);if(overrides.components&&p.includes('/components/')&&!p.endsWith('/use-snapshot'))return {default:id};const f=['.ts','.tsx'].map(ext=>p+ext).find(fs.existsSync);assert(f,id);return load(f);},mod,mod.exports);return mod.exports;}return file=>load(path.resolve(file));}
await check('retirement worker preserves other caches and unregisters after cleanup failure',async()=>{
 for(const fail of [false,true]){const handlers={},deleted=[],kept=new Set(['sentinela-shell-v1','manual-readings','other-app']);let unregistered=0,skipped=0;
 vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{self:{addEventListener:(n,f)=>handlers[n]=f,skipWaiting:async()=>{skipped++;},registration:{unregister:async()=>{unregistered++;}}},caches:{delete:async n=>{deleted.push(n);if(fail)throw Error('cache blocked');return kept.delete(n);}}});
 let pending;handlers.install({waitUntil:p=>pending=p});await pending;handlers.activate({waitUntil:p=>pending=p});await pending.catch(()=>{});
 assert.equal(skipped,1);assert.equal(unregistered,1);assert.deepEqual(deleted,['sentinela-shell-v1']);assert(kept.has('manual-readings')&&kept.has('other-app'));assert(!handlers.fetch&&!handlers.message);
 }
});
await check('startup cleanup selects only same-origin /sw.js and tolerates one rejected unregister',async()=>{
 const removed=[],deleted=[],urls=['https://site.test/sw.js','https://site.test/other.js','https://foreign.test/sw.js','invalid','https://site.test/sw.js?old=1'];
 const load=loader({window:{caches:true},location:{origin:'https://site.test'},navigator:{serviceWorker:{getRegistrations:async()=>urls.map((scriptURL,i)=>({active:{scriptURL},unregister:async()=>{removed.push(i);if(i===0)throw Error('blocked');}}))}},caches:{delete:async n=>deleted.push(n)}});
 await load('lib/online-only.ts').disableLegacyOffline();assert.deepEqual(removed,[0,4]);assert.deepEqual(deleted,['sentinela-shell-v1']);
 await loader({})('lib/online-only.ts').disableLegacyOffline();
});
function hookRuntime(){let cursor=0,dirty=false,component,args,result;const cells=[],effects=[],listeners=new Map();
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={useState(initial){const i=cursor++;if(!cells[i])cells[i]={value:typeof initial==='function'?initial():initial};return [cells[i].value,v=>{const next=typeof v==='function'?v(cells[i].value):v;if(!Object.is(next,cells[i].value)){cells[i].value=next;dirty=true;}}];},useRef(value){const i=cursor++;return(cells[i]??={value:{current:value}}).value;},useMemo(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps))cells[i]={value:fn(),deps};return cells[i].value;},useCallback(fn,deps){return react.useMemo(()=>fn,deps);},useEffect(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps)){const previous=cells[i];cells[i]={deps};effects.push(()=>{previous?.cleanup?.();cells[i].cleanup=fn();});}},lazy:()=> 'LazyComponent',Suspense:'Suspense'};
 const window={location:{hash:'#mapa'},addEventListener(n,f){if(!listeners.has(n))listeners.set(n,new Set());listeners.get(n).add(f);},removeEventListener(n,f){listeners.get(n)?.delete(f);}};
 const render=()=>{cursor=0;dirty=false;result=component(...args);for(const e of effects.splice(0))e();return result;};
 return {react,window,cells,async mount(c,...a){component=c;args=a;render();return this.settle();},async settle(){for(let i=0;i<16;i++){await Promise.resolve();if(dirty)render();}return result;},async event(n){for(const f of [...(listeners.get(n)||[])])f();return this.settle();},async rerender(...a){args=a;render();return this.settle();},get value(){return result;},unmount(){for(const c of cells)c?.cleanup?.();}};
}
await check('snapshot failures, HTTP errors, reconnect and late responses clear or refresh remote values',async()=>{
 const h=hookRuntime();let reply=()=>Response.json({value:0,time:123}),calls=0;
 const load=loader({window:h.window,document:{hidden:false},setInterval:()=>1,clearInterval(){},fetch:async()=>{calls++;return reply();}},{react:h.react});
 const useSnapshot=load('components/use-snapshot.ts').useSnapshot;
 await h.mount(useSnapshot,'/api/a');assert.deepEqual(plain(h.value.data),{value:0,time:123});
 for(const status of [401,403,500]){reply=()=>new Response('{}',{status});await h.value.load();await h.settle();assert.equal(h.value.data,null);assert(h.value.error.includes('Nenhuma cópia'));}
 reply=()=>{throw Error('network');};await h.value.load();await h.settle();assert.equal(h.value.data,null);
 reply=()=>Response.json({value:7,time:123});await h.event('online');assert.equal(h.value.data.value,7);const before=calls;
 let resolve;reply=()=>new Promise(r=>resolve=r);const pending=h.value.load();await h.event('offline');resolve(Response.json({value:99}));await pending;await h.settle();assert.equal(h.value.data,null);
 reply=()=>Response.json({value:8,time:123});await h.event('online');assert.equal(h.value.data.value,8);assert(calls>before);
 await h.rerender('/api/b');assert.equal(h.value.data.value,8);h.unmount();
});
await check('Home ignores environmental device cache, preserves manual readings, and revalidates online',async()=>{
 const h=hookRuntime(),reads=[],writes=[],now=Math.floor(Date.now()/1000),manual=[{id:'manual-test',name:'Local',lat:-4.27,lon:-55.98,time:now,pm25:4,manual:true}];let reply;
 const globals={window:h.window,document:{hidden:false},navigator:{},location:{origin:'https://site.test'},setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},fetch:async()=>reply(),localStorage:{getItem(k){reads.push(k);return JSON.stringify(k==='sentinela-selva-readings-v1'?manual:{stale:true});},setItem(k){writes.push(k);}}};
 const jsx=(type,props)=>({type,props});const load=loader(globals,{react:h.react,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},'lucide-react':new Proxy({},{get:(_,p)=>String(p)}),components:true});
 const {PLACES}=load('lib/environment.ts');const payload={place:PLACES[0],fetchedAt:now-3600,sources:[],air:[{time:now-3600,pm25:0,pm10:null,aqi:null}],weather:null,fires:[],sensors:[],regional:[],fireCoverage:null};
 reply=()=>Response.json(payload);await h.mount(load('app/page.tsx').default,{previewTime:now});assert.equal(h.cells[7].value.fetchedAt,now-3600);assert.deepEqual(plain(h.cells[11].value),manual);
 reply=()=>{throw Error('network');};await h.event('online');assert.equal(h.cells[7].value,null);assert(h.cells[9].value.includes('Nenhuma cópia'));assert.deepEqual(plain(h.cells[11].value),manual);
 reply=()=>Response.json(payload);await h.event('online');assert.equal(h.cells[7].value.air[0].pm25,0);await h.event('offline');assert.equal(h.cells[7].value,null);assert.deepEqual(plain(h.cells[11].value),manual);
 assert.deepEqual(reads,['sentinela-selva-readings-v1']);assert.deepEqual(writes,[]);h.unmount();
});
await check('watchdog never reports healthy collection when its status is unknown or unavailable',async()=>{
 const {createElement}=native('react'),{renderToStaticMarkup}=native('react-dom/server');
 const checked={id:'test',checkedAt:1793000000,mode:'independent',status:'ok',targets:[],issues:[],radarRunId:null};
 const base={now:1793000001,latest:null,independent:null,overdue:false,checks:[],schedule:null};
 for(const {data,error,label,compact} of [
  {data:null,error:'',label:'Consultando…',compact:'Consultando o monitor da coleta'},
  {data:null,error:'Falha da consulta',label:'Indisponível',compact:'Monitor da coleta indisponível'},
  {data:base,error:'',label:'Sem verificação',compact:'Monitor independente aguardando atualização'},
  {data:{...base,latest:{...checked,mode:'manual'}},error:'',label:'Sem verificação',compact:'Monitor independente aguardando atualização'},
  {data:{...base,latest:checked,independent:checked,overdue:true},error:'',label:'Atrasada / pendente',compact:'Monitor independente aguardando atualização'},
  {data:{...base,latest:checked,independent:checked},error:'',label:'Em dia',compact:'Coleta dentro dos limites do monitor'}
 ]) {
  const Panel=loader({},{'./use-snapshot':{useSnapshot:()=>({data,error,load:async()=>{}})}})('components/watchdog-panel.tsx').default;
  const full=renderToStaticMarkup(createElement(Panel));
  assert(full.includes(label),label);
  if(label!=='Em dia')assert(!full.includes('Em dia'));
  if(!data)assert(full.includes('Não consultada'));
  const ribbon=renderToStaticMarkup(createElement(Panel,{compact:true}));
  assert(ribbon.includes(compact),compact);
  if(label!=='Em dia')assert(!ribbon.includes('Coleta dentro dos limites do monitor'));
 }
});
console.log(JSON.stringify({passed:true,groups:checks.length,checks}));
