"use client";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown, Clock3, Flame, MapPin, Newspaper, RefreshCw, Wind } from "lucide-react";
import { PLACES, aqBand, compass, display, filterFires, filterSatellite, nearestAir, stamp, type DashboardData } from "../lib/environment";
import { RADAR_SOURCES } from "../lib/radar-sources";
import type { RegionalSummary } from "../lib/regional-summary";
import { useSnapshot } from "./use-snapshot";

export default function MunicipalSummary({ dashboard, placeId, radius, hours, satellite, now, onSelect, onHistory }: { dashboard: DashboardData | null; placeId: string; radius: number; hours: number; satellite: string; now: number; onSelect: (id: string) => void; onHistory: () => void }) {
  const { data, loading, error, load } = useSnapshot<RegionalSummary>("/api/regional");
  const [expanded, setExpanded] = useState(false);
  const fireSource = dashboard?.sources.find(s => s.id === "inpe");
  const fireAvailable = !!fireSource && fireSource.status !== "unavailable" && !!dashboard && now - dashboard.fetchedAt <= 1800;
  const ordered = [...PLACES].sort((a,b) => Number(b.id === placeId) - Number(a.id === placeId));
  const counts = useMemo(() => Object.fromEntries(PLACES.map(p => {const n=filterSatellite(filterFires(dashboard?.fires??[],p,radius,hours,now),satellite).length;return [p.id,n>0||dashboard?.fireCoverage?.complete===true?n:null];})), [dashboard, radius, hours, satellite, now]);
  return <section className="panel municipal-summary" aria-labelledby="municipal-title" aria-busy={loading}>
    <div className="panel-head"><div><span className="eyebrow"><MapPin size={13} />PANORAMA REGIONAL</span><h2 id="municipal-title">Situação por município</h2><p>Ar e vento na sede · detecções no raio de {radius} km, últimas {hours} h · notícias das últimas 72 h</p></div><div className="municipal-actions"><button className="button secondary compact" disabled={loading} onClick={() => void load()} aria-label="Atualizar resumo municipal"><RefreshCw size={15} className={loading ? "spin" : ""} /></button><button className="button secondary compact" onClick={onHistory}>Ver histórico<ArrowRight size={14} /></button></div></div>
    {error && <div className="monitor-notice" role="status">{error}{data ? " A leitura anterior permanece disponível com seus horários." : ""}</div>}
    <div className="municipal-grid">{ordered.slice(0, expanded ? 8 : 4).map(p => {
      const row = data?.places.find(r => r.id === p.id), selected=dashboard?.place.id===p.id;
      const air=selected?nearestAir(dashboard.air,now):row?.air,weather=selected?dashboard.weather:row?.weather;
      const airAt=row?.airCollectedAt??data?.airCollectedAt,weatherAt=row?.weatherCollectedAt??data?.weatherCollectedAt;
      const airFresh = !!air && (selected?!dashboard.sources.find(s=>s.id==="air")?.stale:!row?.airStale&&!!airAt&&now-airAt<=7200) && Math.abs(now-air.time)<=7200;
      const weatherFresh = !!weather && (selected?!dashboard.sources.find(s=>s.id==="weather")?.stale:!row?.weatherStale&&!!weatherAt&&now-weatherAt<=7200) && Math.abs(now-weather.time)<=7200;
      const band = aqBand(airFresh ? air?.aqi : null), news = row?.news;
      return <article className={`municipal-card ${p.id === placeId ? "selected" : ""}`} key={p.id}>
        <div className="municipal-card-head"><button onClick={() => onSelect(p.id)} aria-label={`Selecionar ${p.name} no painel`}><MapPin size={15} /><h3>{p.name}</h3></button>{p.id === placeId && <span className="tiny-tag green-tag">Selecionado</span>}</div>
        <div className="municipal-values"><div><small>PM2,5 · MODELO</small><strong style={{ color: airFresh ? band.color : undefined }}>{display(airFresh ? air?.pm25 : null)}</strong><span>µg/m³ · AQI EUA {display(airFresh ? air?.aqi : null, 0)}</span><time><Clock3 size={10} />{stamp(air?.time)}{air && !airFresh ? " · antigo" : ""}</time></div><div><small><Wind size={11} />VENTO · MODELO</small><strong>{display(weatherFresh ? weather?.speed : null)}</strong><span>km/h{weatherFresh && weather?.direction != null ? ` · de ${compass(weather.direction)}` : ""}</span><time><Clock3 size={10} />{stamp(weather?.time)}{weather && !weatherFresh ? " · antigo" : ""}</time></div><div><small><Flame size={11} />DETECÇÕES</small><strong>{fireAvailable ? display(counts[p.id], 0) : "—"}</strong><span>{fireAvailable ? fireSource?.status === "partial" ? "Cobertura parcial" : `${radius} km · ${hours} h` : "Sem dados recentes"}</span><time><Clock3 size={10} />Consulta {stamp(fireSource?.checkedAt)}</time></div></div>
        <div className="municipal-news"><span><Newspaper size={12} />{news?.context ? "CONTEXTO REGIONAL · SEM LOCAL EXATO" : "NOTÍCIA COM MENÇÃO AO MUNICÍPIO"}</span>{news ? <><h4><a href={news.url} target="_blank" rel="noreferrer">{news.title}<ArrowUpRight size={13} /></a></h4><div><span>{RADAR_SOURCES.find(s => s.id === news.sourceId)?.name}</span><time>{stamp(news.publishedAt)}</time><span className={`priority-badge ${news.label === "Alta" ? "high" : news.label === "Média" ? "medium" : "context"}`}>{news.label} {news.score}</span></div></> : <p>{loading && !data ? "Consultando notícias…" : "Sem manchete localizada neste período."}</p>}</div>
      </article>;
    })}</div>
    <div className="municipal-footer"><button className="text-button" onClick={() => setExpanded(!expanded)}>{expanded ? "Mostrar quatro municípios" : "Mostrar os oito municípios"}<ChevronDown size={14} style={{ transform: expanded ? "rotate(180deg)" : undefined }} /></button><span>Coletas · ar CAMS/Open-Meteo: {stamp(data?.airCollectedAt)} · vento Open-Meteo: {stamp(data?.weatherCollectedAt)} · notícias: {stamp(data?.newsCollectedAt)} · UTC−3</span><p>Os raios podem se sobrepor; as contagens não devem ser somadas como total regional. Notícias indicam menções textuais e não confirmam ocorrência ativa. Modelo e sensor físico são fontes diferentes.</p></div>
  </section>;
}
