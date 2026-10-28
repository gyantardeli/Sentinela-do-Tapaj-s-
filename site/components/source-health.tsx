"use client";
import { useState } from "react";
import { Activity, ArrowUpRight, BookOpen, CircleHelp, Clock3, RefreshCw } from "lucide-react";
import { display, stamp } from "../lib/environment";
import type { HealthData } from "../lib/monitoring";
import { useSnapshot } from "./use-snapshot";

const STATUS: Record<string,string> = { ok: "Coleta direta", partial: "Dados parciais", indexed: "Índice parcial", empty: "Índice sem resultados", unavailable: "Falha de consulta" };
function date(day: string) { return day.slice(8) + "/" + day.slice(5,7); }
export default function SourceHealth({ onMethod, refreshKey = 0 }: { onMethod: () => void; refreshKey?: number }) {
  const [days,setDays] = useState(7), [family,setFamily] = useState("all"), [problems,setProblems] = useState(false);
  const { data,loading,error,load } = useSnapshot<HealthData>("/api/source-health?days=" + days, refreshKey);
  const automatic = data?.sources.filter(s => s.automatic) ?? [];
  const fresh = automatic.filter(s => !s.stale && s.latest?.status !== "unavailable").length;
  const failures = automatic.filter(s => s.latest?.status === "unavailable").length;
  const stale = automatic.filter(s => s.stale).length;
  const selected = automatic.filter(s => (family === "all" || s.family === family) && (!problems || s.stale || s.latest?.status !== "ok"));
  return <div className="monitor-module">
    <section className="monitor-intro"><div><span className="eyebrow"><Activity size={14} />QUALIDADE DA COLETA</span><h2>Saiba quais fontes responderam.</h2><p>Consultas registradas, atrasos e falhas. Acesso a um índice público oferece cobertura parcial do veículo.</p></div><button className="button secondary" disabled={loading} onClick={() => void load()}><RefreshCw size={15} className={loading ? "spin" : ""} />Atualizar leitura</button></section>
    <div className="monitor-toolbar"><div className="monitor-period" aria-label="Período da saúde das fontes">{[7,30].map(n => <button key={n} className={days === n ? "active" : ""} onClick={() => setDays(n)}>{n} dias</button>)}</div><label>Tipo de fonte<select value={family} onChange={e => setFamily(e.target.value)}><option value="all">Todas as monitoradas</option><option value="environment">Dados ambientais</option><option value="news">Notícias · 20 canais</option></select></label><label className="monitor-checkbox"><input type="checkbox" checked={problems} onChange={e => setProblems(e.target.checked)} />Somente pendências e cobertura parcial</label></div>
    {error && <div className="monitor-notice" role="status">{error}</div>}
    <div className="monitor-metrics"><article><small>FONTES MONITORADAS</small><strong>{data ? automatic.length : "—"}</strong><span>20 canais de notícias e 3 fontes ambientais</span></article><article><small>COM RESPOSTA RECENTE</small><strong>{data ? fresh : "—"}</strong><span>Última consulta há até duas horas</span></article><article><small>ÚLTIMA CONSULTA FALHOU</small><strong>{data ? failures : "—"}</strong><span>O histórico anterior é preservado</span></article><article><small>SEM CONSULTA RECENTE</small><strong>{data ? stale : "—"}</strong><span>Sem registro ou intervalo acima de duas horas</span></article></div>
    <div className="monitor-explanation"><CircleHelp size={17} /><p><strong>Taxa de resposta</strong> é a proporção de consultas registradas que receberam dados ou um índice válido, inclusive vazio. Não mede cobertura integral do site nem disponibilidade contínua. Dias sem registro permanecem sem avaliação. Histórico de consultas desde {stamp(data?.startedAt, true)}.</p></div>
    <section className="panel health-list" aria-label="Histórico das fontes">
      <div className="health-legend"><span><i className="health-dot reply" />Respondeu</span><span><i className="health-dot mixed" />Respostas e falhas</span><span><i className="health-dot failed" />Somente falhas</span><span><i className="health-dot unknown" />Sem registro</span></div>
      {selected.map(source => <article className="health-row" key={source.id}>
        <div className="health-name"><a href={source.url} target="_blank" rel="noreferrer">{source.name}<ArrowUpRight size={13} /></a><span className={`tiny-tag ${source.latest?.status === "ok" && !source.stale ? "green-tag" : source.latest?.status === "unavailable" ? "health-error-tag" : "amber-tag"}`}>{source.latest ? STATUS[source.latest.status] : "Sem consulta registrada"}</span>{source.stale && source.latest && <span className="health-stale"><Clock3 size={11} />Consulta antiga</span>}</div>
        <div className="health-facts"><div><small>ÚLTIMA CONSULTA</small><strong>{stamp(source.latest?.checkedAt)}</strong></div><div><small>ÚLTIMA RESPOSTA</small><strong>{stamp(source.lastResponseAt)}</strong></div><div><small>TAXA DE RESPOSTA</small><strong>{display(source.responseRate,0)}{source.responseRate !== null ? "%" : ""}</strong><span>{source.responses} de {source.checks} consultas · {source.failures} falhas</span></div><div><small>FORMA DE ACESSO</small><strong>{source.latest?.method === "index" ? "Índice público" : source.latest?.method === "rss + index" ? "RSS e índice" : source.latest?.method === "rss" ? "RSS direto" : source.latest?.method || "Sem registro"}</strong><span>{source.empty > 0 ? `${source.empty} consultas com índice vazio` : source.family === "news" ? `${source.direct} consultas com RSS direto` : `Referência: ${stamp(source.latest?.dataTime)}`}</span></div></div>
        <div className="health-timeline" style={{ gridTemplateColumns: `repeat(${days},minmax(0,1fr))` }} role="img" aria-label={`Respostas por dia de ${source.name}`}>{source.timeline.map(day => <span key={day.day} className={!day.checks ? "unknown" : !day.responses ? "failed" : day.failures ? "mixed" : "reply"} title={`${date(day.day)}: ${day.responses} respostas, ${day.failures} falhas; ${day.checks} consultas`} />)}</div>
        <div className="health-timeline-dates"><span>{source.timeline[0] && date(source.timeline[0].day)}</span><span>{source.timeline.at(-1) && date(source.timeline.at(-1)!.day)}</span></div>
        <details className="health-detail"><summary>Ver diagnóstico da última consulta</summary><p>{source.latest?.detail ?? "A primeira execução após a atualização preencherá o diagnóstico desta fonte."}</p></details>
      </article>)}
      {!selected.length && <div className="monitor-empty">{loading ? "Lendo o histórico das fontes…" : error ? "Histórico temporariamente indisponível." : "Nenhuma fonte corresponde aos filtros."}</div>}
    </section>
    <section className="panel health-external"><div className="panel-head"><div><h2>Consultas externas e conteúdo incorporado</h2><p>Estas consultas não entram no cálculo de resposta do coletor.</p></div></div>{data?.sources.filter(s => !s.automatic && s.id !== "selva").map(s => <a key={s.id} href={s.url} target="_blank" rel="noreferrer"><span>{s.name}<small>{s.id === "windy" ? "Mapa incorporado; funcionamento depende do fornecedor" : s.id === "accuweather" ? "Consulta no site original" : "Widget oficial e consulta de radar"}</small></span><ArrowUpRight size={15} /></a>)}</section>
    <button className="text-button monitor-method-link" onClick={onMethod}><BookOpen size={15} />Consultar fontes e critérios do painel<ArrowUpRight size={14} /></button>
  </div>;
}
