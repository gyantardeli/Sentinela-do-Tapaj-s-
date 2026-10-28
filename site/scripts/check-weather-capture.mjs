import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { harness } from "./priority1-harness.mjs";

const h=harness(":memory:"),load=h.loader(),weather=load("./lib/weather-capture"),providers=load("./lib/weather-providers"),places=load("./lib/environment").PLACES;
const now=Date.parse("2026-10-21T15:52:06Z")/1000, future=Math.ceil(now/3600)*3600;
const localDate=time=>new Date((time-10800)*1000).toISOString().slice(0,10);
const clock=time=>new Date((time-10800)*1000).toISOString().slice(11,16);
const day=localDate(now),next=localDate(now+86400);
function accuFixture(p=places[0],time=now,temperature=32){
 const date=localDate(time),point=Math.ceil(time/3600)*3600;
 return `<html><script type="application/ld&#x2B;json">${JSON.stringify({"@type":"Place",name:p.name+", Pará, Brasil",address:{addressRegion:"Pará"},geo:{latitude:p.lat,longitude:p.lon}})}</script><script>const published={"fdate":"${date.replaceAll("-","")}"};</script><a class="cur-con-weather-card is-desktop"><div><p class="cur-con-weather-card__subtitle">${clock(time)}</p></div><div class="temp">${temperature}&#xB0;<span class="after-temp">C</span></div><div class="real-feel">RealFeel 36°</div><span class="phrase">Nublado</span><div class="spaced-content detail"><span class="label">Vento</span><span class="value">NE 18 km/h</span></div></a><a class="hourly-list__list__item" href="/hourly?hour=${point}"><span class="hourly-list__list__item-temp">34°</span><div class="hourly-list__list__item-precip"><span>0%</span></div></a><a class="daily-list-item"><div class="date"><p>Hoje</p><p>${date.slice(8)}/${date.slice(5,7)}</p></div><span class="temp-hi">34°</span><span class="temp-lo">24°</span><div class="precip">55%</div></a><img data-src="https://static-maps.accuweather.com/v1/radar/latest?level=city&amp;theme=light&amp;size=lg&amp;locationKey=${providers.ACCU_LOCATIONS[p.id]}&amp;mode=image"/></html>`;
}
function climaState(p=places[0],time=now,temperature=33){
 const point={date:new Date(time*1000).toISOString(),air_temperature:{celsius:temperature},apparent_temperature:{celsius:35},precipitation:{probability:0},wind:{direction:60,speed:{kilometer_per_hour:{value:"0"}}},humidity:.55,weather_condition_image:"sunny"};
 return {location:[{geoObject:{geoObjectKey:providers.CLIMA_LOCATIONS[p.id],locationName:p.name,latitude:p.lat,longitude:p.lon,"iso-3166-2":"BR-PA"}}],forecast:{current:point,hours:[{...point,date:new Date(Math.ceil(time/3600)*3600000).toISOString()}]},daily:{days:[{date:localDate(time)+"T00:00:00-03:00",air_temperature:{max:{celsius:34},min:{celsius:25}},precipitation:{probability:.6}}]}};
}
const climaFixture=(p,time,temperature)=>`<script id="serverApp-state" type="application/json">${JSON.stringify(climaState(p,time,temperature))}</script>`;
const a=weather.parseAccuWeatherPage(accuFixture(),places[0],now),b=weather.parseClimaRadarPage(climaFixture(places[0],now),places[0],now);
assert.equal(a.current.temperature,32);assert.equal(a.current.wind,18);assert.equal(a.current.rainProbability,null,"current rain must not be copied from a different forecast time");assert.equal(a.hourly[0].rainProbability,0);assert.equal(a.hourly[0].time,future);assert.equal(a.daily[0].day,day);assert.equal(a.daily[0].rainProbability,55);assert(a.radarImage.includes("locationKey=2297818"));
assert.equal(b.current.temperature,33);assert.equal(b.current.humidity,55);assert.equal(b.current.wind,0);assert.equal(b.current.rainProbability,0);assert.equal(b.daily[0].rainProbability,60);assert.equal(b.hourly[0].time,future);assert.equal(b.sourceUrl,providers.weatherLinks(places[0]).clima);
assert.equal(weather.parseAccuWeatherPage(accuFixture(places[0],now,0),places[0],now).current.temperature,0);
const fahrenheit=weather.parseAccuWeatherPage(accuFixture(places[0],now,32).replace('class="after-temp">C','class="after-temp">F'),places[0],now);assert.equal(fahrenheit.current.temperature,0);assert(Math.abs(fahrenheit.current.feelsLike-2.2222222222)<.001);
for(const parse of [weather.parseAccuWeatherPage,weather.parseClimaRadarPage]){
 const fixture=parse===weather.parseAccuWeatherPage?accuFixture:climaFixture;
 assert.throws(()=>parse(fixture(places[0],now-7201),places[0],now),/referência recente/);
 assert.throws(()=>parse(fixture(places[0],now+7200),places[0],now),/referência recente/);
 assert.throws(()=>parse(fixture(places[1],now),places[0],now),/município|coordenadas/);
 assert.throws(()=>parse("<html>Access denied</html>",places[0],now));
 assert.throws(()=>parse("x".repeat(2000001),places[0],now),/limite/);
}
const ambiguous=climaState(places[0],now);ambiguous.another={...ambiguous.forecast};assert.throws(()=>weather.parseClimaRadarPage(`<script id="serverApp-state" type="application/json">${JSON.stringify(ambiguous)}</script>`,places[0],now),/única/);
const wrongState=climaState(places[0],now);wrongState.location[0].geoObject["iso-3166-2"]="BR-SP";assert.throws(()=>weather.parseClimaRadarPage(`<script id="serverApp-state" type="application/json">${JSON.stringify(wrongState)}</script>`,places[0],now),/Estado/);
const unknown=climaState(places[0],now);unknown.forecast.current.precipitation.probability=2;assert.equal(weather.parseClimaRadarPage(`<script id="serverApp-state" type="application/json">${JSON.stringify(unknown)}</script>`,places[0],now).current.rainProbability,null);
assert.equal(weather.safeAccuRadar("https://evil.invalid/v1/radar/latest?locationKey=2297818","itaituba"),null);
assert.equal(weather.safeAccuRadar("https://static-maps.accuweather.com/v1/radar/latest?locationKey=2297818&apikey=secret","itaituba"),null);
assert.equal(weather.safeAccuRadar("https://static-maps.accuweather.com/v1/radar/latest?locationKey=34592","itaituba"),null);
assert.equal(weather.safeAccuRadar("javascript:alert(1)","itaituba"),null);
let count=0,failed=false;
const collector=weather.createForecastCollector(async url=>{count++;const place=places.find(p=>url.includes('/'+p.id+'/'));return failed&&place.id===places[0].id?new Response("denied",{status:403}):new Response(accuFixture(place,now));});
const [first,parallel]=await Promise.all([collector("accuweather",now),collector("accuweather",now)]);
assert.equal(count,8,"in-flight requests must be shared");assert.equal(first.locations.filter(l=>l.state==="ok").length,8);assert.equal(parallel.locations.length,8);
assert(!JSON.stringify(first).includes("api-app.wetteronline"));assert(!JSON.stringify(first).includes("<script"));
await collector("accuweather",now+600);assert.equal(count,8,"valid capture cache prevents repeated provider fetches");
failed=true;const partial=await collector("accuweather",now+901),preserved=partial.locations[0];assert.equal(preserved.state,"partial");assert.equal(preserved.capture.collectedAt,now);assert.equal(preserved.capture.pageTime,a.pageTime);assert.equal(preserved.attemptedAt,now+901);assert.equal(weather.forecastPoint(preserved,null).temperature,32);assert.equal(weather.forecastPoint(preserved,future+3600),null,"missing hour must not be interpolated");
const stale=await collector("accuweather",now+7300);assert.equal(stale.locations[0].state,"stale");assert.equal(weather.forecastPoint(stale.locations[0],null),null);assert.equal(stale.locations[0].capture.collectedAt,now,"failed refresh must not renew the successful timestamp");
const denied=weather.createForecastCollector(async()=>new Response("denied",{status:403}));const noData=await denied("climaeradar",now);assert(noData.locations.every(l=>l.state==="unavailable"&&l.capture===null));
for(const p of places){const links=providers.weatherLinks(p);assert.equal(new URL(links.climaRadarEmbed).origin,"https://radar.wo-cloud.com");assert.equal(new URL(links.climaRadarEmbed).searchParams.get("placemarkName"),p.name);assert.equal(new URL(links.climaRadarEmbed).searchParams.get("tz"),"America/Santarem");}
assert.equal(weather.forecastPoint(first.locations[0],null,now+7300),null,"client clock must expire an old successful response even while disconnected");
const nativeRequire=createRequire(import.meta.url),React=nativeRequire("react"),{renderToStaticMarkup}=nativeRequire("react-dom/server"),uiModules=new Map();
function uiLoad(name){
 if(!name.startsWith('.'))return nativeRequire(name);
 const file=path.resolve(name+'.tsx');if(!fs.existsSync(file))return load(name);
 if(uiModules.has(file))return uiModules.get(file).exports;
 const mod={exports:{}};uiModules.set(file,mod);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInNewContext(`(function(require,module,exports){${code}\n})`,{URL,URLSearchParams,Date,console,fetch,AbortSignal,Request,Response,Headers,TextEncoder,TextDecoder,setTimeout,clearTimeout,setInterval,clearInterval})(id=>uiLoad(id.startsWith('.')?'./'+path.relative(process.cwd(),path.resolve(path.dirname(file),id)):id),mod,mod.exports);
 return mod.exports;
}
const component=uiLoad("./components/weather-forecast-map");
assert.equal(component.rowValue(first.locations[0],{horizon:"hourly",time:null,day:null,now},"temperature"),null,"a missing forecast hour must not fall back to current conditions");
assert.equal(component.rowValue(first.locations[0],{horizon:"hourly",time:future,day:null,now},"rainProbability"),0);
assert.equal(component.rowValue(first.locations[0],{horizon:"daily",time:null,day,now},"temperature"),34);
assert.equal(component.rowValue(first.locations[0],{horizon:"current",time:null,day:null,now:now+7300},"temperature"),null);
const html=renderToStaticMarkup(React.createElement(component.default,{place:places[0]}));assert(html.includes("Mapa de previsão regional"));assert(html.includes("As duas fontes, no mesmo recorte"));assert.equal((html.match(/data-forecast-city="true"/g)||[]).length,8);assert(!html.includes("NaN"));
const radar=renderToStaticMarkup(React.createElement(component.ProviderRainMap,{place:places[0],accuweather:first.locations[0]}));assert(radar.includes("radar.wo-cloud.com/pwa/"));assert(radar.includes("RadarClima oficial"));
const changes=h.sql.prepare('SELECT total_changes() AS n').get().n,route=load('./app/api/weather-map/route');assert.equal((await route.GET(new Request('https://site.invalid/api/weather-map?provider=invalid'))).status,400);assert.equal(h.sql.prepare('SELECT total_changes() AS n').get().n,changes,"forecast capture does not write to existing storage");
let live=0;
const indexArg=process.argv.indexOf("--live-index");if(indexArg>=0){for(const row of JSON.parse(fs.readFileSync(process.argv[indexArg+1],"utf8"))){if(!row.path)throw new Error(row.error);const place=places.find(p=>p.id===row.place),parsed=(row.provider==="accu"?weather.parseAccuWeatherPage:weather.parseClimaRadarPage)(fs.readFileSync(row.path,"utf8"),place,row.capturedAt);assert(parsed.current.temperature!==null&&parsed.hourly.length&&parsed.daily.length);live++;}assert.equal(live,16);}
h.sql.close();console.log(JSON.stringify({passed:true,checks:["public HTML parsing and geographic identity","Celsius/Fahrenheit and true zeros","UTC−3 clock, hourly epochs and daily dates","missing versus zero and no interpolation","old/future pages and changed formats rejected","fixed-host public radar images and no app credential reuse","request coalescing, cache, failure preservation and stale removal","eight-place forecast SVG and official radar SSR","invalid API provider and no database writes"],livePagesValidated:live,productionWrites:0}));
