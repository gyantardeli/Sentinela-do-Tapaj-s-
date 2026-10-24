import test from 'node:test';
import assert from 'node:assert/strict';
import { collectAll, emptyState, layer, parseOpenMeteoPartial, validArticle } from '../collector.mjs';
import { buildEnvironmentView } from '../environment-view.mjs';
import { indicadorPrincipal, municipioNoPanorama, verificarConsistencia, consultarColetor } from '../frontend-adapter.mjs';

const NOW=Date.parse('2026-10-18T18:00:00Z');
const cities=[{id:'itaituba',nome:'Itaituba',lat:-4.2637,lon:-55.9916},{id:'jacareacanga',nome:'Jacareacanga',lat:-6.222,lon:-57.754}];
const response=(data,status=200)=>new Response(typeof data==='string'?data:JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const air=(time,value)=>({current:{time,pm2_5:value,pm10:value,us_aqi:value},hourly:{time:[time],pm2_5:[value],us_aqi:[value]}});
const weather=(time,value)=>({current:{time,temperature_2m:28,wind_speed_10m:value,wind_direction_10m:30}});
function testState(){
  const s=emptyState();
  s.camadas.ar=layer(null,{itaituba:{pm25:0,aqiEUA:0,observadoEm:'2026-10-18T18:00:00Z',origem:'CAMS via Open-Meteo (modelo)'},
    jacareacanga:{pm25:18,observadoEm:'2026-10-18T18:00:00Z'}},null,'ar',NOW);
  s.camadas.tempo=layer(null,{itaituba:{ventoKmh:0,observadoEm:'2026-10-18T18:00:00Z',origem:'Open-Meteo previsão (modelo)'},
    jacareacanga:{ventoKmh:4,observadoEm:'2026-10-18T18:00:00Z'}},null,'tempo',NOW);
  s.camadas.inpe=layer(null,{focos:[],parcial:false},null,'inpe',NOW);
  return s;
}
test('cartão principal usa os mesmos números e horários do panorama (inclui zero)',()=>{
  const view=buildEnvironmentView(testState(),{municipios:cities,now:NOW});
  const card=indicadorPrincipal(view),row=municipioNoPanorama(view);
  assert.equal(card.pm25,0); assert.equal(card.ventoKmh,0);assert.equal(card.detecoes,0);
  assert.equal(card.pm25,row.ar.pm25);assert.equal(card.ventoKmh,row.tempo.ventoKmh);
  assert.deepEqual(verificarConsistencia(view),{coerente:true,motivo:null});
});
test('filtro municipal atualiza apenas a área selecionada mantendo os outros valores',()=>{
  const view=buildEnvironmentView(testState(),{municipios:cities,municipio:'jacareacanga',now:NOW});
  assert.equal(indicadorPrincipal(view).pm25,18);
  assert.equal(view.regional[0].ar.pm25,0);
  assert.equal(view.cidade.id,'jacareacanga');
});
test('falha de um município é individualizada em um lote de oito',()=>{
  const partial=parseOpenMeteoPartial([air('2026-10-18T18:00',0),{error:true,reason:'missing'}],'ar',cities);
  assert.equal(partial.dados.itaituba.pm25,0);
  assert.equal(partial.erros.jacareacanga,'resposta_invalida');
});
test('falha parcial mantém dados anteriores do município afetado',async()=>{
  const prev=testState();
  const fetchFn=async url=>{
    if(url.includes('air-quality-api.open-meteo'))return response([air('2026-10-18T18:00',2),{error:true,reason:'n/a'}]);
    if(url.includes('api.open-meteo'))return response([weather('2026-10-18T18:00',6),weather('2026-10-18T18:00',4)]);
    return response('não disponível',404);
  };
  const result=await collectAll(prev,{fetchFn,now:NOW,municipios:cities,sources:[]});
  assert.equal(result.camadas.ar.dados.itaituba.pm25,2);
  assert.equal(result.camadas.ar.dados.jacareacanga.pm25,18);
  assert.equal(result.camadas.ar.estado,'parcial');
  assert.equal(result.camadas.ar.falhasMunicipais.jacareacanga,'resposta_invalida');
  const view=buildEnvironmentView(result,{municipios:cities,municipio:'jacareacanga',now:NOW});
  assert.equal(view.ar.estado,'cache_anterior');
});
test('hora de leitura antiga não é confundida com uma consulta recente',()=>{
  const s=testState();s.camadas.ar.dados.itaituba.observadoEm='2026-10-18T06:00:00Z';
  const view=buildEnvironmentView(s,{municipios:cities,now:NOW});
  assert.equal(view.ar.estado,'defasado');
  assert.equal(view.indicadores.pm25,0);
});
test('INPE parcial sem focos não significa zero confirmado',()=>{
  const s=testState();s.camadas.inpe.dados.parcial=true;
  const view=buildEnvironmentView(s,{municipios:cities,now:NOW});
  assert.equal(view.focos.total,null);assert.equal(view.focos.contagemCompleta,false);
  assert.equal(view.indicadores.detecoes,null);
});
test('INPE parcial com focos declara limite inferior',()=>{
  const s=testState();s.camadas.inpe.dados.parcial=true;
  s.camadas.inpe.dados.focos=[{lat:-4.2637,lon:-55.9916,data_hora_gmt:'2026-10-18T17:00:00Z',satelite:'NPP-375'}];
  const view=buildEnvironmentView(s,{municipios:cities,now:NOW});
  assert.equal(view.focos.total,1);assert.equal(view.focos.limiteInferior,1);
  assert.equal(view.focos.contagemCompleta,false);
});
test('notícia estadual genérica não recebe classificação local',()=>{
  const base={link:'https://site.example/noticia',date:'2026-10-18T17:00:00Z'};
  assert.equal(validArticle({...base,title:'Brigadistas atuam em incêndio florestal no Pará'},NOW),null);
  assert.ok(validArticle({...base,title:'Brigadistas combatem incêndio florestal no oeste do Pará'},NOW));
  assert.ok(validArticle({...base,title:'Brigadistas combatem incêndio florestal em Itaituba'},NOW));
});
test('adaptador rejeita resposta em que o cartão discorda da lista regional',async()=>{
  const view=buildEnvironmentView(testState(),{municipios:cities,now:NOW});
  view.indicadores.pm25=7;
  const result=await consultarColetor({municipio:'itaituba',fetchFn:async()=>response(view),timeoutMs:1000});
  assert.equal(result.indisponivel,true);
  assert.match(result.erroConsulta,/indicadores/i);
});
test('consulta do painel exige resposta válida do servidor e não reutiliza dados locais',async()=>{
  const view=buildEnvironmentView(testState(),{municipios:cities,now:NOW});
  const online=await consultarColetor({municipio:'itaituba',fetchFn:async()=>response(view)});
  const indisponivel=await consultarColetor({municipio:'itaituba',fetchFn:async()=>response('falha',503)});
  assert.equal(indicadorPrincipal(online).pm25,0);
  assert.equal(online.modoOffline,undefined);
  assert.equal(indisponivel.indisponivel,true);
  assert.equal(indicadorPrincipal(indisponivel).pm25,null);
  assert.match(indisponivel.aviso,/servidor indisponível/i);
});
test('erro de rede deixa leitura indisponível em vez de inventar zero',async()=>{
  const payload=await consultarColetor({municipio:'itaituba',fetchFn:async()=>{throw new Error('sem conexão');}});
  assert.equal(indicadorPrincipal(payload).pm25,null);
  assert.equal(payload.indisponivel,true);
  assert.match(payload.erroConsulta,/sem conexão/i);
});
test('cache do INPE antigo não transforma ausência de registros em zero atual',()=>{
  const s=testState();
  const view=buildEnvironmentView(s,{municipios:cities,now:NOW+2*3600000});
  assert.equal(view.focos.total,null);
  assert.equal(view.focos.contagemCompleta,false);
});
test('cache anterior elimina matérias antigas que só mencionam Pará genericamente',async()=>{
  const state=testState();
  state.noticias=[{id:'legada',titulo:'Brigadistas atuam em incêndio florestal no Pará',link:'https://site.example/legada',publicadoEm:'2026-10-18T17:00:00Z'}];
  const fetchFn=async url=>{
    if(url.includes('air-quality-api.open-meteo'))return response([air('2026-10-18T18:00',2),air('2026-10-18T18:00',8)]);
    if(url.includes('api.open-meteo'))return response([weather('2026-10-18T18:00',6),weather('2026-10-18T18:00',4)]);
    return response('não disponível',404);
  };
  const result=await collectAll(state,{fetchFn,now:NOW,municipios:cities,sources:[]});
  assert.equal(result.noticias.length,0);
});
test('site com feed divulgado quebrado ainda tenta fallback WordPress antes de índice',async()=>{
  const {collectSource}=await import('../collector.mjs');
  const source={id:'teste',nome:'Fonte',url:'https://news.example.org/',dominio:'news.example.org'};
  const html='<html><link rel="alternate" type="application/rss+xml" href="/rss-invalido"></html>';
  const rss='<?xml version="1.0"?><rss><channel><item><title>Brigadistas combatem incêndio florestal em Itaituba</title><link>https://news.example.org/123</link><pubDate>Sun, 18 Oct 2026 17:00:00 GMT</pubDate></item></channel></rss>';
  const fetchFn=async url=>url===source.url?response(html):url==='https://news.example.org/feed/'?response(rss):response('404',404);
  const result=await collectSource(source,{fetchFn,now:NOW});
  assert.equal(result.status,'ok_rss');assert.equal(result.totalAceitos,1);
});
