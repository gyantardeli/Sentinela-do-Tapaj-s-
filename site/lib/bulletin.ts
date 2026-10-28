import { areaCenter, areaExtent, validateArea, filterAreaFires, type InterestArea } from "./areas";
import { PLACES, distance as distanceForMap, filterFires, filterSatellite, nearestAir, type DashboardData, type Fire } from "./environment";
import { groupArticles, type RadarData } from "./radar-core";
import { RADAR_LOCALITIES, RADAR_SOURCES } from "./radar-sources";
import type { HealthData, HistoryData } from "./monitoring";
import type { RegionalSummary } from "./regional-summary";

export type Bulletin = {
  revision:"bulletin-v1"; capturedAt:number; scope:"local"|"regional"; placeId:string; radius:number; hours:number; satellite:string;
  dashboard:DashboardData|null; regional:RegionalSummary|null; history:HistoryData|null; health:HealthData|null; radar:RadarData|null;
  missing:string[]; area?:InterestArea|null;
};
export const BULLETIN_KEY="sentinela-offline-bulletin-v1";
export function validBulletin(value:unknown):value is Bulletin {
  if(!value||typeof value!=="object")return false;
  const v=value as Bulletin;
  if(v.area){try{validateArea(v.area,v.capturedAt);}catch{return false;}}
  return v.revision==="bulletin-v1"&&Number.isInteger(v.capturedAt)&&v.capturedAt>0&&v.capturedAt<=Date.now()/1000+300&&["local","regional"].includes(v.scope)&&PLACES.some(p=>p.id===v.placeId)&&[25,50,100,200].includes(v.radius)&&[6,12,24].includes(v.hours)&&typeof v.satellite==="string"&&v.satellite.length<=60&&Array.isArray(v.missing)&&(!v.dashboard||(v.dashboard.place?.id===v.placeId&&Array.isArray(v.dashboard.fires)&&Array.isArray(v.dashboard.sources)&&Array.isArray(v.dashboard.air)))&&(!v.radar||(Array.isArray(v.radar.items)&&Array.isArray(v.radar.sources)))&&(!v.health||Array.isArray(v.health.sources))&&(!v.regional||Array.isArray(v.regional.places))&&(!v.history||(v.history.placeId===v.placeId&&Array.isArray(v.history.daily)));
}
export function bulletinView(b:Bulletin) {
  const place=PLACES.find(p=>p.id===b.placeId)!;
  const raw=b.dashboard?.fires??[];
  const fires=filterSatellite(b.area?filterAreaFires(raw,b.area,b.hours,b.capturedAt):b.scope==="local"?filterFires(raw,place,b.radius,b.hours,b.capturedAt):raw.filter(f=>f.time>=b.capturedAt-b.hours*3600&&f.time<=b.capturedAt+300&&PLACES.some(p=>filterFires([f],p,b.radius,b.hours,b.capturedAt).length)),b.satellite);
  const axis=place.id==="ruropolis"||place.id==="placas"?"ruropolis-placas":place.id;
  const items=(b.radar?.items??[]).filter(item=>item.publishedAt>=b.capturedAt-72*3600&&item.publishedAt<=b.capturedAt+300&&(b.scope==="regional"||!item.places.length||item.places.some(id=>RADAR_LOCALITIES.find(p=>p.id===id)?.axis===axis)));
  const news=groupArticles(items,b.scope==="regional"?"all":axis,b.capturedAt).slice(0,6);
  const air=nearestAir(b.dashboard?.air??[],b.capturedAt);
  const currentAir=air&&!b.dashboard?.sources.find(s=>s.id==="air")?.stale&&Math.abs(air.time-b.capturedAt)<=7200?air:null;
  const weather=b.dashboard?.weather;
  const currentWeather=weather&&!b.dashboard?.sources.find(s=>s.id==="weather")?.stale&&Math.abs(weather.time-b.capturedAt)<=7200?weather:null;
  const inpe=b.dashboard?.sources.find(s=>s.id==="inpe");
  return {place,fires,news,air:currentAir,weather:currentWeather,inpe,fireAvailable:!!inpe&&inpe.status!=="unavailable",sourceName:(id:string)=>RADAR_SOURCES.find(s=>s.id===id)?.name??id};
}
// Local tangent plane, north at the top. No external tiles or third-party images.
export function bulletinGeometry(b:Bulletin) {
  const v=bulletinView(b),center=b.area?areaCenter(b.area):v.place,cos=Math.cos(center.lat*Math.PI/180);
  const project=(p:{lat:number;lon:number})=>({x:(p.lon-center.lon)*111.32*cos,y:(p.lat-center.lat)*111.32});
  const centers=b.area?PLACES.filter(p=>distanceForMap(p,center)<=areaExtent(b.area!)*1.1):b.scope==="regional"?PLACES:[v.place];
  const locations=centers.map(p=>({...p,...project(p)}));
  const span=b.area?areaExtent(b.area)*1.18:b.scope==="regional"?Math.max(b.radius*1.18,...locations.flatMap(p=>[Math.abs(p.x)+b.radius,Math.abs(p.y)+b.radius])):b.radius*1.18;
  const points=v.fires.map(f=>({...project(f),fire:f}));
  return {span,locations,points,project,area:b.area?{...b.area,projected:b.area.points.map(project)}:null};
}
export const bulletinLimits=[
  "Uma detecção é um pixel de calor observado por satélite; não equivale a um incêndio distinto nem mede área queimada. A cobertura recente pode ser parcial.",
  "Áreas personalizadas filtram detecções por coordenadas, polígonos ou distância ao eixo do corredor. Os raios municipais partem das sedes e podem se sobrepor. Não são limites administrativos. O recorte regional é a união dos oito raios; cada detecção aparece uma vez.",
  "PM2,5 e vento são modelos, não sensores. CAMS global tem resolução aproximada de 45 km. AQI dos EUA não é o IQAr brasileiro. A seta de vento no centro não calcula transporte ou chegada de fumaça.",
  "Notícias usam menções geográficas e relevância. Títulos semelhantes podem ser republicações, não confirmações independentes. A data da publicação não define a data da ocorrência.",
  "O histórico usa arquivos diários do INPE, saídas horárias do CAMS e publicações arquivadas. Lacunas não viram zero. Médias com poucas amostras não são comparáveis a dias completos.",
  "Cópia fixa, sem atualização automática. Confira os horários originais e a cobertura antes de usar. Mapas externos e links das fontes exigem internet.",
];
export function sourceLabel(status:string){return ({ok:"Disponível",partial:"Parcial",indexed:"Índice parcial",empty:"Sem resultados",unavailable:"Indisponível",manual:"Consulta manual",embedded:"Mapa incorporado",external:"Consulta externa",widget:"Widget oficial"} as Record<string,string>)[status]??status;}
export function localityName(id:string){return RADAR_LOCALITIES.find(p=>p.id===id)?.name??PLACES.find(p=>p.id===id)?.name??id;}
export function safeUrl(value:string){try{const url=new URL(value);return url.protocol==="https:"||url.protocol==="http:"?url.href:"";}catch{return "";}}
