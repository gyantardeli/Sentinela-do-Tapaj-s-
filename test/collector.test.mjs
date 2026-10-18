import test from 'node:test';
import assert from 'node:assert/strict';
import {
 csvRows, parseINPE, parseOpenMeteo, layer, markStale, parseFeed, validArticle,
 collectSource, collectINPE, collectAll, emptyState, getText, classifyError
} from '../collector.mjs';

const NOW=Date.parse('2026-10-18T18:00:00Z');
const sites=[{id:'itaituba',nome:'Itaituba',lat:-4.2637,lon:-55.9916}];
const source={id:'teste',nome:'Veículo Teste',url:'https://noticias.exemplo.org/',dominio:'noticias.exemplo.org'};
const article='Brigadistas combatem incêndio florestal em Itaituba no Pará';
const sampleRss=`<?xml version="1.0"?><rss><channel><title>Veículo</title><item><title>${article}</title><link>https://noticias.exemplo.org/123</link><pubDate>Sun, 18 Oct 2026 17:00:00 GMT</pubDate></item></channel></rss>`;
function http(content,status=200,headers={}){return new Response(content,{status,headers});}

test('CSV com vírgulas, aspas e quebra de linha é separado corretamente',()=>{
  assert.deepEqual(csvRows('a,b\r\n"um, dois","x""y"\r\n'),[['a','b'],['um, dois','x"y']]);
});
test('INPE mantém foco regional e rejeita registros antigos, fora do raio ou futuros',()=>{
  const csv=`id,lat,lon,data_hora_gmt,satelite\n1,-4.2637,-55.9916,2026-10-18 17:00:00,NPP-375\n2,-4.2637,-55.9916,2026-10-16 14:00:00,NPP-375\n3,-20,-47,2026-10-18 17:00:00,NPP-375\n4,-4.2637,-55.9916,2026-10-19 17:00:00,NPP-375\n`;
  const result=parseINPE(csv,{now:NOW,municipios:sites,hours:24,radiusKm:100});
  assert.equal(result.length,1);assert.equal(result[0].data_hora_gmt,'2026-10-18T17:00:00.000Z');
});
test('INPE rejeita cabeçalho inesperado',()=>{
  assert.throws(()=>parseINPE('unknown,x\n1,2'),e=>e.code==='CSV_INVALID');
});
test('Open-Meteo preserva zero válido sem confundir com ausência',()=>{
  const result=Object.fromEntries(parseOpenMeteo([{current:{time:'2026-10-18T18:00',pm2_5:0,pm10:0,us_aqi:0},hourly:{time:['2026-10-18T18:00'],pm2_5:[0]}}],'ar',sites));
  assert.equal(result.itaituba.pm25,0);assert.equal(result.itaituba.aqiEUA,0);
});
test('falha de atualização preserva o último registro válido e identifica dado defasado',()=>{
  const a=layer(null,{itaituba:{pm25:0}},null,'ar',NOW-4*3600000);
  const b=layer(a,null,new Error('Falha externa'),'ar',NOW);
  assert.equal(b.estado,'cache_anterior');assert.equal(b.dados.itaituba.pm25,0);
  assert.equal(markStale(b,NOW,'ar').estado,'defasado');
});
test('RSS válido é interpretado sem gerar notícias artificiais',()=>{
  assert.equal(parseFeed(sampleRss).length,1);
  assert.equal(validArticle(parseFeed(sampleRss)[0],NOW).titulo,article);
  assert.equal(validArticle({title:'Fumaça — notícias de Itaituba',link:'https://noticias.exemplo.org/a',date:'2026-10-18'},NOW),null);
  assert.equal(validArticle({title:'Incêndio atinge casa no centro de Itaituba',link:'https://noticias.exemplo.org/b',date:'2026-10-18'},NOW),null);
});
test('RSS direto detectado em rel alternate recebe estado correto',async()=>{
 const fn=async url=>{
   if(url===source.url)return http('<html><link rel="alternate" type="application/rss+xml" href="/feed.xml"></html>');
   if(url==='https://noticias.exemplo.org/feed.xml')return http(sampleRss);
   throw new Error('chamada inesperada '+url);
 };
 const ret=await collectSource(source,{fetchFn:fn,now:NOW});
 assert.equal(ret.status,'ok_rss');assert.equal(ret.artigos.length,1);
});
test('fallback Google Notícias verifica domínio real da fonte e marca cobertura parcial',async()=>{
 const google=`<?xml version="1.0"?><rss><channel><item><title>${article}</title><link>https://news.google.com/articles/123</link><pubDate>Sun, 18 Oct 2026 17:00:00 GMT</pubDate><source url="https://noticias.exemplo.org/">Veículo Teste</source></item><item><title>${article}</title><link>https://news.google.com/articles/456</link><pubDate>Sun, 18 Oct 2026 17:00:00 GMT</pubDate><source url="https://outro.example/">Outro site</source></item></channel></rss>`;
 const fn=async url=>url.includes('news.google.com')?http(google):http('',404);
 const ret=await collectSource(source,{fetchFn:fn,now:NOW});
 assert.equal(ret.status,'parcial_indice');assert.equal(ret.artigos.length,1);assert.equal(ret.descartadosOrigem,1);
});
test('INPE aceita dia disponível com falha no segundo dia, classificada como parcial',async()=>{
 const csv='id,lat,lon,data_hora_gmt,satelite\n1,-4.2637,-55.9916,2026-10-18 17:00:00,NPP-375\n';
 const fn=async url=>url.includes('20261018')?http(csv):http('error',404);
 const ret=await collectINPE({fetchFn:fn,now:NOW,municipios:sites});
 assert.equal(ret.parcial,true);assert.equal(ret.focos.length,1);assert.equal(ret.errosParciais.length,1);
});
test('HTTP 429 não entra em laço de tentativas e preserva indicação de limite',async()=>{
 let calls=0;
 await assert.rejects(getText('https://example.org',{fetchFn:async()=>{calls++;return http('limite',429,{'retry-after':'120'})}}),e=>e.code===429&&e.retryAfter===120);
 assert.equal(calls,1);assert.equal(classifyError({code:429}),'limite_de_requisicoes');
});
test('falha no INPE não destrói dados anteriores quando meteorologia atualiza',async()=>{
 const prior=emptyState();
 prior.camadas.inpe=layer(null,{focos:[{lat:-4.2,lon:-56,data_hora_gmt:'2026-10-18T17:00:00.000Z',satelite:'NPP-375'}]},null,'inpe',NOW-3600000);
 const fn=async url=>{
   if(url.includes('air-quality-api.open-meteo'))return http(JSON.stringify([{current:{time:'2026-10-18T18:00',pm2_5:0,us_aqi:0}}]));
   if(url.includes('api.open-meteo'))return http(JSON.stringify([{current:{time:'2026-10-18T18:00',wind_speed_10m:0,temperature_2m:25}}]));
   return http('Não disponível',404);
 };
 const ret=await collectAll(prior,{fetchFn:fn,now:NOW,municipios:sites,sources:[]});
 assert.equal(ret.camadas.inpe.estado,'cache_anterior');
 assert.equal(ret.camadas.inpe.dados.focos.length,1);
 assert.equal(ret.camadas.ar.dados.itaituba.pm25,0);
 assert.equal(ret.camadas.tempo.dados.itaituba.ventoKmh,0);
});


test('INPE parcial preserva focos recentes do cache, mas não os vencidos',async()=>{
  const previous=emptyState();
  previous.camadas.inpe=layer(null,{focos:[
    {lat:-4.2637,lon:-55.9916,data_hora_gmt:'2026-10-17T23:00:00.000Z',satelite:'NPP-375'},
    {lat:-4.2637,lon:-55.9916,data_hora_gmt:'2026-10-16T12:00:00.000Z',satelite:'NPP-375'}
  ],parcial:false},null,'inpe',NOW-3600000);
  const csv='id,lat,lon,data_hora_gmt,satelite\n1,-4.2637,-55.9916,2026-10-18 17:00:00,NPP-375\n';
  const weather=[{current:{time:'2026-10-18T18:00:00Z',temperature_2m:28,wind_speed_10m:3}}];
  const air=[{current:{time:'2026-10-18T18:00:00Z',pm2_5:3}}];
  const fn=async url=>{
    if(url.includes('20261018'))return http(csv);
    if(url.includes('20261017'))return http('indisponível',404);
    if(url.includes('air-quality-api.open-meteo'))return http(JSON.stringify(air));
    if(url.includes('api.open-meteo'))return http(JSON.stringify(weather));
    throw new Error('URL inesperada');
  };
  const state=await collectAll(previous,{fetchFn:fn,now:NOW,municipios:sites,sources:[]});
  const inpe=state.camadas.inpe;
  assert.equal(inpe.estado,'parcial');
  assert.equal(inpe.dados.focos.length,2);
  assert.equal(inpe.dados.recuperadosCache,1);
  assert.ok(inpe.dados.focos.some(x=>x.data_hora_gmt.startsWith('2026-10-17')));
  assert.ok(!inpe.dados.focos.some(x=>x.data_hora_gmt.startsWith('2026-10-16')));
});

test('INPE completo substitui cache antigo e admite resultado vazio',async()=>{
  const previous=emptyState();
  previous.camadas.inpe=layer(null,{focos:[{
    lat:-4.2637,lon:-55.9916,data_hora_gmt:'2026-10-18T17:00:00.000Z',satelite:'NPP-375'
  }]},null,'inpe',NOW-3600000);
  const csv='id,lat,lon,data_hora_gmt,satelite\n';
  const fn=async url=>{
    if(url.includes('focos_diario_br_'))return http(csv);
    if(url.includes('air-quality-api'))return http(JSON.stringify([{current:{time:'2026-10-18T18:00:00Z',pm2_5:0}}]));
    if(url.includes('api.open-meteo'))return http(JSON.stringify([{current:{time:'2026-10-18T18:00:00Z',wind_speed_10m:0}}]));
    throw new Error('URL inesperada');
  };
  const state=await collectAll(previous,{fetchFn:fn,now:NOW,municipios:sites,sources:[]});
  assert.equal(state.camadas.inpe.estado,'atual');
  assert.equal(state.camadas.inpe.dados.focos.length,0);
  assert.equal(state.camadas.inpe.dados.recuperadosCache,0);
});
