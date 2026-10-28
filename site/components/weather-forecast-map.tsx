"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, CloudRain, Crosshair, Map as MapIcon, MapPin, Minus, Plus, RefreshCw, Thermometer, Wind } from "lucide-react";
import { PLACES, display, stamp, type Place } from "../lib/environment";
import { weatherLinks } from "../lib/weather-providers";
import { FORECAST_PROVIDER_NAMES, forecastPoint, forecastStale, type ForecastLocation, type ForecastMapData, type ForecastProvider } from "../lib/weather-capture";
import { historyProject } from "../lib/history-timeline";
import { useSnapshot } from "./use-snapshot";

type Metric = "temperature" | "rainProbability" | "wind";
type Horizon = "current" | "hourly" | "daily";
type Frame = { horizon: Horizon; time: number | null; day: string | null; now: number };
const W = 1000, H = 630;
const labelDay = (day: string) => day.slice(8,10) + "/" + day.slice(5,7);
const hour = (time: number) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Santarem", hour: "2-digit", minute: "2-digit", hour12: false }).format(time * 1000);
const units: Record<Metric,string> = { temperature: "°C", rainProbability: "%", wind: "km/h" };
const shifts: Record<string,{x:number;y:number}> = { itaituba:{x:-43,y:-10}, trairao:{x:-28,y:38}, ruropolis:{x:28,y:25}, placas:{x:45,y:-5}, aveiro:{x:-28,y:-20} };
const sourceUrl = (provider: ForecastProvider, place: Place) => provider === "accuweather" ? weatherLinks(place).accu : weatherLinks(place).clima;
export function rowValue(row: ForecastLocation | undefined, frame: Frame, metric: Metric): number | null {
  if (!row?.capture || forecastStale(row, frame.now)) return null;
  if (frame.horizon === "hourly" && frame.time === null) return null;
  if (frame.horizon === "daily") { const day = row.capture.daily.find(d => d.day === frame.day); return metric === "temperature" ? day?.max ?? null : metric === "rainProbability" ? day?.rainProbability ?? null : null; }
  return forecastPoint(row, frame.horizon === "current" ? null : frame.time)?.[metric] ?? null;
}
const shown = (value: number | null, metric: Metric) => value === null ? "—" : display(value, metric === "wind" ? 1 : 0);
function color(value: number | null, metric: Metric) {
  if (value === null) return "#dce4d4";
  if (metric === "rainProbability") return value >= 75 ? "#376b9f" : value >= 50 ? "#448ba3" : value >= 25 ? "#6a9c8a" : "#91a77b";
  if (metric === "wind") return value >= 40 ? "#785d8e" : value >= 25 ? "#3c7599" : value >= 10 ? "#5b9289" : "#88a676";
  return value >= 36 ? "#bb6e4b" : value >= 31 ? "#b58d4d" : value >= 26 ? "#789360" : "#518d9b";
}
function reference(row: ForecastLocation | undefined, frame: Frame) {
  if (!row?.capture) return "Sem captura válida";
  if (frame.horizon === "daily") return frame.day ? labelDay(frame.day) + " · previsão diária" : "Sem dia";
  const point = frame.horizon === "current" ? row.capture.current : row.capture.hourly.find(p => p.time === frame.time);
  return point ? stamp(point.time, true) + " · UTC−3" : "Sem previsão para este horário";
}
function downloadCsv(data: ForecastMapData, frame: Frame, metric: Metric) {
  const rows: (string|number)[][] = [["fornecedor","municipio","horizonte","data_ou_horario_UTC_menos_3","indicador","valor","unidade","estado_da_captura","capturado_em_UTC","referencia_exibida_pela_fonte_UTC","pagina_fonte"]];
  for (const place of PLACES) { const row = data.locations.find(r => r.placeId === place.id); rows.push([FORECAST_PROVIDER_NAMES[data.provider],place.name,frame.horizon,frame.day ?? (frame.time ? new Date((frame.time - 10800)*1000).toISOString().replace("Z","-03:00") : "atual"),metric,rowValue(row,frame,metric) ?? "",units[metric],row?.state ?? "unavailable",row?.capture ? new Date(row.capture.collectedAt*1000).toISOString() : "",row?.capture ? new Date(row.capture.pageTime*1000).toISOString() : "",sourceUrl(data.provider,place)]); }
  const csv = "\uFEFF" + rows.map(r => r.map(v => '"' + String(v).replaceAll('"','""') + '"').join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"})), a = document.createElement("a"); a.href=url; a.download=`previsao-${data.provider}-${metric}.csv`; a.click(); URL.revokeObjectURL(url);
}

export default function WeatherForecastMap({ place }: { place: Place }) {
  const accu = useSnapshot<ForecastMapData>("/api/weather-map?provider=accuweather");
  const clima = useSnapshot<ForecastMapData>("/api/weather-map?provider=climaeradar");
  const sources = { accuweather: accu, climaeradar: clima };
  const [provider,setProvider] = useState<ForecastProvider>("accuweather"), [focusId,setFocusId] = useState(place.id);
  const [metric,setMetric] = useState<Metric>("temperature"), [horizon,setHorizon] = useState<Horizon>("current");
  const [time,setTime] = useState<number | null>(null), [day,setDay] = useState<string | null>(null), [clockNow,setClockNow] = useState(0);
  const [zoomChange,setZoomChange] = useState(0), [offset,setOffset] = useState({x:0,y:0});
  const [baseError,setBaseError] = useState(false);
  const id = useId(), drag=useRef<{x:number;y:number;ox:number;oy:number}|null>(null);
  const selected=sources[provider], data=selected.data, focused=PLACES.find(p=>p.id===focusId) ?? place;
  const selectedRow=data?.locations.find(r=>r.placeId===focused.id);
  const allData=[accu.data,clima.data].filter((d):d is ForecastMapData=>!!d);
  const now=Math.max(clockNow,...allData.map(d=>d.now));
  const times=useMemo(()=>[...new Set(data?.locations.flatMap(r=>!forecastStale(r,now) ? r.capture?.hourly.map(p=>p.time).filter(t=>t>=Math.ceil((now||0)/3600)*3600 && t<=now+24*3600) ?? [] : []) ?? [])].sort((a,b)=>a-b),[data,now]);
  const days=useMemo(()=>[...new Set([accu.data,clima.data].flatMap(d=>d?.locations.flatMap(r=>!forecastStale(r,now) ? r.capture?.daily.map(p=>p.day) ?? [] : []) ?? []))].filter(day=>day>=new Date((now-10800)*1000).toISOString().slice(0,10)).sort().slice(0,7),[accu.data,clima.data,now]);
  const activeTime=times.includes(time!) ? time : times[0] ?? null, activeDay=days.includes(day!) ? day : days[0] ?? null;
  const frame: Frame={horizon,time:activeTime,day:activeDay,now};
  const value=rowValue(selectedRow,frame,metric), point=horizon!=="daily" && !(horizon==="hourly"&&activeTime===null) ? forecastPoint(selectedRow,horizon==="current"?null:activeTime,now) : null;
  const daily=!forecastStale(selectedRow,now)?selectedRow?.capture?.daily.find(d=>d.day===activeDay):undefined;
  const coverage=data?.locations.filter(r=>rowValue(r,frame,metric)!==null).length ?? 0;
  const zoom=6.9+zoomChange, z=Math.floor(zoom), tileSize=256*2**(zoom-z), center=historyProject(-4.8,-55.9,zoom), left=center.x-W/2-offset.x, top=center.y-H/2-offset.y;
  const baseEnabled=!baseError;
  const tiles=useMemo(()=>{ if(!baseEnabled)return [];const list=[];for(let x=Math.floor(left/tileSize);x<=Math.floor((left+W)/tileSize);x++)for(let y=Math.floor(top/tileSize);y<=Math.floor((top+H)/tileSize);y++)list.push({x,y,url:`https://tile.openstreetmap.org/${z}/${x}/${y}.png`});return list; },[baseEnabled,left,top,z,tileSize]);
  useEffect(()=>setFocusId(place.id),[place.id]);
  useEffect(()=>{setClockNow(Math.floor(Date.now()/1000));const timer=setInterval(()=>setClockNow(Math.floor(Date.now()/1000)),60000);return()=>clearInterval(timer);},[]);
  function changeMetric(next:Metric){setMetric(next);if(next==="rainProbability"&&horizon==="current")setHorizon("hourly");if(next==="wind"&&horizon==="daily")setHorizon("current");}
  function changeHorizon(next:Horizon){setHorizon(next);if(next==="daily"&&metric==="wind")setMetric("temperature");}
  const frameTitle=horizon==="current"?"Condição atual":horizon==="daily"?`${activeDay?labelDay(activeDay):"—"} · previsão diária`:`${activeTime?stamp(activeTime,true):"—"} · UTC−3`;
  return <div className="forecast-map-module">
    <section className="panel forecast-map-panel" aria-labelledby={`${id}-title`}>
      <div className="panel-head"><div><span className="eyebrow"><MapIcon size={14}/>TEMPO NA REGIÃO</span><h2 id={`${id}-title`}>Mapa de previsão regional</h2><p>Dados capturados nas páginas públicas das duas fontes · oito sedes do Tapajós.</p></div><div className="forecast-map-actions"><button className="button secondary" disabled={!data} onClick={()=>data&&downloadCsv(data,frame,metric)}><ArrowDownToLine size={14}/>CSV</button><button className="button secondary" disabled={accu.loading||clima.loading} onClick={()=>{void accu.load();void clima.load();}}><RefreshCw size={14} className={accu.loading||clima.loading?"spin":""}/>Atualizar leitura</button></div></div>
      <div className="forecast-map-toolbar"><div className="forecast-switch" role="group" aria-label="Fonte do mapa de previsão">{(["accuweather","climaeradar"] as const).map(p=><button key={p} aria-pressed={provider===p} onClick={()=>setProvider(p)}>{FORECAST_PROVIDER_NAMES[p]}</button>)}</div><div className="forecast-switch" role="group" aria-label="Indicador meteorológico"><button aria-pressed={metric==="temperature"} onClick={()=>changeMetric("temperature")}><Thermometer size={14}/>Temperatura</button><button aria-pressed={metric==="rainProbability"} onClick={()=>changeMetric("rainProbability")}><CloudRain size={14}/>Chance de chuva</button><button aria-pressed={metric==="wind"} onClick={()=>changeMetric("wind")}><Wind size={14}/>Vento</button></div><label>Horizonte<select value={horizon} onChange={e=>changeHorizon(e.target.value as Horizon)}><option value="current">Atual</option><option value="hourly">Por hora · até 24 h</option><option value="daily">Por dia · até 7 dias</option></select></label></div>
      {(selected.error || allData.some(d=>d.locations.some(r=>r.state!=="ok"||forecastStale(r,now))))&&<div className="forecast-capture-notice" role="status">{selected.error || "Há consultas sem resposta ou com cópia anterior. O estado de cada município aparece na tabela abaixo."}</div>}
      <div className="forecast-map-layout"><div className="forecast-map-canvas">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="group" aria-label={`Mapa de ${metric==="temperature"?horizon==="daily"?"temperatura máxima prevista":"temperatura":metric==="rainProbability"?"probabilidade de chuva":"vento"} · ${FORECAST_PROVIDER_NAMES[provider]} · ${frameTitle}`}
          onPointerDown={e=>{if((e.target as Element).closest("[data-forecast-city]"))return;drag.current={x:e.clientX,y:e.clientY,ox:offset.x,oy:offset.y};e.currentTarget.setPointerCapture(e.pointerId);}}
          onPointerMove={e=>{if(!drag.current)return;const box=e.currentTarget.getBoundingClientRect(),scale=Math.max(box.width/W,box.height/H);setOffset({x:drag.current.ox+(e.clientX-drag.current.x)/scale,y:drag.current.oy+(e.clientY-drag.current.y)/scale});}}
          onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
          <defs><pattern id={`${id}-grid`} width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#d4dfcd"/></pattern></defs><rect width={W} height={H} fill="#edf2e7"/><rect width={W} height={H} fill={`url(#${id}-grid)`}/>
          {tiles.map(t=><image key={`${z}-${t.x}-${t.y}`} href={t.url} x={t.x*tileSize-left} y={t.y*tileSize-top} width={tileSize+.5} height={tileSize+.5} opacity=".85" onError={()=>setBaseError(true)}/>)}
          {PLACES.map(p=>{const r=data?.locations.find(r=>r.placeId===p.id),n=rowValue(r,frame,metric),pos=historyProject(p.lat,p.lon,zoom),c={x:pos.x-left,y:pos.y-top},shift=shifts[p.id]??{x:0,y:0},m={x:c.x+shift.x,y:c.y+shift.y},selected=p.id===focused.id;
            return <g key={p.id}><line x1={c.x} y1={c.y} x2={m.x} y2={m.y} stroke="#70866a" strokeWidth="1.3"/><circle cx={c.x} cy={c.y} r="3" fill="#51724b" stroke="white"/>
              <g data-forecast-city="true" className="forecast-city-marker" role="button" tabIndex={0} aria-pressed={selected} aria-label={`${p.name}: ${shown(n,metric)} ${units[metric]}${r?.state==="partial"?", cópia anterior":""}`} onClick={()=>setFocusId(p.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setFocusId(p.id);}}}>
                <title>{`${p.name} · ${shown(n,metric)} ${units[metric]} · ${reference(r,frame)}${r?.state!=="ok"?" · "+(r?.detail??"Aguardando captura"):""}`}</title>{selected&&<circle cx={m.x} cy={m.y} r="28" fill="none" stroke="#2e593c" strokeWidth="2"/>}<circle cx={m.x} cy={m.y} r="23" fill={color(n,metric)} stroke="white" strokeWidth="2.5" strokeDasharray={r?.state==="partial"?"4 3":undefined}/><text x={m.x} y={m.y+5} className="forecast-map-number" textAnchor="middle" fill={n===null?"#687e5e":"#fff"}>{shown(n,metric)}{n!==null&&metric==="temperature"?"°":n!==null&&metric==="rainProbability"?"%":""}</text><text x={m.x} y={m.y+43} className="forecast-map-city" textAnchor="middle">{p.name}</text>
              </g></g>;
          })}
        </svg>
        <div className="forecast-map-stamp"><small>{FORECAST_PROVIDER_NAMES[provider]}</small><strong>{metric==="temperature"?horizon==="daily"?"Máxima prevista":"Temperatura":metric==="rainProbability"?"Chance de chuva":"Vento"}</strong><span>{frameTitle}</span></div>
        <div className="map-tools"><button aria-label="Aproximar mapa de previsão" disabled={zoomChange>=3} onClick={()=>{setZoomChange(z=>Math.min(3,z+.5));setOffset(o=>({x:o.x*Math.SQRT2,y:o.y*Math.SQRT2}));}}><Plus size={16}/></button><button aria-label="Afastar mapa de previsão" disabled={zoomChange<=-1} onClick={()=>{setZoomChange(z=>Math.max(-1,z-.5));setOffset(o=>({x:o.x/Math.SQRT2,y:o.y/Math.SQRT2}));}}><Minus size={16}/></button><button aria-label="Enquadrar região no mapa de previsão" onClick={()=>{setZoomChange(0);setOffset({x:0,y:0});}}><Crosshair size={16}/></button></div>
        {!baseEnabled&&<div className="forecast-map-base"><span>{baseError?"Fundo indisponível; valores preservados":"Mapa leve · coordenadas WGS84"}</span><button onClick={()=>{setBaseError(false);}}>Carregar mapa de fundo</button></div>}{baseEnabled&&<a className="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>}
        {!data&&<div className="forecast-map-loading" role="status">{selected.loading?`Capturando ${FORECAST_PROVIDER_NAMES[provider]}…`:"Captura indisponível nesta consulta."}</div>}
      </div><aside className="forecast-map-detail"><small><MapPin size={12}/>SEDE SELECIONADA</small><h3>{focused.name}</h3><p>{frameTitle}</p><div className="forecast-map-readout"><strong>{shown(value,metric)}<em>{units[metric]}</em></strong><span>{horizon==="daily"&&metric==="temperature"?`Mínima: ${display(daily?.min,0)} °C`:point?.condition??(metric==="rainProbability"?"Probabilidade para o horário selecionado":"Valor publicado pela fonte")}</span></div><div className="forecast-map-facts"><div><small>REFERÊNCIA EXIBIDA</small><span>{reference(selectedRow,frame)}</span></div><div><small>CAPTURA DA PÁGINA</small><span>{stamp(selectedRow?.capture?.collectedAt,true)} · UTC−3</span></div><div><small>COBERTURA DO QUADRO</small><span>{coverage}/8 municípios com valor disponível</span></div></div><a className="text-button" href={sourceUrl(provider,focused)} target="_blank" rel="noreferrer">Conferir no fornecedor<ArrowUpRight size={14}/></a><p className="forecast-map-detail-note">{forecastStale(selectedRow,now)?"Cópia com mais de duas horas; retirada do mapa atual.":selectedRow?.state==="partial"?selectedRow.detail:selectedRow?.state==="unavailable"?selectedRow.detail:"Os horários exibidos na página não comprovam o horário de uma estação ou a emissão do modelo."}</p></aside></div>
      {horizon==="hourly"&&<div className="forecast-time-strip" aria-label="Escolher horário da previsão">{times.map(t=><button key={t} aria-pressed={activeTime===t} onClick={()=>setTime(t)}><small>{labelDay(new Date((t-10800)*1000).toISOString().slice(0,10))}</small><strong>{hour(t)}</strong></button>)}{!times.length&&<p>Nenhum horário futuro disponível nas capturas.</p>}</div>}
      {horizon==="daily"&&<div className="forecast-time-strip" aria-label="Escolher dia da previsão">{days.map(d=><button key={d} aria-pressed={activeDay===d} onClick={()=>setDay(d)}><small>PREVISÃO</small><strong>{labelDay(d)}</strong></button>)}{!days.length&&<p>Nenhum dia disponível nas capturas.</p>}</div>}
      <div className="forecast-map-legend"><span>{metric==="temperature"?"Temperatura em °C":metric==="rainProbability"?"Probabilidade de chuva · %":"Velocidade do vento · km/h"}</span>{(metric==="temperature"?[25,30,35,40]:metric==="rainProbability"?[0,25,50,75]:[5,15,30,45]).map(n=><span key={n}><i style={{background:color(n,metric)}}/>{metric==="temperature"?`${n<26?"≤25":n<31?"26–30":n<36?"31–35":"≥36"}°`:metric==="rainProbability"?`${n}–${n===75?100:n+24}%`:n===5?"0–9":n===15?"10–24":n===30?"25–39":"≥40"}</span>)}<span><i style={{background:color(null,metric)}}/>Sem dado</span><span>Contorno tracejado: cópia anterior</span></div>
      <p className="forecast-map-note">Cada círculo representa a previsão para uma sede, sem interpolação entre municípios. Chance de chuva não é volume de chuva nem leitura de radar. As duas fontes mantêm suas próprias previsões; os dados do Open-Meteo permanecem identificados separadamente. A leitura é automática enquanto esta aba estiver aberta, e capturas válidas são reutilizadas por 15 minutos. Bloqueios da fonte e alterações de formato são identificados.</p>
      <ForecastComparison data={sources} frame={frame} metric={metric} focusId={focused.id} onFocus={setFocusId}/>
    </section>
    <ProviderRainMap place={focused} accuweather={accu.data?.locations.find(r=>r.placeId===focused.id)} now={now} />
  </div>;
}

function ForecastComparison({data,frame,metric,focusId,onFocus}:{data:{accuweather:{data:ForecastMapData|null};climaeradar:{data:ForecastMapData|null}};frame:Frame;metric:Metric;focusId:string;onFocus:(id:string)=>void}) {
  return <div className="forecast-source-comparison"><div><h3>As duas fontes, no mesmo recorte</h3><p>{frame.horizon==="current"?"Condições atuais; confira a referência de cada fonte.":frame.horizon==="daily"?`Previsão de ${frame.day?labelDay(frame.day):"—"}.`:`Previsão para ${frame.time?stamp(frame.time,true):"—"} · UTC−3.`} Traço indica dado ausente.</p></div><div className="table-scroll"><table><thead><tr><th>MUNICÍPIO</th><th>ACCUWEATHER · {units[metric]}</th><th>CLIMA & RADAR · {units[metric]}</th></tr></thead><tbody>{PLACES.map(p=><tr key={p.id} className={p.id===focusId?"selected":""}><td><button className="text-button" onClick={()=>onFocus(p.id)}>{p.name}</button></td>{(["accuweather","climaeradar"] as const).map(provider=>{const row=data[provider].data?.locations.find(r=>r.placeId===p.id);return <td key={provider}><strong>{shown(rowValue(row,frame,metric),metric)}</strong><small className="table-subline">{forecastStale(row,frame.now)?"Desatualizado · ":row?.state==="partial"?"Cópia anterior · ":row?.state==="unavailable"?"Captura indisponível · ":""}{reference(row,frame)}</small>{row&&row.state!=="ok"&&<small className="table-subline">{row.detail}</small>}</td>;})}</tr>)}</tbody></table></div></div>;
}

export function ProviderRainMap({place,accuweather,now=0}:{place:Place;accuweather:ForecastLocation|undefined;now?:number}) {
  const [provider,setProvider]=useState<ForecastProvider>("climaeradar"),[revision,setRevision]=useState(0),[error,setError]=useState(false);
  const links=weatherLinks(place),url=provider==="climaeradar"?links.climaRadar:links.accuRadar;
  const image=!forecastStale(accuweather,now)?accuweather?.capture?.radarImage:null;
  useEffect(()=>setError(false),[provider,place.id,revision]);
  return <section className="panel forecast-rain-map"><div className="panel-head"><div><span className="eyebrow"><CloudRain size={14}/>CHUVA E NUVENS</span><h2>Mapa do fornecedor · {place.name}</h2><p>{provider==="climaeradar"?"RadarClima interativo · horário e legenda no mapa oficial":"Imagem pública de radar publicada no AccuWeather · confira a legenda da própria imagem"}</p></div><a className="text-button" href={url} target="_blank" rel="noreferrer">Abrir na fonte<ArrowUpRight size={14}/></a></div><div className="forecast-rain-controls"><div className="forecast-switch" role="group" aria-label="Fornecedor do mapa de chuva">{(["climaeradar","accuweather"] as const).map(p=><button key={p} aria-pressed={provider===p} onClick={()=>setProvider(p)}>{FORECAST_PROVIDER_NAMES[p]}</button>)}</div><button className="text-button" onClick={()=>{setError(false);setRevision(r=>r+1);}}><RefreshCw size={14}/>Recarregar mapa</button></div><div className={`forecast-rain-viewport ${provider==="accuweather"?"accu-radar-image":""}`}>
      {error?<div className="forecast-rain-placeholder" role="status"><strong>O mapa do fornecedor não carregou.</strong><a className="button secondary" href={url} target="_blank" rel="noreferrer">Consultar na fonte<ArrowUpRight size={14}/></a></div>:provider==="climaeradar"?<iframe key={`${place.id}-${revision}`} src={links.climaRadarEmbed} title={`RadarClima oficial de ${place.name}, Pará`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onError={()=>setError(true)}/>:image?<a href={url} target="_blank" rel="noreferrer"><img key={`${place.id}-${revision}`} src={image} alt={`Mapa de radar publicado pelo AccuWeather para ${place.name}`} onError={()=>setError(true)}/></a>:<div className="forecast-rain-placeholder" role="status"><strong>Imagem de radar não disponível nesta captura.</strong><p>Isso não indica ausência de chuva.</p><a className="button secondary" href={url} target="_blank" rel="noreferrer">Abrir radar do AccuWeather<ArrowUpRight size={14}/></a></div>}
    </div><p className="forecast-map-note">{provider==="climaeradar"?"Conteúdo fornecido pelo Clima & Radar, com seus próprios controles de tempo e camadas.":"Imagem servida diretamente pelo AccuWeather; o Sentinela não altera cores ou legenda. O horário da imagem não foi obtido como dado estruturado nesta captura."} O mapa de chuva tem filtros próprios e não é alterado pelo horário selecionado no mapa de previsão regional.</p></section>;
}
