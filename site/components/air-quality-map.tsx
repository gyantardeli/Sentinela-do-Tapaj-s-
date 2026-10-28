"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock3, CloudFog, Crosshair, Layers, MapPin, Minus, Pause, Play, Plus, RefreshCw } from "lucide-react";
import { PLACES, aqBand, display, stamp, type Place } from "../lib/environment";
import { AIR_GRID, AIR_GRID_STEP, AIR_MODEL_MAX_AGE, gridValue, isForecastFrame, isObservationFrame, nearestAirCell, type AirGridSeries, type AirMapData } from "../lib/air-quality-map";
import { PURPLEAIR_AQI_BANDS } from "../lib/purpleair";
import { historyProject } from "../lib/history-timeline";
import { useSnapshot } from "./use-snapshot";

const HEIGHT = 660;
const shifts: Record<string, { x: number; y: number }> = { itaituba: { x: 14, y: -12 }, trairao: { x: 14, y: 19 }, aveiro: { x: -14, y: -10 }, ruropolis: { x: 12, y: -10 }, placas: { x: 12, y: 3 } };
const clock = (time: number) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Santarem", hour: "2-digit", minute: "2-digit" }).format(time * 1000);
const day = (time: number) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Santarem", day: "2-digit", month: "2-digit" }).format(time * 1000);
const coordinate = (p: { lat: number; lon: number }) => `${Math.abs(p.lat).toFixed(1)}° S · ${Math.abs(p.lon).toFixed(1)}° O`;

export default function AirQualityMap({ place }: { place: Place }) {
  const snapshot = useSnapshot<AirMapData>("/api/air-map");
  const { data, loading, error } = snapshot;
  const id = useId();
  const [now, setNow] = useState(0), [frameIndex, setFrameIndex] = useState(0), [playing, setPlaying] = useState(false);
  const [mapWidth, setMapWidth] = useState(1000);
  const dragMoved = useRef(false);
  const [focus, setFocus] = useState<{ lat: number; lon: number; name: string }>(place);
  const [showModel, setShowModel] = useState(true);
  const [baseError, setBaseError] = useState(false);
  const [zoomChange, setZoomChange] = useState(0), [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  useEffect(() => { setNow(Math.floor(Date.now() / 1000)); const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => { const media = window.matchMedia("(max-width: 600px)"); const update = () => setMapWidth(media.matches ? 600 : 1000); update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update); }, []);
  useEffect(() => { setFocus(place); }, [place.id, place.lat, place.lon, place.name]);
  useEffect(() => { setFrameIndex(0); setPlaying(false); }, [data?.times[0]]);
  useEffect(() => { if (!playing || !data?.times.length) return; const timer = setInterval(() => setFrameIndex(i => (i + 1) % data.times.length), 1400); return () => clearInterval(timer); }, [playing, data?.times.length]);

  const referenceNow = now || data?.now || 0, times = data?.times ?? [];
  const frame = times[Math.min(frameIndex, times.length - 1)] ?? null, forecast = isForecastFrame(frame, referenceNow), observationFrame = isObservationFrame(frame, referenceNow);
  const frameLabel = forecast ? "Previsão" : observationFrame ? "Referência atual" : "Referência anterior";
  const series = useMemo(() => new Map(data?.cells.map(c => [c.id, c]) ?? []), [data?.cells]);
  const focused = nearestAirCell(focus), selectedCell = focused ? series.get(focused.id) : undefined;
  const pm = gridValue(selectedCell, times, frame, "pm25", referenceNow), aqi = gridValue(selectedCell, times, frame, "aqiPm25", referenceNow);
  const band = aqBand(aqi);
  const covered = (data?.cells ?? []).filter(c => gridValue(c, times, frame, "pm25", referenceNow) !== null).length;
  const zoom = 7.05 + zoomChange, tileZoom = Math.floor(zoom), tileSize = 256 * 2 ** (zoom - tileZoom);
  const center = historyProject(-5, -56, zoom), left = center.x - mapWidth / 2 - offset.x, top = center.y - HEIGHT / 2 - offset.y;
  const point = (p: { lat: number; lon: number }) => { const projected = historyProject(p.lat, p.lon, zoom); return { x: projected.x - left, y: projected.y - top }; };
  const baseEnabled = !baseError;
  const tiles = useMemo(() => {
    if (!baseEnabled) return [];
    const list = [];
    for (let x = Math.floor(left / tileSize); x <= Math.floor((left + mapWidth) / tileSize); x++) for (let y = Math.floor(top / tileSize); y <= Math.floor((top + HEIGHT) / tileSize); y++) list.push({ x, y, url: `https://tile.openstreetmap.org/${tileZoom}/${x}/${y}.png` });
    return list;
  }, [baseEnabled, left, top, tileSize, tileZoom]);
  function chooseCell(cell: { lat: number; lon: number }) { setFocus({ ...cell, name: `Célula ${coordinate(cell)}` }); }
  function choosePlace(p: Place) { setFocus(p); }
  function changeZoom(delta: number) { const next = Math.max(-1, Math.min(2, zoomChange + delta)), factor = 2 ** (next - zoomChange); setOffset(o => ({ x: o.x * factor, y: o.y * factor })); setZoomChange(next); }
  function changeFrame(index: number) { setPlaying(false); setFrameIndex(index); }

  return <section className="panel air-map-panel" aria-labelledby={`${id}-title`}>
    <div className="panel-head air-map-heading"><div><span className="eyebrow"><Layers size={14} />ESTIMATIVA REGIONAL E PREVISÃO</span><h2 id={`${id}-title`}>Qualidade do ar · mapa integrado</h2><p>Tapajós · recorte das oito sedes · previsão de PM2,5 por 72 horas.</p></div><button className="button secondary compact" disabled={loading} onClick={() => void snapshot.load()}><RefreshCw size={15} className={loading ? "spin" : ""} />{loading ? "Consultando…" : "Atualizar leitura"}</button></div>
    <div className="air-map-toolbar"><div className="air-map-layers" role="group" aria-label="Camadas de qualidade do ar"><label><input type="checkbox" checked={showModel} onChange={e => setShowModel(e.target.checked)} /><i className="air-key-cell" />Estimativa CAMS</label></div><label className="air-place-select">Referência<select value={PLACES.some(p => p.id === (focus as Place).id) ? (focus as Place).id : "custom"} onChange={e => { const p = PLACES.find(p => p.id === e.target.value); if (p) choosePlace(p); }}><option value="custom" disabled>Célula selecionada</option>{PLACES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
    <div className="air-map-status-strip" aria-live="polite"><span><Layers size={14} /><strong>{covered}/{AIR_GRID.length}</strong> células com estimativa</span><span><Clock3 size={14} />{frame ? `${frameLabel} · ${stamp(frame)}` : "Aguardando dados"}</span></div>
    {(error || data && data.model.state !== "ok") && <div className="air-map-notice" role="status">{error || data?.model.detail}</div>}
    <div className="air-map-layout"><div className="air-map-canvas">
      <svg viewBox={`0 0 ${mapWidth} ${HEIGHT}`} style={{ aspectRatio: `${mapWidth}/${HEIGHT}` }} role="group" aria-label={`Mapa integrado de PM2,5 no Tapajós. ${forecast ? "Previsão regional por células." : "Estimativas regionais por células."}`} onPointerDown={e => { if ((e.target as Element).closest(".air-city-marker")) return; dragMoved.current = false; drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }; }} onPointerMove={e => { if (!drag.current) return; const box = e.currentTarget.getBoundingClientRect(), d = drag.current; if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) return; dragMoved.current = true; if (!e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId); setOffset({ x: d.ox + (e.clientX - d.x) * mapWidth / box.width, y: d.oy + (e.clientY - d.y) * HEIGHT / box.height }); }} onPointerUp={e => { drag.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => { drag.current = null; }}>
        <defs><pattern id={`${id}-missing`} width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#dfe5e1" /><path d="M-2 2L2-2M0 10L10 0M8 12L12 8" stroke="#c8d2cb" strokeWidth="1" /></pattern></defs>
        <rect width={mapWidth} height={HEIGHT} fill="#edf1eb" />
        {tiles.map(t => <image key={`${tileZoom}-${t.x}-${t.y}`} href={t.url} x={t.x * tileSize - left} y={t.y * tileSize - top} width={tileSize + .5} height={tileSize + .5} onError={() => setBaseError(true)} />)}
        {showModel && AIR_GRID.map((cell, index) => {
          const row = series.get(cell.id), value = gridValue(row, times, frame, "pm25", referenceNow), indexValue = gridValue(row, times, frame, "aqiPm25", referenceNow), missing = value === null || indexValue === null;
          const corner = point({ lat: cell.lat + AIR_GRID_STEP / 2, lon: cell.lon - AIR_GRID_STEP / 2 }), opposite = point({ lat: cell.lat - AIR_GRID_STEP / 2, lon: cell.lon + AIR_GRID_STEP / 2 });
          return <rect key={cell.id} data-air-point="true" x={corner.x} y={corner.y} width={opposite.x - corner.x} height={opposite.y - corner.y} fill={missing ? `url(#${id}-missing)` : aqBand(indexValue).color} fillOpacity={missing ? .72 : .4} stroke={focused?.id === cell.id ? "#173d31" : "#5b7866"} strokeOpacity={focused?.id === cell.id ? 1 : .2} strokeWidth={focused?.id === cell.id ? 3 : .65} role="button" tabIndex={focused?.id === cell.id ? 0 : -1} aria-label={`${coordinate(cell)}: ${value === null ? "sem estimativa" : `PM2,5 ${display(value)} microgramas por metro cúbico; AQI de partículas ${display(indexValue, 0)}`}`} aria-pressed={focused?.id === cell.id} onClick={() => { if (!dragMoved.current) chooseCell(cell); }} onKeyDown={e => { const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -11, ArrowDown: 11 }; if (e.key in moves) { e.preventDefault(); if (e.key === "ArrowLeft" && index % 11 === 0 || e.key === "ArrowRight" && index % 11 === 10) return; const next = AIR_GRID[index + moves[e.key]]; if (next) { chooseCell(next); const rects = e.currentTarget.parentElement?.querySelectorAll<SVGRectElement>("rect[data-air-point]"); rects?.[index + moves[e.key]]?.focus(); } } else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); chooseCell(cell); } }}><title>{`${coordinate(cell)} · ${display(value)} µg/m³ · AQI PM2,5: ${display(indexValue, 0)}`}</title></rect>;
        })}
        {PLACES.map(p => { const c = point(p), s = shifts[p.id] ?? { x: 12, y: -10 }, selected = nearestAirCell(p)?.id === focused?.id; return <g key={p.id} data-air-point="true" className="air-city-marker" role="button" tabIndex={0} aria-label={`Selecionar ${p.name}`} onClick={() => choosePlace(p)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choosePlace(p); } }}><circle cx={c.x} cy={c.y} r={selected ? 5 : 3.5} fill="#244d3c" stroke="white" strokeWidth="1.8" /><text x={c.x + s.x} y={c.y + s.y} textAnchor={s.x < 0 ? "end" : "start"}>{p.name}</text></g>; })}
      </svg>
      <div className="air-map-stamp"><small>CAMS / OPEN-METEO</small><strong>{forecast ? "Previsão de PM2,5" : "Estimativa de PM2,5"}</strong><span>{frame ? `${stamp(frame, true)} · UTC−3` : "Consultando as fontes…"}</span><em>Grade de aproximadamente 45 km</em></div>
      <div className="map-tools"><button aria-label="Aproximar mapa do ar" disabled={zoomChange >= 2} onClick={() => changeZoom(.5)}><Plus size={16} /></button><button aria-label="Afastar mapa do ar" disabled={zoomChange <= -1} onClick={() => changeZoom(-.5)}><Minus size={16} /></button><button aria-label="Enquadrar Tapajós no mapa do ar" onClick={() => { setZoomChange(0); setOffset({ x: 0, y: 0 }); }}><Crosshair size={16} /></button></div>
      {(!data || data.model.state === "unavailable") && <div className="air-map-loading" role="status"><CloudFog size={28} /><strong>{loading ? "Consultando a previsão regional…" : "Estimativas CAMS indisponíveis"}</strong><span>{loading ? "Aguardando a resposta da fonte." : "Use Atualizar leitura para tentar novamente. Áreas em cinza estão sem dados; não indicam ar limpo."}</span></div>}
      {!baseEnabled && <div className="air-map-base"><span>{baseError ? "Fundo indisponível; dados preservados" : "Mapa leve · coordenadas WGS84"}</span><button onClick={() => { setBaseError(false); }}>Carregar mapa de fundo</button></div>}
      {baseEnabled && <a className="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>}
    </div><aside className="air-map-detail"><small><MapPin size={13} />REFERÊNCIA SELECIONADA</small><h3>{focus.name}</h3><p>{coordinate(focus)}</p><div className="air-detail-value"><span>PM2,5 · estimativa regional</span><strong>{display(pm)}<em>µg/m³</em></strong><span>{frame ? `${stamp(frame)} · UTC−3` : "Sem horário disponível"}</span></div><div className="air-detail-aqi" style={{ borderLeftColor: band.color }}><span>AQI dos EUA · somente PM2,5</span><strong>{display(aqi, 0)} <em>{aqi === null ? "Sem índice" : band.label}</em></strong></div>
      <AirForecastChart cell={selectedCell} times={times} now={referenceNow} selectedTime={frame} onSelect={i => changeFrame(i)} />
      <p className="air-map-detail-note">Consulta da célula: {stamp(selectedCell?.collectedAt, true)}. {selectedCell && referenceNow - selectedCell.collectedAt > AIR_MODEL_MAX_AGE ? "Cópia com mais de 6 horas; valores retirados do mapa." : "O horário da consulta não informa a emissão do modelo."}</p>
    </aside></div>
    <div className="air-timeline"><div className="air-timeline-heading"><div><Clock3 size={17} /><strong>{forecast ? `Previsão +${frameIndex * 3} h` : frameLabel}</strong><span>{frame ? `${stamp(frame)} · UTC−3` : "Aguardando a série"}</span></div><div><button aria-label="Horário anterior do ar" disabled={!times.length || frameIndex <= 0} onClick={() => changeFrame(frameIndex - 1)}><ArrowLeft size={16} /></button><button aria-label={playing ? "Pausar previsão do ar" : "Reproduzir previsão do ar"} disabled={!times.length} onClick={() => setPlaying(v => !v)}>{playing ? <Pause size={16} /> : <Play size={16} />}</button><button aria-label="Próximo horário do ar" disabled={!times.length || frameIndex >= times.length - 1} onClick={() => changeFrame(frameIndex + 1)}><ArrowRight size={16} /></button></div></div><input type="range" aria-label="Horário da previsão de qualidade do ar" min="0" max={Math.max(0, times.length - 1)} value={Math.min(frameIndex, Math.max(0, times.length - 1))} disabled={!times.length} onChange={e => changeFrame(Number(e.target.value))} /><div className="air-time-ticks">{[0, 8, 16, 24].map(index => <button key={index} disabled={!times[index]} aria-pressed={frameIndex === index} onClick={() => changeFrame(index)}><strong>{index ? `+${index * 3} h` : "Referência"}</strong><span>{times[index] ? `${day(times[index])} · ${clock(times[index])}` : "—"}</span></button>)}</div><p>Os horários exibem estimativas do modelo CAMS. A linha do tempo começa na referência de três horas anterior ou igual ao momento da consulta.</p></div>
    <div className="air-map-legend"><span>Cores das células · AQI de PM2,5</span>{PURPLEAIR_AQI_BANDS.map(b => <span key={b.min}><i style={{ background: aqBand(b.min).color }} /><strong>{b.range}</strong> {b.label}</span>)}<span><i className="air-legend-missing" />Sem estimativa</span></div>
    <div className="air-city-table"><h3>Estimativa nas referências municipais</h3><p>Valor da célula mais próxima de cada sede; não é uma média do município.</p><div className="table-scroll"><table><thead><tr><th>REFERÊNCIA</th><th>PM2,5 · µg/m³</th><th>AQI · PM2,5</th><th>CONSULTA DA CÉLULA</th></tr></thead><tbody>{PLACES.map(p => { const cellId = nearestAirCell(p)?.id, cell = cellId ? series.get(cellId) : undefined, pm = gridValue(cell, times, frame, "pm25", referenceNow), aqi = gridValue(cell, times, frame, "aqiPm25", referenceNow); return <tr key={p.id} className={(focus as Place).id === p.id ? "selected" : ""}><td><button className="text-button" onClick={() => choosePlace(p)}>{p.name}</button></td><td>{display(pm)}</td><td>{display(aqi, 0)}<small>{aqi === null ? "Sem índice" : aqBand(aqi).label}</small></td><td>{stamp(cell?.collectedAt)}</td></tr>; })}</tbody></table></div></div>
    <div className="air-map-method"><p><strong>Como ler:</strong> as áreas coloridas são estimativas CAMS de PM2,5. Selecione uma célula ou sede e use a linha do tempo para consultar a previsão. O mapa original PurpleAir está em destaque no início desta aba, com seus próprios sensores e horários.</p><details><summary>Fontes, resolução e limites</summary><p>Recorte operacional das oito sedes: 2,2° S a 7,8° S e 58,2° O a 53,8° O. Não representa toda a bacia do Tapajós. CAMS Global: grade de 0,4° (aproximadamente 45 km), dados de origem a cada três horas e atualizações do modelo a cada 12 horas. A série horária da API pode incluir interpolação; o mapa apresenta passos de três horas.</p><p>As cores usam o AQI dos EUA específico de PM2,5, diferente do IQAr brasileiro. Cada valor corresponde a uma célula do modelo; não é uma medição na sede nem média municipal. Os filtros de focos, satélite e áreas de interesse não alteram este recorte.</p><p>Consultas reutilizadas por até uma hora. A atualização ocorre enquanto a aba está aberta. Dados de composição atmosférica: Copernicus Atmosphere Monitoring Service (CAMS), disponibilizados por <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">Open-Meteo<ArrowUpRight size={12} /></a>.</p></details></div>
  </section>;
}

function AirForecastChart({ cell, times, now, selectedTime, onSelect }: { cell: AirGridSeries | undefined; times: number[]; now: number; selectedTime: number | null; onSelect: (index: number) => void }) {
  const values = times.map(t => gridValue(cell, times, t, "pm25", now));
  if (!values.some(v => v !== null)) return <div className="air-forecast-empty">Sem série de previsão nesta célula.</div>;
  const width = 270, height = 100, max = Math.max(10, ...values.map(v => v ?? 0));
  const x = (i: number) => 10 + i / Math.max(1, times.length - 1) * (width - 20), y = (v: number) => 9 + (1 - v / max) * 67;
  let draw = false;
  const path = values.map((v, i) => { if (v === null) { draw = false; return ""; } const step = `${draw ? "L" : "M"}${x(i)},${y(v)}`; draw = true; return step; }).join(" ");
  return <div className="air-forecast-chart"><strong>Previsão de 72 h · PM2,5</strong><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Previsão de partículas PM2,5 na célula selecionada, passos de três horas"><line x1="10" y1="76" x2="260" y2="76" stroke="#d8e1d9" /><path d={path} fill="none" stroke="#337b62" strokeWidth="2.3" />{times.map((time, i) => values[i] === null ? null : <circle key={time} cx={x(i)} cy={y(values[i]!)} r={selectedTime === time ? 4 : 2} fill={selectedTime === time ? "#163d30" : "#68a189"} onClick={() => onSelect(i)}><title>{`${stamp(time)}: ${display(values[i])} µg/m³`}</title></circle>)}<text x="10" y="96">Referência</text><text x="260" y="96" textAnchor="end">+72 h</text></svg></div>;
}
