import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const modules = new Map();
function load(name) {
  const file = path.resolve(name);
  if (modules.has(file)) return modules.get(file);
  const exports = {}; modules.set(file, exports);
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "exports", compiled)(specifier => specifier.endsWith("?raw") ? { default: fs.readFileSync(path.resolve(path.dirname(file), specifier.slice(0, -4)), "utf8") } : load(path.resolve(path.dirname(file), specifier + ".ts")), exports);
  return exports;
}
const { createFieldPacket, validFieldPacket } = load("lib/field-packet.ts");
const { fieldHtml } = load("lib/field-html.ts");
const now = Math.floor(Date.now()/1000), captured = now - 900, place = {id:"itaituba",name:"Itaituba",lat:-4.2761,lon:-55.9836};
const fire = (id, lat, time, satellite="NPP-375") => ({id,lat,lon:place.lon,time,satellite,frp:null,source:"INPE"});
const dashboard = {fetchedAt:captured,place,air:[{time:captured,pm25:12,pm10:15,aqi:33}],weather:{time:captured,temperature:30,humidity:60,speed:8,direction:90,rain:0},fires:[fire("valid",place.lat,captured-100),fire("outside",place.lat+5,captured-100),fire("future",place.lat,captured+1),fire("old",place.lat,captured-86401),fire("other-sat",place.lat,captured-100,"AQUA")],sensors:[],sources:[{id:"inpe",name:"INPE",status:"partial",dataTime:captured-100,checkedAt:captured,detail:"partial",url:"https://example.invalid"}],regional:[],fireCoverage:null,token:"never-export-this"};
const packet=createFieldPacket(dashboard,25,24,"NPP-375",null,null,true,now);
assert.deepEqual(packet.fires.map(f=>f.id),["valid"],"spatial, satellite and time bounds, including future detections");
assert.equal(packet.capturedAt,captured,"old consultation time must not become the save time");
assert.equal(packet.savedAt,now);assert.equal(packet.sources[0].status,"partial");assert.ok(packet.missing.includes("notícias"));assert.ok(!JSON.stringify(packet).includes("never-export-this"));
assert.ok(validFieldPacket(JSON.parse(JSON.stringify(packet))));
assert.equal(validFieldPacket({...packet,fires:[{...packet.fires[0],lat:999}]}),false);
assert.equal(validFieldPacket({...packet,capturedAt:now+3600}),false);
const area={id:"test-area",name:"Área Teste",kind:"circle",points:[{lat:place.lat+5,lon:place.lon}],radiusKm:10,updatedAt:captured};
const areaPacket=createFieldPacket(dashboard,25,24,"all",area,null,true,now);
assert.deepEqual(areaPacket.fires.map(f=>f.id),["outside"],"area overrides municipal circle");
const attacked={...packet,scopeLabel:'</script><script>throw new Error("injected")</script>',news:[{title:"<img src=x onerror=alert(1)>",url:"javascript:alert(1)",source:"Test",publishedAt:captured-10,copies:1}]};
const html=fieldHtml(attacked);assert.ok(!html.includes(attacked.scopeLabel),"JSON cannot terminate its script element");assert.ok(!html.includes('src="reader.js"'));assert.ok(!html.includes('href="reader.css"'));assert.match(html,/connect-src 'none'/);

// Execute the reader against a tiny DOM, without network or a browser.
class Node {
  constructor(tag="div"){this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this._value="";this._text="";}
  set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join("");}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;this._text="";}
  setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,v){this.listeners[k]=v;}scrollIntoView(){}
  get options(){return this.children;}set value(v){this._value=String(v);}get value(){return this._value||this.children[0]?.value||"";}
}
const ids=new Map();for(const m of fs.readFileSync("public/field/reader.html","utf8").matchAll(/<(\w+)[^>]*\bid="([^"]+)"/g))ids.set(m[2],new Node(m[1]));
for(const hour of [24,12,6,1]){const n=new Node("option");n.value=String(hour);ids.get("hours").append(n);}
ids.get("field-data").textContent="null";const domEvents={},windowEvents={};let replaced="";
const doc={getElementById:id=>ids.get(id),createElement:tag=>new Node(tag),createElementNS:(_ns,tag)=>new Node(tag),addEventListener:(n,fn)=>domEvents[n]=fn,documentElement:{dataset:{platform:"android"}}};
const win={addEventListener:(n,fn)=>windowEvents[n]=fn,location:{protocol:"https:",hostname:"sentinela-tapajos-ar.gyantardeli.chatgpt.site",replace:url=>replaced=url}};
vm.runInNewContext(fs.readFileSync("public/field/reader.js","utf8"),{document:doc,window:win,navigator:{onLine:false},Intl,Date,Number,Math,JSON,Set,Object,Array,setInterval:()=>0,localStorage:{getItem:()=>"true"}});
domEvents.DOMContentLoaded();win.loadPacket(attacked);
assert.equal(ids.get("scope").textContent,attacked.scopeLabel);assert.equal(ids.get("news").children[0].children[0].textContent,attacked.news[0].title);assert.equal(ids.get("reconnect").hidden,true);
assert.ok(ids.get("map").children.some(n=>n.attrs.class==="fire-dot"));
ids.get("map").children.find(n=>n.attrs.class==="fire-dot").listeners.click();assert.match(ids.get("selected").textContent,/NPP-375/);
windowEvents.online();assert.equal(replaced,"","native reader never navigates to the private site automatically");
doc.documentElement.dataset.platform="browser";windowEvents.online();assert.equal(replaced,"https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/?campo=1#campo","browser can resume opt-in synchronization when online");

// Service worker persistence: complete writes commit; partial writes preserve the old pointer.
const handlers={},stores=new Map();let failPart=false,networkCalls=0;
const caches={open:async name=>{if(!stores.has(name)){const data=new Map();stores.set(name,{put:async(url,response)=>{if(failPart&&url.endsWith("/packet"))throw new Error("quota");data.set(url,response.clone());},match:async url=>data.get(typeof url==="string"?url:url.url)?.clone(),delete:async url=>data.delete(typeof url==="string"?url:url.url),keys:async()=>[...data.keys()].map(url=>({url}))});}return stores.get(name);},delete:async name=>stores.delete(name)};
const origin="https://sentinela.example";
vm.runInNewContext(fs.readFileSync("public/sw.js","utf8"),{self:{location:{origin},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(n,f)=>handlers[n]=f},caches,URL,Response,Uint8Array,Date,Math,JSON,Promise,fetch:async()=>{networkCalls++;throw new Error("offline");}});
async function message(data){let job,result;handlers.message({source:{url:origin+"/"},data,ports:[{postMessage:value=>result=value}],waitUntil:value=>job=value});await job;return result;}
async function request(path,mode="navigate"){let result;handlers.fetch({request:{url:origin+path,method:"GET",mode},respondWith:p=>result=p});return result?await result:null;}
assert.equal((await message({type:"SAVE_FIELD",html:fieldHtml(packet),packet})).saved,true);
assert.ok((await (await request("/offline/campo")).text()).includes("field-data"));
failPart=true;const replacement={...packet,capturedAt:packet.capturedAt+1};assert.equal((await message({type:"SAVE_FIELD",html:fieldHtml(replacement),packet:replacement})).saved,false);
const saved=await (await request("/offline/campo")).text();assert.ok(saved.includes('"capturedAt":'+packet.capturedAt+','),"failed second write keeps previous complete packet");
const root=await request("/");assert.equal(await root.text(),saved,"offline navigation opens standalone reader");assert.equal(await request("/api/dashboard"),null,"private API traffic is never cached");assert.equal(await request("/auth/login"),null,"login never receives a cached private page");assert.equal(networkCalls,1);
assert.equal((await message({type:"CLEAR_FIELD"})).saved,true);assert.match(await (await request("/offline/campo")).text(),/Nenhum boletim/);
fs.mkdirSync("work",{recursive:true});fs.writeFileSync("work/field-test-packet.json",JSON.stringify(packet));
console.log("Passed: packet filters/timestamps, no credentials, injection-safe standalone reader, native offline behavior, browser reconnection, atomic SW writes and private-path exclusions.");
