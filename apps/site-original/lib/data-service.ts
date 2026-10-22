import { weatherLinks } from "./weather-providers";
import { loadEnvironmentSnapshot } from "./environment-snapshot";
import { municipalState } from "./environment-merge";
import { collectFires, previousFires, mergeFireCollections, type FireCollection } from "./fire-collector";
import { readFireSnapshot } from "./fire-store";
import { fireView, fireDiagnosticText } from "./fire-snapshot";
import { sourceJson } from "./source-http";
import { nearestAir, stamp, type DashboardData, type Place, type Sensor, type SourceState } from "./environment";

type ObjectData = Record<string, any>;
const cache = new Map<string, { until: number; value: unknown }>();
const pending = new Map<string, Promise<any>>();
async function memo<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prior = cache.get(key);
  if (prior && prior.until > Date.now()) return prior.value as T;
  if (pending.has(key)) return pending.get(key)!;
  const promise = fn().then(value => { cache.set(key, { until: Date.now() + 600_000, value }); if (cache.size > 24) cache.delete(cache.keys().next().value!); return value; }).finally(() => pending.delete(key));
  pending.set(key, promise); return promise;
}
async function getFires() {
  const saved=await readFireSnapshot();
  if(saved){const view=fireView(saved,Math.floor(Date.now()/1000));if(view)return view;throw new Error(fireDiagnosticText(saved,Math.floor(Date.now()/1000)));}
  return memo("fires", async () => {
    const now=Math.floor(Date.now()/1000), previous=cache.get("fires")?.value as FireCollection|undefined;
    try { return mergeFireCollections(previous??null,await collectFires(now),now); }
    catch(error) { if(previous&&now-previous.checkedAt<=86400)return previousFires(previous,now,error);throw error; }
  });
}
async function getSelva(): Promise<Sensor[]> {
  return memo("selva", async () => {
    const json = await sourceJson("https://appselva.com.br/api.php?route=purpleair", { method: "POST", attempts: 1, timeoutMs: 8500, maxBytes: 2_000_000 }) as ObjectData;
    if (json.error || !Array.isArray(json.fields) || !Array.isArray(json.data)) throw new Error("Consulta automatizada não disponível; confira a leitura no SELVA.");
    const list: Sensor[] = [];
    for (const values of json.data) {
      const row = Object.fromEntries(json.fields.map((f: string, i: number) => [f, values[i]]));
      const { latitude: lat, longitude: lon, "pm2.5": pm25, last_seen: time } = row;
      if ([lat, lon, pm25, time].every(x => typeof x === "number" && Number.isFinite(x)) && lat >= -11 && lat <= 1 && lon >= -62 && lon <= -50 && pm25 >= 0) list.push({ id: String(row.sensor_index), name: String(row.name), lat, lon, pm25, time });
    }
    return list;
  });
}
export async function loadDashboard(place: Place): Promise<DashboardData> {
  const observations = Promise.allSettled([getFires(),getSelva()]);
  const environment = await loadEnvironmentSnapshot();
  return memo("dashboard:" + place.lat + ":" + place.lon + ":" + environment.resolvedAt, async () => {
    const checkedAt=environment.resolvedAt;
    const airState=municipalState(environment.air,place.id,checkedAt),weatherState=municipalState(environment.weather,place.id,checkedAt);
    const [fireResult,selvaResult]=await observations;
    const state = (id: string, name: string, status: SourceState["status"], detail: string, url: string, dataTime: number | null,sourceCheckedAt=checkedAt): SourceState => ({ id, name, status, detail, url, dataTime, checkedAt:sourceCheckedAt });
    const air=airState.location?.points??[];
    const weather=weatherState.location?.value??null;
    const fires = fireResult.status === "fulfilled" ? fireResult.value.fires : [];
    const sensors = selvaResult.status === "fulfilled" ? selvaResult.value : [];
    return { fetchedAt: checkedAt, place, air, weather, fires, sensors, regional: (environment.air?.locations??[]).map(p=>{const c=nearestAir(p.points,checkedAt);return {id:p.placeId,pm25:c?.pm25??null,aqi:c?.aqi??null,time:c?.time??null};}), fireCoverage: fireResult.status === "fulfilled" ? fireResult.value.coverage : null, sources: [
      state("inpe", "INPE · Programa Queimadas", fireResult.status === "fulfilled" ? (fireResult.value.coverage.complete ? "ok" : "partial") : "unavailable", fireResult.status === "fulfilled" ? fireResult.value.detail + (fireResult.value.failures?.length ? " Falhas: "+fireResult.value.failures.map(f=>f.file+": "+f.kind+" "+f.detail).join("; ").slice(0,400) : "") + " Atributos ambientais por detecção, quando publicados; valores inválidos são omitidos." : "Consulta indisponível. A ausência de dados não significa ausência de fogo. "+(fireResult.reason instanceof Error?fireResult.reason.message.slice(0,400):""), "https://data.inpe.br/queimadas/portal/", fireResult.status === "fulfilled" ? fireResult.value.last||null : null,fireResult.status === "fulfilled" ? fireResult.value.checkedAt : checkedAt),
      {...state("air","CAMS / Open-Meteo · ar",airState.status,"Modelo global CAMS, grade aproximada de 45 km. Série horária interpolada; não é sensor no local."+environmentNote(airState),"https://open-meteo.com/en/docs/air-quality-api",nearestAir(air,checkedAt)?.time??null,environment.air?.attemptedAt??checkedAt),stale:airState.stale,collectedAt:airState.collectedAt},
      {...state("weather","Open-Meteo · meteorologia",weatherState.status,"Condições calculadas por modelo. Vento a 10 m; velocidade em km/h. Pode diferir do modelo selecionado no Windy."+environmentNote(weatherState),"https://open-meteo.com/en/docs",weather?.time??null,environment.weather?.attemptedAt??checkedAt),stale:weatherState.stale,collectedAt:weatherState.collectedAt},
      state("selva", "SELVA · sensores", selvaResult.status === "fulfilled" ? "ok" : "manual", selvaResult.status === "fulfilled" ? "Sensores de baixo custo disponibilizados pelo SELVA. Verifique distância, horário e manutenção." : "Consulta automática indisponível. Abra o SELVA e registre uma leitura com local e horário para comparar.", "https://www.appselva.com.br/", sensors.length ? Math.max(...sensors.map(s => s.time)) : null),
      state("windy", "Windy · mapa", "embedded", "Mapa oficial incorporado e sincronizado pelo centro e pela camada. Números do painel não são extraídos do Windy; consulte o horário no próprio mapa.", "https://www.windy.com/", null),
      state("accuweather", "AccuWeather · previsão do tempo", "external", "Consulta por município, com acesso à previsão horária e diária no site original. Sem extração automática dos valores do AccuWeather.", weatherLinks(place).accu, null),
      state("climaeradar", "Clima & Radar · previsão e radar", "widget", weatherLinks(place).climaExact ? "Widget oficial de previsão para o município selecionado e radar com horizonte de 24 h. O fornecedor atualiza o conteúdo incorporado." : "Radar centralizado no município selecionado; widget com referência de Itaituba. A localidade exata ainda não foi confirmada para este widget.", weatherLinks(place).climaRadar, null),
    ] };
  });
}

function environmentNote(state:{collectedAt:number|null;stale:boolean;error:string|null;location:unknown}) {
 if(!state.location)return " Leitura indisponível. "+(state.error??"A fonte não respondeu.");
 return ` Coleta: ${stamp(state.collectedAt,true)} (UTC−3).`+(state.stale||state.error?" Última leitura válida preservada; atualização parcial ou defasada. "+(state.error??""):" Horário original preservado.");
}
