"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, CircleHelp, Clock3, MapPin, Newspaper, RefreshCw, ShieldCheck } from "lucide-react";
import { stamp, type Place } from "../lib/environment";
import { groupArticles, type RadarData } from "../lib/radar-core";
import { RADAR_AXES, RADAR_LOCALITIES, RADAR_SOURCES } from "../lib/radar-sources";

export type NewsSelection = { axis: string; period: number };

export default function NewsSummary({ place, onOpenRadar, previewTime }: { place: Place; onOpenRadar: (selection: NewsSelection) => void; previewTime?: number }) {
  const [data, setData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [scope, setScope] = useState("local"), [period, setPeriod] = useState(72), [now, setNow] = useState(0);
  const generation = useRef(0);
  const localAxis = place.id === "ruropolis" || place.id === "placas" ? "ruropolis-placas" : place.id;
  const axis = scope === "all" ? "all" : localAxis;
  const axisName = RADAR_AXES.find(a => a.id === localAxis)?.name ?? place.name;

  const load = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true);
    try {
      const response = await fetch("/api/radar", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      const value = await response.json() as RadarData;
      if (!response.ok || !value.storageReady || !Array.isArray(value.items) || !Array.isArray(value.sources)) throw new Error("Não foi possível ler o resumo das notícias.");
      if (ticket !== generation.current) return;
      setData(value); setError(""); setNow((previewTime ?? Math.floor(Date.now() / 1000)));
    } catch {
      if (ticket === generation.current) setError("A leitura das notícias falhou. Tente atualizar o resumo.");
    } finally { if (ticket === generation.current) setLoading(false); }
  }, [previewTime]);

  useEffect(() => {
    void load(); setNow((previewTime ?? Math.floor(Date.now() / 1000)));
    const clock = setInterval(() => setNow((previewTime ?? Math.floor(Date.now() / 1000))), 60000);
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 300000);
    return () => { generation.current++; clearInterval(clock); clearInterval(timer); };
  }, [load, previewTime]);

  const selected = useMemo(() => (data?.items ?? []).filter(item =>
    item.publishedAt >= now - period * 3600 && item.publishedAt <= now + 300 &&
    (axis === "all" || !item.places.length || item.places.some(id => RADAR_LOCALITIES.find(p => p.id === id)?.axis === axis))
  ), [data, now, period, axis]);
  const groups = useMemo(() => groupArticles(selected, axis, now), [selected, axis, now]);
  const direct = data?.sources.filter(s => s.status === "ok").length ?? 0;
  const indexed = data?.sources.filter(s => s.status === "indexed").length ?? 0;
  const high = groups.filter(g => g.label === "Alta").length;
  const stale = !!data?.run && now - data.run.completedAt > 7200;
  const openRadar = () => onOpenRadar({ axis, period });

  return <section className="panel news-summary" aria-labelledby="news-summary-title" aria-busy={loading}>
    <div className="panel-head news-summary-head">
      <div className="news-summary-heading"><span className="news-summary-icon"><Newspaper size={23} /></span><div><h2 id="news-summary-title">Resumo das notícias</h2><p>Queimadas, incêndios e fumaça · 20 fontes monitoradas</p></div></div>
      <div className="news-summary-actions"><button className="button secondary news-summary-refresh" disabled={loading} onClick={() => void load()} aria-label="Atualizar resumo das notícias" title="Atualizar resumo das notícias"><RefreshCw size={16} className={loading ? "spin" : ""} /></button><button className="button primary" onClick={openRadar}>Abrir Radar completo<ArrowRight size={15} /></button></div>
    </div>

    <div className="news-summary-filters"><label><span>Área das notícias</span><select value={scope} onChange={e => setScope(e.target.value)}><option value="local">{axisName} e contexto regional</option><option value="all">Toda a região monitorada</option></select></label><label><span>Data de publicação</span><select value={period} onChange={e => setPeriod(Number(e.target.value))}><option value={24}>Últimas 24 h</option><option value={72}>Últimas 72 h</option><option value={168}>Últimos 7 dias</option><option value={720}>Últimos 30 dias</option></select></label></div>

    {error && <div className="news-summary-notice" role="status"><CircleHelp size={16} /><span>{error}{data ? " O histórico anterior permanece visível." : ""}</span></div>}
    {stale && <div className="news-summary-notice" role="status"><Clock3 size={16} /><span>A última coleta tem mais de duas horas. Confira as datas das publicações.</span></div>}

    <div className="news-summary-stats">
      <div><small>GRUPOS NO RECORTE</small><strong>{data ? groups.length : "—"}</strong><span>{data ? `${selected.length} publicações, com possíveis republicações agrupadas` : "Aguardando leitura do histórico"}</span></div>
      <div><small>RELEVÂNCIA ALTA</small><strong>{data ? high : "—"}</strong><span>Prioridade de leitura para a área selecionada</span></div>
      <div><small>FONTES COM ACESSO</small><strong>{data?.run ? direct + indexed : "—"}<em> / {RADAR_SOURCES.length}</em></strong><span>{data?.run ? `${direct} RSS diretos · ${indexed} índices parciais` : "Cobertura da última coleta"}</span></div>
    </div>

    <div className="news-summary-status"><span className={`dot ${data?.run && !stale && !error ? "green" : "amber"}`} /><span>{data?.run ? `Última coleta: ${stamp(data.run.completedAt)} · UTC−3` : loading ? "Carregando o histórico…" : "Aguardando primeira coleta"}</span>{data?.run && <span className="news-summary-coverage">{data.sources.some(s => s.status !== "ok") ? "Cobertura parcial" : "RSS diretos"}</span>}</div>

    <div className="news-summary-feed">{groups.slice(0, 4).map(group => {
      const item = group.lead, source = RADAR_SOURCES.find(s => s.id === item.sourceId);
      const locations = item.places.map(id => RADAR_LOCALITIES.find(p => p.id === id)?.name ?? id);
      return <article className="news-summary-card" key={group.id}>
        <div className="news-summary-card-top"><span className={`priority-badge ${group.label === "Alta" ? "high" : group.label === "Média" ? "medium" : "context"}`} aria-label={`Relevância ${group.label}, ${group.score} de 100`}>{group.label}<b>{group.score}</b></span><span>{item.topic}</span></div>
        <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title}<ArrowUpRight size={16} /></a></h3>
        <div className="news-summary-location"><MapPin size={13} /><span>{locations.length ? locations.join(" · ") : `${item.regions.join(" · ")} · sem local exato`}</span></div>
        <div className="news-summary-source"><span>{source?.category === "official" ? <ShieldCheck size={13} /> : <Newspaper size={13} />}{source?.name ?? item.sourceId}</span><time dateTime={new Date(item.publishedAt * 1000).toISOString()}>{stamp(item.publishedAt)}</time></div>
        <div className="news-summary-provenance">{item.mode === "rss" ? "RSS direto" : "Via Google Notícias"}{group.members.length > 1 && <span>{group.members.length} publicações em {group.publishers} {group.publishers === 1 ? "canal" : "canais"} · possível republicação</span>}</div>
      </article>;
    })}</div>

    {!groups.length && <div className="news-summary-empty" role="status"><Newspaper size={27} /><h3>{loading && !data ? "Carregando as principais notícias…" : error && !data ? "Resumo temporariamente indisponível" : !data?.run ? "Aguardando a coleta de notícias" : "Nenhuma notícia neste recorte"}</h3><p>{error && !data ? "Use o botão de atualização para tentar novamente." : data?.run ? "Amplie o período ou selecione toda a região. A falta de notícias não indica ausência de fogo." : "O resumo aparecerá aqui assim que o histórico estiver disponível."}</p></div>}

    <div className="news-summary-footer"><p>{groups.length ? `Exibindo ${Math.min(4, groups.length)} de ${groups.length} grupos, por relevância. ` : ""}Seleção por menções ao local{scope === "local" ? ", incluindo contexto regional sem local exato" : ""}. Raio e satélite não filtram notícias. Datas de publicação em UTC−3; as manchetes não confirmam ocorrência ativa.</p><button className="text-button" onClick={openRadar}>Ver notícias e cobertura das fontes<ArrowRight size={14} /></button></div>
  </section>;
}
