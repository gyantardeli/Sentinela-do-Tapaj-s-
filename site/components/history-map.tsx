"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowRightLeft, Crosshair, Flame, Map as MapIcon, Minus, Pause, Play, Plus, Wind } from "lucide-react";
import { PLACES, display, type Place } from "../lib/environment";
import type { HistoryData } from "../lib/monitoring";
import { historyComplete, historyCoverage, historyDate, historyDifference, historyProject, historyScale, historyValue, type HistoryMetric } from "../lib/history-timeline";

const W = 1000, H = 610;
const number = (value: number | null, metric: HistoryMetric, delta = false) => value === null ? "—" : `${delta && value > 0 ? "+" : ""}${display(value, metric === "fire" ? 0 : 1)}`;
const unit = (metric: HistoryMetric) => metric === "fire" ? "detecções" : "µg/m³";
const colors = { increase: "#bd6545", decrease: "#387e8b", unchanged: "#6b816b", missing: "#e4e9df", fire: "#c37742", air: "#538c78" };
// Short leaders keep adjacent seats readable without moving their geographic anchors.
const callouts: Record<string, { x: number; y: number }> = {
  itaituba: { x: -43, y: -10 }, trairao: { x: -28, y: 38 },
  ruropolis: { x: 28, y: 25 }, placas: { x: 45, y: -5 }, aveiro: { x: -28, y: -20 },
};

function fitZoom(radius: number) {
  const points = PLACES.flatMap(p => {
    const dlat = radius / 111.2, dlon = dlat / Math.cos(p.lat * Math.PI / 180);
    return [historyProject(p.lat - dlat, p.lon - dlon, 0), historyProject(p.lat + dlat, p.lon + dlon, 0)];
  });
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return Math.max(4, Math.min(9, Math.log2(Math.min((W - 150) / (Math.max(...xs) - Math.min(...xs)), (H - 150) / (Math.max(...ys) - Math.min(...ys))))));
}

export default function HistoryMap({ data, place, radius, satellite, from, to, onFrom, onTo, loading, error }: {
  data: HistoryData | null; place: Place; radius: number; satellite: string; from: string; to: string;
  onFrom: (day: string) => void; onTo: (day: string) => void; loading: boolean; error: string;
}) {
  const id = useId();
  const [metric, setMetric] = useState<HistoryMetric>("fire"), [compare, setCompare] = useState(false);
  const [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1100), [focusId, setFocusId] = useState(place.id);
  const [zoomChange, setZoomChange] = useState(0), [offset, setOffset] = useState({ x: 0, y: 0 });
  const [tileError, setTileError] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const region = data?.region ?? [], dates = data?.daily.map(d => d.day) ?? [];
  const currentIndex = dates.indexOf(to), index = Math.max(0, currentIndex), day = dates[index] ?? "";
  const focused = PLACES.find(p => p.id === focusId) ?? place;
  const series = region.find(p => p.placeId === focused.id)?.daily ?? [];
  const a = series.find(d => d.day === from), b = series.find(d => d.day === day);
  const delta = historyDifference(a, b, metric), value = historyValue(b, metric);
  const scale = useMemo(() => historyScale(data?.region ?? [], metric, compare), [data, metric, compare]);
  const dailyScale = useMemo(() => historyScale(data?.region ?? [], metric, false), [data, metric]);
  const baseEnabled = !tileError;
  const zoom = fitZoom(radius) + zoomChange, tileZoom = Math.floor(zoom), tileSize = 256 * 2 ** (zoom - tileZoom);
  const center = historyProject(-4.8, -55.9, zoom), left = center.x - W / 2 - offset.x, top = center.y - H / 2 - offset.y;
  const project = (p: Place) => { const c = historyProject(p.lat, p.lon, zoom); return { x: c.x - left, y: c.y - top }; };
  const tiles = useMemo(() => {
    if (!baseEnabled) return [];
    const result = [], max = 2 ** tileZoom;
    for (let x = Math.floor(left / tileSize); x <= Math.floor((left + W) / tileSize); x++) for (let y = Math.floor(top / tileSize); y <= Math.floor((top + H) / tileSize); y++) {
      if (y >= 0 && y < max) result.push({ x, y, url: `https://tile.openstreetmap.org/${tileZoom}/${(x % max + max) % max}/${y}.png` });
    }
    return result;
  }, [baseEnabled, tileZoom, tileSize, left, top]);
  const coverage = region.filter(p => {
    const selected = p.daily.find(d => d.day === day);
    return compare ? historyDifference(p.daily.find(d => d.day === from), selected, metric) !== null : historyValue(selected, metric) !== null;
  }).length;

  useEffect(() => { setFocusId(place.id); }, [place.id]);
  useEffect(() => { setZoomChange(0); setOffset({ x: 0, y: 0 }); }, [radius]);
  useEffect(() => { setPlaying(false); }, [data?.radius, data?.satellite, data?.days]);
  useEffect(() => {
    if (!playing || dates.length < 2 || !data || error) { if (playing) setPlaying(false); return; }
    const handle = setTimeout(() => {
      if (document.hidden || index >= dates.length - 1) { setPlaying(false); return; }
      onTo(dates[index + 1]);
    }, speed);
    return () => clearTimeout(handle);
  }, [playing, data, error, index, speed, onTo]);
  function chooseDay(next: string) { setPlaying(false); onTo(next); }
  function togglePlayback() {
    if (playing) { setPlaying(false); return; }
    if (index >= dates.length - 1) onTo(dates[0]);
    setPlaying(true);
  }
  const currentLabel = `${focused.name} · ${historyDate(day)}`;
  return <section className="panel history-map" aria-labelledby={`${id}-title`}>
    <div className="panel-head"><div><span className="eyebrow"><MapIcon size={14} />EVOLUÇÃO NO TERRITÓRIO</span><h3 id={`${id}-title`}>Mapa da evolução regional</h3><p>Avance pelos dias ou compare duas datas no mesmo recorte.</p></div><span className="tiny-tag">8 sedes · raio de {radius} km</span></div>
    <div className="history-map-toolbar">
      <div className="history-map-switch" role="group" aria-label="Indicador no mapa"><button aria-pressed={metric === "fire"} onClick={() => { setPlaying(false); setMetric("fire"); }}><Flame size={14} />Calor INPE</button><button aria-pressed={metric === "air"} onClick={() => { setPlaying(false); setMetric("air"); }}><Wind size={14} />PM2,5</button></div>
      <div className="history-map-switch" role="group" aria-label="Modo do mapa histórico"><button aria-pressed={!compare} onClick={() => setCompare(false)}>Por dia</button><button aria-pressed={compare} onClick={() => setCompare(true)}><ArrowRightLeft size={14} />Comparar A × B</button></div>
      {compare && <label>Dia A<select value={from} onChange={e => { setPlaying(false); onFrom(e.target.value); }} disabled={!dates.length}><option value="">Escolher data</option>{dates.map(d => <option key={d} value={d}>{historyDate(d)}</option>)}</select></label>}
      <label>{compare ? "Dia B" : "Dia do mapa"}<select value={day} disabled={!dates.length} onChange={e => chooseDay(e.target.value)}><option value="">Escolher data</option>{dates.map(d => <option key={d} value={d}>{historyDate(d)}</option>)}</select></label>
    </div>
    <div className="history-map-layout">
      <div className="history-map-canvas">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-label={`Mapa histórico regional de ${metric === "fire" ? "detecções de calor por raio" : "PM2,5 modelado nas sedes"} em ${historyDate(day)}${compare ? `; diferença em relação a ${historyDate(from)}` : ""}`} role="group"
          onPointerDown={e => { if ((e.target as Element).closest("[data-region]")) return; drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={e => { if (!drag.current) return; const box = e.currentTarget.getBoundingClientRect(), scale = Math.max(box.width / W, box.height / H); setOffset({ x: drag.current.ox + (e.clientX - drag.current.x) / scale, y: drag.current.oy + (e.clientY - drag.current.y) / scale }); }}
          onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
          <defs><pattern id={`${id}-grid`} width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#d5dfd2" strokeWidth="1" /></pattern><pattern id={`${id}-gap`} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#e8ece4" /><path d="M-2 2L2-2M0 8L8 0M6 10L10 6" stroke="#acb8a6" strokeWidth="1.4" /></pattern></defs>
          <rect width={W} height={H} fill="#edf2e8" /><rect width={W} height={H} fill={`url(#${id}-grid)`} />
          {tiles.map(t => <image key={`${tileZoom}-${t.x}-${t.y}`} href={t.url} x={t.x * tileSize - left} y={t.y * tileSize - top} width={tileSize + .5} height={tileSize + .5} onError={() => setTileError(true)} opacity=".85" />)}
          {PLACES.map(p => {
            const c = project(p), row = region.find(r => r.placeId === p.id), aa = row?.daily.find(d => d.day === from), bb = row?.daily.find(d => d.day === day);
            const n = compare ? historyDifference(aa, bb, metric) : historyValue(bb, metric), full = compare ? n !== null : historyComplete(bb, metric);
            const bubble = n === null ? 16 : 12 + 14 * Math.sqrt(Math.min(1, Math.abs(n) / scale));
            const shift = callouts[p.id] ?? { x: 0, y: 0 }, marker = { x: c.x + shift.x, y: c.y + shift.y };
            const color = n === null ? colors.missing : compare ? n > 0 ? colors.increase : n < 0 ? colors.decrease : colors.unchanged : colors[metric];
            const r = radius * 1000 / (156543.03392 * Math.cos(p.lat * Math.PI / 180) / 2 ** zoom);
            return <g key={p.id}>
              {metric === "fire" && <circle cx={c.x} cy={c.y} r={r} fill={p.id === focused.id ? "#467652" : "none"} fillOpacity=".045" stroke={p.id === focused.id ? "#466d4a" : "#8fa38a"} strokeWidth={p.id === focused.id ? 1.7 : 1} strokeDasharray="5 6" />}
              {(shift.x !== 0 || shift.y !== 0) && <><line x1={c.x} y1={c.y} x2={marker.x} y2={marker.y} stroke="#6b8566" strokeWidth="1.3" /><circle cx={c.x} cy={c.y} r="3" fill="#4a6c45" stroke="#fff" strokeWidth="1" /></>}
              <g data-region="true" tabIndex={0} role="button" aria-pressed={p.id === focused.id} aria-label={`${p.name}: ${n === null ? compare ? "sem dados comparáveis" : "sem dados" : `${number(n, metric, compare)} ${unit(metric)}`}${!full && n !== null ? ", parcial" : ""}`} className="history-region-marker" onClick={() => setFocusId(p.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFocusId(p.id); } }}>
                <title>{`${p.name} · ${historyDate(day)}: ${number(n, metric, compare)} ${unit(metric)} · ${compare ? n === null ? "Cobertura insuficiente para comparar" : "B menos A; ambos os dias completos" : historyCoverage(bb, metric)}`}</title>
                {p.id === focused.id && <circle cx={marker.x} cy={marker.y} r={bubble + 5} fill="none" stroke="#244d38" strokeWidth="2" />}
                <circle cx={marker.x} cy={marker.y} r={bubble} fill={n === null ? `url(#${id}-gap)` : color} fillOpacity={n === null ? 1 : .94} stroke="white" strokeWidth="2.5" strokeDasharray={!full && n !== null ? "4 3" : undefined} />
                <text x={marker.x} y={marker.y + 5} textAnchor="middle" className="history-map-value" fill={n === null ? "#65775e" : "#fff"}>{number(n, metric, compare)}</text>
                <text x={marker.x} y={marker.y + bubble + 20} textAnchor="middle" className="history-map-city">{p.name}</text>
              </g>
            </g>;
          })}
          <text x="26" y="38" className="history-map-north">N ↑</text>
        </svg>
        <div className="history-map-date"><small>{compare ? `DIFERENÇA · ${historyDate(day)} MENOS ${historyDate(from)}` : "DIA DO MAPA · UTC−3"}</small><strong>{compare ? "B − A" : historyDate(day)}</strong><span>{metric === "fire" ? `INPE · ${satellite === "all" ? "todos os satélites" : satellite}` : "CAMS · média diária nas sedes"}</span></div>
        <div className="map-tools"><button aria-label="Aproximar mapa histórico" disabled={zoomChange >= 3} onClick={() => { setZoomChange(z => Math.min(3, z + .5)); setOffset(o => ({ x: o.x * Math.SQRT2, y: o.y * Math.SQRT2 })); }}><Plus size={16} /></button><button aria-label="Afastar mapa histórico" disabled={zoomChange <= -1} onClick={() => { setZoomChange(z => Math.max(-1, z - .5)); setOffset(o => ({ x: o.x / Math.SQRT2, y: o.y / Math.SQRT2 })); }}><Minus size={16} /></button><button aria-label="Enquadrar toda a região" onClick={() => { setZoomChange(0); setOffset({ x: 0, y: 0 }); }}><Crosshair size={16} /></button></div>
        {!baseEnabled && <div className="history-map-background"><span>{tileError ? "Fundo indisponível · coordenadas preservadas" : "Coordenadas WGS84 · mapa leve"}</span><button onClick={() => { setTileError(false); }}>Carregar mapa de fundo</button></div>}
        {baseEnabled && <a className="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>}
        {!data && <div className="history-map-wait" role="status">{loading ? "Lendo o histórico regional…" : error ? "Histórico indisponível nesta consulta." : "Aguardando histórico regional."}</div>}
      </div>
      <aside className="history-map-detail" aria-label="Detalhe da região selecionada">
        <small>REGIÃO EM DETALHE</small><h4>{focused.name}</h4><p>{metric === "fire" ? `Raio de ${radius} km a partir da sede` : "Modelo na sede · média das horas disponíveis"}</p>
        <div className="history-map-readout" aria-live={playing ? "off" : "polite"}><small>{compare ? `VARIAÇÃO · ${historyDate(day)} − ${historyDate(from)}` : currentLabel}</small><strong>{number(compare ? delta : value, metric, compare)}<em>{unit(metric)}</em></strong><span>{compare ? delta === null ? "Sem cobertura equivalente" : "Dois dias completos" : historyCoverage(b, metric)}</span></div>
        {compare && <div className="history-map-pair"><div><small>A · {historyDate(from)}</small><b>{number(historyValue(a, metric), metric)}</b><span>{historyCoverage(a, metric)}</span></div><div><small>B · {historyDate(day)}</small><b>{number(value, metric)}</b><span>{historyCoverage(b, metric)}</span></div></div>}
        <div className="history-map-legend">{compare ? <><span><i style={{ background: colors.increase }} />Aumento</span><span><i style={{ background: colors.decrease }} />Redução</span><span><i style={{ background: colors.unchanged }} />Sem variação</span></> : <><span><i style={{ background: colors[metric] }} />Valor diário disponível</span><span><i className="history-legend-partial" />Contorno tracejado: parcial</span></>}<span><i className="history-legend-gap" />{compare ? "Sem comparação válida" : "Sem dados"}</span></div>
        <p className="history-map-scale">Tamanho dos círculos: {compare ? "magnitude da diferença" : "valor do indicador"}. Escala fixa de 0 a {display(scale, metric === "fire" ? 0 : 1)} {unit(metric)} em todo o período.</p>
        <p className="history-map-coverage">{compare ? `${coverage}/8 regiões comparáveis` : `${coverage}/8 regiões com dados disponíveis`}. Toque em uma sede para ver os valores.</p>
      </aside>
    </div>
    <div className="history-playback">
      <div className="history-playback-buttons"><button aria-label="Dia anterior no mapa" disabled={!dates.length || index === 0} onClick={() => chooseDay(dates[index - 1])}><ArrowLeft size={16} /></button><button className="history-play-button" aria-label={playing ? "Pausar linha do tempo" : "Reproduzir linha do tempo"} disabled={dates.length < 2 || !region.length || !!error} onClick={togglePlayback}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? "Pausar" : "Reproduzir"}</button><button aria-label="Próximo dia no mapa" disabled={!dates.length || index >= dates.length - 1} onClick={() => chooseDay(dates[index + 1])}><ArrowRight size={16} /></button></div>
      <label className="history-slider-label" htmlFor={`${id}-slider`}>Linha do tempo<span>{historyDate(day)} · {index + (dates.length ? 1 : 0)}/{dates.length}</span><input id={`${id}-slider`} type="range" min="0" max={Math.max(1, dates.length - 1)} step="1" value={index} disabled={dates.length < 2} aria-valuetext={day ? `${day} · ${historyCoverage(b, metric)}` : "Sem dados"} onChange={e => chooseDay(dates[Number(e.target.value)])} /></label>
      <label className="history-speed">Ritmo<select value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value="1800">Lento</option><option value="1100">Normal</option><option value="600">Rápido</option></select></label>
    </div>
    <div className="history-days" aria-label={`Selecionar dia no mapa · ${focused.name}`}>{dates.map(d => {
      const record = series.find(row => row.day === d), n = historyValue(record, metric), partial = n !== null && !historyComplete(record, metric);
      return <button key={d} aria-pressed={day === d} className={`${n === null ? "gap" : partial ? "partial" : "complete"}${day === d ? " selected" : ""}`} onClick={() => chooseDay(d)} title={`${d}: ${number(n, metric)} ${unit(metric)} · ${historyCoverage(record, metric)}`}><small>{historyDate(d)}</small><span className="history-day-bar"><i style={{ height: n === null ? "0" : `${Math.max(6, n / dailyScale * 100)}%` }} /></span><b>{number(n, metric)}</b></button>;
    })}</div>
    <p className="history-map-note">{metric === "fire" ? "Os círculos mostram contagens agregadas no raio de cada sede; não são a posição dos focos nem a área queimada. Raios podem se sobrepor: não some os valores como total regional." : "Os círculos mostram o modelo CAMS nas sedes; não representam sensores físicos nem um campo contínuo de poluição."} {compare ? "A comparação exige dois dias encerrados, com arquivos completos do INPE ou 24 horas de modelo. " : "Dias parciais e lacunas permanecem na linha do tempo. "}O fundo é apenas referência geográfica e não muda de data.</p>
    {compare && <div className="table-scroll history-region-table"><table><thead><tr><th>REGIÃO · {metric === "fire" ? `${radius} KM` : "MODELO NA SEDE"}</th><th>A · {historyDate(from)}</th><th>B · {historyDate(day)}</th><th>DIFERENÇA B − A</th></tr></thead><tbody>{PLACES.map(p => {
      const rows = region.find(r => r.placeId === p.id)?.daily, aa = rows?.find(d => d.day === from), bb = rows?.find(d => d.day === day), diff = historyDifference(aa, bb, metric);
      return <tr key={p.id} className={focused.id === p.id ? "selected" : ""}><td><button className="text-button" onClick={() => setFocusId(p.id)}>{p.name}</button></td><td>{number(historyValue(aa, metric), metric)}<small className="table-subline">{historyCoverage(aa, metric)}</small></td><td>{number(historyValue(bb, metric), metric)}<small className="table-subline">{historyCoverage(bb, metric)}</small></td><td><strong>{number(diff, metric, true)}</strong><small className="table-subline">{diff === null ? "Sem cobertura equivalente" : unit(metric)}</small></td></tr>;
    })}</tbody></table></div>}
  </section>;
}
