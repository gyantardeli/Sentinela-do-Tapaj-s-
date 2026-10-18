/* Projeção única dos dados: cartões e panorama compartilham as mesmas referências.
   Recebe snapshot persistido, sem efetuar consultas externas. */
import { MUNICIPIOS } from './registry.mjs';
import { haversine, markStale } from './collector.mjs';

const DAY = 3600000;
const VALID_RADIUS = new Set([25, 50, 100, 200]);
const VALID_HOURS = new Set([6, 12, 24]);
const finite = value => typeof value === 'number' && Number.isFinite(value);

export function estadoMunicipal(layer, id, now, kind){
  const item=layer?.dados?.[id] ?? null;
  if(!item)return {estado:'sem_dados',dados:null,observadoEm:null,ultimaAtualizacao:layer?.ultimaAtualizacao??null};
  const observed=Date.parse(item.observadoEm??'');
  const age=Number.isFinite(observed)?now-observed:Infinity;
  const limite=kind==='ar'?4*DAY:2*DAY;
  const antigo=age>limite || age < -30*60_000;
  const falha=Boolean(layer?.falhasMunicipais?.[id]);
  const estado = antigo?'defasado':falha?'cache_anterior':layer?.estado==='cache_anterior'?'cache_anterior':layer?.estado==='erro'?'cache_anterior':'atual';
  return {estado,dados:item,observadoEm:item.observadoEm??null,ultimaAtualizacao:layer?.ultimaAtualizacao??null,
    antigo,usandoCache:falha||layer?.estado==='cache_anterior',erro:layer?.falhasMunicipais?.[id]??layer?.tipoErro??null};
}

export function buildEnvironmentView(state, {municipio='itaituba',raioKm=100,horas=24,satelite='todos',now=Date.now(),municipios=MUNICIPIOS}={}){
  const cidade=municipios.find(m=>m.id===municipio)??municipios[0];
  const raio=VALID_RADIUS.has(Number(raioKm))?Number(raioKm):100;
  const horasValidas=VALID_HOURS.has(Number(horas))?Number(horas):24;
  const cache=state?.camadas??{};
  const ar=markStale(cache.ar,now,'ar'),tempo=markStale(cache.tempo,now,'tempo'),inpe=markStale(cache.inpe,now,'inpe');
  const regional=municipios.map(m=>{
    const a=estadoMunicipal(ar,m.id,now,'ar');
    const t=estadoMunicipal(tempo,m.id,now,'tempo');
    return {municipio:m.nome,id:m.id,ar:a.dados,tempo:t.dados,estadoAr:a.estado,estadoTempo:t.estado,
      referenciaAr:a.observadoEm,referenciaVento:t.observadoEm,origemAr:a.dados?.origem??null,origemTempo:t.dados?.origem??null,
      detalhesAr:a,detalhesTempo:t};
  });
  const selecionada=regional.find(m=>m.id===cidade.id);
  const visao=layer=>({estado:layer?.estado??'nao_consultado',ultimaAtualizacao:layer?.ultimaAtualizacao??null,
    ultimaTentativa:layer?.ultimaTentativa??null,tipoErro:layer?.tipoErro??null,usandoCache:Boolean(layer?.usandoCache || layer?.estado==='cache_anterior'),defasado:Boolean(layer?.defasado)});
  const itens=inpe?.dados?.focos?.filter(f=>{
    const ts=Date.parse(f.data_hora_gmt);
    return Number.isFinite(ts)&&ts<=now+5*60_000&&now-ts<=horasValidas*DAY&&
      haversine(f.lat,f.lon,cidade.lat,cidade.lon)<=raio && (satelite==='todos'||f.satelite===satelite);
  })??[];
  const temINPE=Array.isArray(inpe?.dados?.focos);
  const ultima=Date.parse(inpe?.ultimaAtualizacao??'');
  const recente=Number.isFinite(ultima)&&now-ultima>=-5*60_000&&now-ultima<=75*60_000;
  const coberturaCompleta=temINPE&&!inpe?.dados?.parcial&&inpe?.estado==='atual'&&recente;
  const parcial=temINPE&&!coberturaCompleta;
  // Se o último arquivo disponível é antigo ou parcial, zero não comprova ausência.
  const total=temINPE && (coberturaCompleta||itens.length>0)?itens.length:null;
  const indicadores={pm25:finite(selecionada?.ar?.pm25)?selecionada.ar.pm25:null,
    aqiEUA:finite(selecionada?.ar?.aqiEUA)?selecionada.ar.aqiEUA:null,
    ventoKmh:finite(selecionada?.tempo?.ventoKmh)?selecionada.tempo.ventoKmh:null,
    detecoes:total,estadoAr:selecionada?.estadoAr??'sem_dados',estadoVento:selecionada?.estadoTempo??'sem_dados',
    estadoINPE:inpe?.estado??'nao_consultado',referenciaAr:selecionada?.referenciaAr??null,
    referenciaVento:selecionada?.referenciaVento??null};
  return {cidade,raioKm:raio,horas:horasValidas,satelite,
    focos:{...visao(inpe),itens,total,contagemCompleta:coberturaCompleta,parcial,
      limiteInferior:parcial&&itens.length>0?itens.length:null,origem:'INPE CSV oficial'},
    ar:{...visao(ar),estado:selecionada?.estadoAr??'sem_dados',dados:selecionada?.ar??null,observadoEm:selecionada?.referenciaAr??null},
    tempo:{...visao(tempo),estado:selecionada?.estadoTempo??'sem_dados',dados:selecionada?.tempo??null,observadoEm:selecionada?.referenciaVento??null},
    regional,indicadores,ultimaExecucao:state?.ultimaExecucao??null,referenciaConsulta:new Date(now).toISOString()};
}
