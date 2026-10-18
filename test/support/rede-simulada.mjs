import { MUNICIPIOS } from '../../registry.mjs';

const time=new Date(Date.now()-15*60_000).toISOString();
const csvTime=time.slice(0,19).replace('T',' ');
const csv='id,lat,lon,data_hora_gmt,satelite\n1,-4.2637,-55.9916,'+csvTime+',NPP-375\n';
const current=time.slice(0,19)+'Z';
const air=MUNICIPIOS.map(()=>({current:{time:current,pm2_5:0,pm10:0,us_aqi:0}}));
const weather=MUNICIPIOS.map(()=>({current:{time:current,wind_speed_10m:0,temperature_2m:28,precipitation:0}}));
const ok=(body,status=200)=>new Response(body,{status,headers:{'content-type':'text/plain; charset=utf-8'}});
globalThis.fetch=async(input)=>{
  const url=String(input);
  if(url.includes('/focos_diario_br_'))return ok(csv);
  if(url.includes('air-quality-api.open-meteo.com'))return ok(JSON.stringify(air));
  if(url.includes('api.open-meteo.com'))return ok(JSON.stringify(weather));
  return ok('fonte não disponível neste teste',404);
};
