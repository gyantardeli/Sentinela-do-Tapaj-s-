import { bearing, distance, type Fire, type Place } from "./environment";

export type Coordinate={lat:number;lon:number};
export type InterestArea={id:string;name:string;kind:"circle"|"polygon"|"corridor";points:Coordinate[];radiusKm:number;updatedAt:number};
export type AreaData={version:string;areas:InterestArea[];error?:string};
export const AREA_BOUNDS={south:-11,north:1,west:-62,east:-50};
const EPS=1e-9;
function cross(a:Coordinate,b:Coordinate,c:Coordinate){return (b.lon-a.lon)*(c.lat-a.lat)-(b.lat-a.lat)*(c.lon-a.lon);}
function onSegment(p:Coordinate,a:Coordinate,b:Coordinate){return Math.abs(cross(a,b,p))<EPS&&p.lon>=Math.min(a.lon,b.lon)-EPS&&p.lon<=Math.max(a.lon,b.lon)+EPS&&p.lat>=Math.min(a.lat,b.lat)-EPS&&p.lat<=Math.max(a.lat,b.lat)+EPS;}
function intersects(a:Coordinate,b:Coordinate,c:Coordinate,d:Coordinate){const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);return (x*y<0&&z*w<0)||onSegment(a,c,d)||onSegment(b,c,d)||onSegment(c,a,b)||onSegment(d,a,b);}
export function validateArea(input:unknown,now=Math.floor(Date.now()/1000)):InterestArea {
  const a=input as InterestArea;
  if(!a||typeof a.id!=="string"||!/^[a-zA-Z0-9-]{1,60}$/.test(a.id)||typeof a.name!=="string"||a.name.trim().length<2||a.name.length>80||!["circle","polygon","corridor"].includes(a.kind)||!Array.isArray(a.points)||a.points.length>200||!Number.isFinite(a.radiusKm))throw new Error("Área inválida: confira nome, tipo e coordenadas.");
  const points=a.points.map(p=>{if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||p.lat<AREA_BOUNDS.south||p.lat>AREA_BOUNDS.north||p.lon<AREA_BOUNDS.west||p.lon>AREA_BOUNDS.east)throw new Error("Use coordenadas dentro da cobertura regional: latitude -11 a 1; longitude -62 a -50.");return {lat:p.lat,lon:p.lon};});
  if(a.kind==="polygon"&&points.length>1&&distance(points[0],points.at(-1)!)<.000001)points.pop();
  if(a.kind==="circle"?(points.length!==1||a.radiusKm<1||a.radiusKm>200):a.kind==="corridor"?(points.length<2||a.radiusKm<1||a.radiusKm>100):points.length<3)throw new Error("Ponto: uma coordenada e raio de 1–200 km. Polígono: pelo menos três vértices. Corredor: dois pontos e faixa de 1–100 km de cada lado.");
  for(let i=1;i<points.length;i++)if(distance(points[i-1],points[i])<.000001)throw new Error("Remova coordenadas consecutivas repetidas.");
  if(a.kind==="polygon"){
    let area=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];area+=p.lon*q.lat-q.lon*p.lat;}
    if(Math.abs(area)<1e-8)throw new Error("O polígono precisa delimitar uma área.");
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){if(j===i+1||(i===0&&j===points.length-1))continue;if(intersects(points[i],points[(i+1)%points.length],points[j],points[(j+1)%points.length]))throw new Error("As bordas do polígono não podem se cruzar ou se tocar.");}
  }else for(const p of points){const latMargin=a.radiusKm/110.5,lonMargin=a.radiusKm/(110.5*Math.cos(p.lat*Math.PI/180));if(p.lat-latMargin<AREA_BOUNDS.south||p.lat+latMargin>AREA_BOUNDS.north||p.lon-lonMargin<AREA_BOUNDS.west||p.lon+lonMargin>AREA_BOUNDS.east)throw new Error("O raio ou a faixa ultrapassa a cobertura regional do INPE. Reduza a largura ou ajuste as coordenadas.");}
  return {id:a.id,name:a.name.trim(),kind:a.kind,points,radiusKm:a.kind==="polygon"?0:a.radiusKm,updatedAt:now};
}
export function distanceToSegment(p:Coordinate,a:Coordinate,b:Coordinate){
  const length=distance(a,b);if(length<.000001)return distance(p,a);
  const angular=distance(a,p)/6371,diff=(bearing(a,p)-bearing(a,b))*Math.PI/180;
  const along=Math.atan2(Math.sin(angular)*Math.cos(diff),Math.cos(angular))*6371;
  if(along<=0)return distance(p,a);if(along>=length)return distance(p,b);
  return Math.abs(Math.asin(Math.max(-1,Math.min(1,Math.sin(angular)*Math.sin(diff)))))*6371;
}
export function containsPoint(area:InterestArea,p:Coordinate){
  if(area.kind==="circle")return distance(area.points[0],p)<=area.radiusKm+1e-7;
  if(area.kind==="corridor")return area.points.slice(1).some((b,i)=>distanceToSegment(p,area.points[i],b)<=area.radiusKm+1e-7);
  let inside=false;const points=area.points;
  for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if(onSegment(p,a,b))return true;if((a.lat>p.lat)!==(b.lat>p.lat)&&p.lon<(b.lon-a.lon)*(p.lat-a.lat)/(b.lat-a.lat)+a.lon)inside=!inside;}
  return inside;
}
export function filterAreaFires(fires:Fire[],area:InterestArea,hours:number,now:number){return fires.filter(f=>f.time>=now-hours*3600&&f.time<=now+300&&containsPoint(area,f));}
export function areaCenter(area:InterestArea):Coordinate {if(area.kind==="circle")return area.points[0];return {lat:(Math.min(...area.points.map(p=>p.lat))+Math.max(...area.points.map(p=>p.lat)))/2,lon:(Math.min(...area.points.map(p=>p.lon))+Math.max(...area.points.map(p=>p.lon)))/2};}
export function areaExtent(area:InterestArea){const c=areaCenter(area);return Math.max(5,...area.points.map(p=>distance(c,p)))+(area.kind==="polygon"?0:area.radiusKm);}
export function areaPlace(area:InterestArea):Place{return {id:area.id,name:area.name,...areaCenter(area)};}
export function areaDescription(area:InterestArea){return area.kind==="circle"?`Raio ${area.radiusKm} km em coordenada definida`:area.kind==="polygon"?`Polígono de ${area.points.length} vértices`:`Corredor com faixa de ${area.radiusKm} km de cada lado` ;}
export function areaFeature(area:InterestArea){const coordinates=area.points.map(p=>[p.lon,p.lat]);return {type:"Feature",id:area.id,properties:{name:area.name,kind:area.kind,radiusKm:area.radiusKm,coordinateReference:"WGS84"},geometry:area.kind==="circle"?{type:"Point",coordinates:coordinates[0]}:area.kind==="corridor"?{type:"LineString",coordinates}:{type:"Polygon",coordinates:[[...coordinates,coordinates[0]]]}};}
export function importAreas(input:unknown,now=Math.floor(Date.now()/1000)):InterestArea[]{
  const root=input as Record<string,any>;if(!root||typeof root!=="object")throw new Error("GeoJSON inválido.");
  const features=root.type==="FeatureCollection"?root.features:root.type==="Feature"?[root]:[{type:"Feature",properties:{},geometry:root}];
  if(!Array.isArray(features)||!features.length||features.length>12)throw new Error("Importe de 1 a 12 áreas por arquivo.");
  return features.map((f:any,i:number)=>{const g=f.geometry,props=f.properties??{};if(!g||!["Point","Polygon","LineString"].includes(g.type))throw new Error("Use Point, Polygon ou LineString; outras geometrias não são suportadas.");if(g.type==="Polygon"&&(!Array.isArray(g.coordinates)||g.coordinates.length!==1))throw new Error("Polígonos com furos não são suportados. Importe um contorno simples.");const rows=g.type==="Point"?[g.coordinates]:g.type==="Polygon"?g.coordinates[0]:g.coordinates;if(!Array.isArray(rows))throw new Error("Coordenadas inválidas.");const points=rows.map((c:any)=>{if(!Array.isArray(c)||c.length<2||!Number.isFinite(c[0])||!Number.isFinite(c[1]))throw new Error("GeoJSON usa longitude, latitude em graus decimais.");return {lon:c[0],lat:c[1]};});return validateArea({id:crypto.randomUUID(),name:String(props.name??props.nome??`Área importada ${i+1}`).slice(0,80),kind:g.type==="Point"?"circle":g.type==="Polygon"?"polygon":"corridor",radiusKm:typeof props.radiusKm==="number"?props.radiusKm:g.type==="Point"?25:g.type==="LineString"?10:0,points},now);});
}
