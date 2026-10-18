/* Integração de leitura para o site/APK: cartão e panorama exibem o mesmo snapshot. */
const chave=({municipio,raioKm,horas,satelite})=>`sentinela-env-v21:${municipio}:${raioKm}:${horas}:${satelite}`;
const numero=(x)=>typeof x==='number'&&Number.isFinite(x)?x:null;
export function indicadorPrincipal(payload){
  if(payload?.indisponivel||!payload?.cidade)return {pm25:null,aqiEUA:null,ventoKmh:null,detecoes:null,estadoAr:'sem_dados',estadoVento:'sem_dados',estadoINPE:'sem_dados'};
  const fromAPI=payload.indicadores;
  const pick=(k,fallback)=>numero(fromAPI && k in fromAPI ? fromAPI[k] : fallback);
  return {pm25:pick('pm25',payload.ar?.dados?.pm25),
    aqiEUA:pick('aqiEUA',payload.ar?.dados?.aqiEUA),
    ventoKmh:pick('ventoKmh',payload.tempo?.dados?.ventoKmh),
    detecoes:pick('detecoes',payload.focos?.total),
    estadoAr:fromAPI?.estadoAr??payload.ar?.estado??'sem_dados',
    estadoVento:fromAPI?.estadoVento??payload.tempo?.estado??'sem_dados',
    estadoINPE:fromAPI?.estadoINPE??payload.focos?.estado??'sem_dados',
    referenciaAr:fromAPI?.referenciaAr??payload.ar?.observadoEm??null,
    referenciaVento:fromAPI?.referenciaVento??payload.tempo?.observadoEm??null,
    contagemCompleta:payload.focos?.contagemCompleta===true&&!payload.modoOffline,
    limiteInferior:payload.focos?.limiteInferior??null};
}
export function municipioNoPanorama(payload){
  if(!payload?.cidade||!Array.isArray(payload.regional))return null;
  return payload.regional.find(item=>item.id===payload.cidade.id)??null;
}
export function verificarConsistencia(payload){
  const row=municipioNoPanorama(payload);
  if(!row)return {coerente:false,motivo:'Município ausente do panorama'};
  const selected=indicadorPrincipal(payload);
  const iguais=(a,b)=>a===b;
  const coerente=iguais(selected.pm25,numero(row.ar?.pm25))&&
    iguais(selected.ventoKmh,numero(row.tempo?.ventoKmh))&&
    iguais(selected.referenciaAr,row.referenciaAr??null)&&
    iguais(selected.referenciaVento,row.referenciaVento??null);
  return {coerente,motivo:coerente?null:'Indicadores não correspondem ao panorama regional'};
}
export async function consultarColetor({apiBase='',municipio='itaituba',raioKm=100,horas=24,satelite='todos',fetchFn=globalThis.fetch,storage=globalThis.localStorage,timeoutMs=10000}={}){
  const options={municipio,raioKm,horas,satelite},cacheKey=chave(options);
  const endpoint=`${apiBase}/api/environment?${new URLSearchParams({municipio,raioKm:String(raioKm),horas:String(horas),satelite})}`;
  try{
    const response=await fetchFn(endpoint,{cache:'no-store',signal:AbortSignal.timeout(timeoutMs)});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const payload=await response.json();
    if(!payload?.cidade?.id || !payload?.ar || !payload?.tempo || !payload?.focos || !Array.isArray(payload.regional))throw new Error('Contrato incompleto');
    if(payload.cidade.id!==municipio)throw new Error('A API devolveu município diferente do solicitado');
    const check=verificarConsistencia(payload);
    if(!check.coerente)throw new Error(check.motivo);
    try{storage?.setItem(cacheKey,JSON.stringify({salvoEm:new Date().toISOString(),payload}));}catch{}
    return {...payload,modoOffline:false,cacheLocal:false};
  }catch(error){
    try{
      const old=JSON.parse(storage?.getItem(cacheKey)||'null');
      if(old?.payload&&verificarConsistencia(old.payload).coerente){
        return {...old.payload,modoOffline:true,cacheLocal:true,salvoEm:old.salvoEm??null,
          aviso:'Dados salvos no aparelho: consulta atual indisponível. Não representam leitura em tempo real.',erroConsulta:String(error.message||error)};
      }
    }catch{}
    return {modoOffline:true,indisponivel:true,indicadores:indicadorPrincipal(null),
      aviso:'Sem dados disponíveis para o município e filtros selecionados.',erroConsulta:String(error?.message||error)};
  }
}
