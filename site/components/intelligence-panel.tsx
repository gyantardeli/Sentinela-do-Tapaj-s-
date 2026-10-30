"use client";
import { useMemo, useState } from "react";
import { Activity, BarChart3, CloudSun, Database, ExternalLink, Flame, Info, RefreshCw, Wind } from "lucide-react";
import { PLACES, display, stamp, type DashboardData, type Place } from "../lib/environment";
import { type HealthData, type HistoryData, type HistoryDay } from "../lib/monitoring";
import { useSnapshot } from "./use-snapshot";
import "./intelligence-panel.css";

type Section = "burns" | "air" | "climate" | "cities" | "collection" | "powerbi";
const sections: { id: Section; label: string }[] = [
  { id: "burns", label: "Queimadas" }, { id: "air", label: "Qualidade do ar" },
  { id: "climate", label: "Clima" }, { id: "cities", label: "Municípios" },
  { id: "collection", label: "Coleta" }, { id: "powerbi", label: "Power BI" },
];
const reportUrl = process.env.NEXT_PUBLIC_SENTINELA_POWERBI_REPORT_URL?.trim() ?? "";
// Nunca aceitar links "Publish to web" ou domínios externos como se fossem relatórios privados.
export function isOrganizationReportUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "app.powerbi.com" &&
      url.pathname.toLowerCase() === "/reportembed" && !!url.searchParams.get("reportId") &&
      !url.searchParams.has("r");
  } catch { return false; }
}
function hasFullFire(day: HistoryDay) { return day.fireCoverage === "full" && day.closed !== false && day.fireCount !== null; }
function fullAir(day: HistoryDay) { return day.closed !== false && day.pm25 !== null && day.expectedHours === 24 && day.pmSamples === 24; }
function fmtDate(day: string) { return day.slice(8) + "/" + day.slice(5, 7); }
function Metric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Flame }) {
  return <article className="intel-metric"><div className="intel-metric-label"><Icon size={17}/>{label}</div><strong>{value}</strong><small>{note}</small></article>;
}
function Trend({ daily, metric }: { daily: HistoryDay[]; metric: "fire" | "air" }) {
  const values = daily.map(day => metric === "fire" ? (hasFullFire(day) ? day.fireCount : null) : (fullAir(day) ? day.pm25 : null));
  const max = Math.max(1, ...values.filter((v): v is number => v !== null));
  return <div className="intel-trend" role="img" aria-label={metric === "fire" ? "Detecções por dia com cobertura completa" : "PM2,5 modelado por dia com 24 horas completas"}>
    {daily.map((day, i) => {
      const v = values[i], available = v !== null;
      return <div className="intel-trend-item" key={day.day} title={fmtDate(day.day) + ": " + (available ? display(v, metric === "fire" ? 0 : 1) : "sem cobertura completa")}>
        <div className="intel-trend-track"><span className={"intel-trend-bar " + (metric === "fire" ? "burns" : "air") + (!available ? " absent" : "")} style={{ height: available ? Math.max(4, (v / max) * 100) + "%" : "4%" }}/></div>
        <small>{daily.length <= 7 || i % 5 === 0 || i === daily.length - 1 ? fmtDate(day.day) : " "}</small>
      </div>;
    })}
  </div>;
}
export default function IntelligencePanel({ place, dashboard, refreshKey = 0 }: { place: Place; dashboard: DashboardData | null; refreshKey?: number }) {
  const [days, setDays] = useState<7 | 30>(7);
  const [radius, setRadius] = useState<25 | 50 | 100 | 200>(100);
  const [section, setSection] = useState<Section>("burns");
  const query = "/api/history?" + new URLSearchParams({ place: place.id, radius: String(radius), satellite: "all", days: String(days), scope: "regional" });
  const { data: history, loading, error, load } = useSnapshot<HistoryData>(query, refreshKey);
  const { data: sourceData, loading: sourcesLoading, error: sourcesError, load: loadSources } = useSnapshot<HealthData>("/api/source-health?days=" + days, refreshKey);
  const daily = history?.daily ?? [];
  const fireComplete = daily.filter(hasFullFire);
  const airComplete = daily.filter(fullAir);
  const fireTotal = fireComplete.length ? fireComplete.reduce((n, d) => n + (d.fireCount ?? 0), 0) : null;
  const airMean = airComplete.length ? airComplete.reduce((n, d) => n + (d.pm25 ?? 0), 0) / airComplete.length : null;
  const weather = dashboard?.place.id === place.id ? dashboard.weather : null;
  const weatherStatus = dashboard?.sources.find(s => s.id === "weather");
  const weatherIsCurrent = !!weather && !!weatherStatus && !weatherStatus.stale && weatherStatus.status === "ok" && Math.abs((dashboard?.fetchedAt ?? 0) - weather.time) <= 7200;
  const airFromModel = dashboard?.sources.find(s => s.id === "air");
  const sourceRows = sourceData?.sources.filter(s => s.automatic) ?? [];
  const municipalities = useMemo(() => (history?.region ?? []).map(row => {
    const full = row.daily.filter(hasFullFire);
    const air = row.daily.filter(fullAir);
    return { id: row.placeId, name: PLACES.find(p => p.id === row.placeId)?.name ?? row.placeId, count: full.length ? full.reduce((n, d) => n + (d.fireCount ?? 0), 0) : null, coverage: full.length, pm: air.length ? air.reduce((n, d) => n + (d.pm25 ?? 0), 0) / air.length : null, airCoverage: air.length };
  }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [history]);
  const missing = !history && !loading;
  return <div className="intel-root">
    <div className="intel-homolog"><strong>HOMOLOGAÇÃO · NÃO PUBLICADO EM PRODUÇÃO</strong><span>Camada nativa de análise com dados do próprio Sentinela. Não é um relatório Microsoft Power BI.</span></div>
    <div className="intel-bar">
      <div><span className="intel-label">INTELIGÊNCIA AMBIENTAL</span><h2>Dados para compreender a região.</h2><p>Fontes, recortes e lacunas permanecem identificados. Nenhum valor ausente é convertido em zero.</p></div>
      <div className="intel-filters"><label>Janela <select value={days} onChange={e => setDays(Number(e.target.value) as 7 | 30)}><option value={7}>7 dias</option><option value={30}>30 dias</option></select></label><label>Raio <select value={radius} onChange={e => setRadius(Number(e.target.value) as 25 | 50 | 100 | 200)}>{[25, 50, 100, 200].map(n => <option value={n} key={n}>{n} km</option>)}</select></label><button type="button" disabled={loading || sourcesLoading} onClick={() => { void load(); void loadSources(); }}><RefreshCw size={16}/> Atualizar</button></div>
    </div>
    <nav className="intel-tabs" aria-label="Módulos da inteligência ambiental">{sections.map(s => <button type="button" aria-pressed={section === s.id} className={section === s.id ? "selected" : ""} key={s.id} onClick={() => setSection(s.id)}>{s.label}</button>)}</nav>
    {(error || sourcesError) && <p className="intel-warning" role="status">Uma ou mais consultas falharam. Sem dados não significa ausência de ocorrências. Verifique o serviço de coleta e tente novamente.</p>}
    <div className="intel-metrics">
      <Metric icon={Flame} label="Focos de calor" value={fireTotal === null ? "—" : display(fireTotal, 0)} note={fireComplete.length + "/" + daily.length + " dias completos · INPE"}/>
      <Metric icon={Activity} label="PM2,5 médio" value={airMean === null ? "—" : display(airMean) + " µg/m³"} note={airComplete.length + "/" + daily.length + " dias completos · modelo CAMS"}/>
      <Metric icon={Database} label="Fontes monitoradas" value={sourceData ? String(sourceRows.length) : "—"} note="Automáticas · taxa de resposta individual"/>
      <Metric icon={CloudSun} label="Temperatura atual" value={weatherIsCurrent && weather?.temperature != null ? display(weather.temperature) + " °C" : "—"} note={weatherIsCurrent ? "Open-Meteo · " + stamp(weather?.time) : "Modelo atual não validado"}/>
    </div>
    {(section === "burns" || section === "air") && <section className="intel-card">
      <div className="intel-card-header"><div><h3>{section === "burns" ? "Detecções de calor diárias" : "Material particulado PM2,5"}</h3><p>{place.name} · {radius} km · {section === "burns" ? "INPE / arquivos completos" : "CAMS / Open-Meteo · médias diárias do modelo, não sensores"}</p></div><span>{days} dias</span></div>
      {daily.length ? <Trend daily={daily} metric={section === "burns" ? "fire" : "air"}/> : <p className="intel-empty">{loading ? "Consultando o histórico…" : "Nenhum histórico verificado disponível para o recorte."}</p>}
      <p className="intel-note"><Info size={15}/>{section === "burns" ? "A contagem reflete detecções por satélite, não incêndios distintos. Barras ausentes indicam cobertura incompleta." : "PM2,5 é estimativa do modelo, não medição local. Dias parciais não entram na média indicada."}</p>
      <div className="intel-table"><table><thead><tr><th>Data (UTC−3)</th><th>{section === "burns" ? "Detecções" : "PM2,5 (µg/m³)"}</th><th>Cobertura</th></tr></thead><tbody>{daily.map(d => <tr key={d.day}><td>{fmtDate(d.day)}</td><td>{section === "burns" ? (hasFullFire(d) ? display(d.fireCount, 0) : "—") : (fullAir(d) ? display(d.pm25) : "—")}</td><td>{section === "burns" ? (hasFullFire(d) ? "Completa" : d.fireCoverage === "partial" ? "Parcial" : "Indisponível") : d.pmSamples + "/" + d.expectedHours + " horas"}</td></tr>)}</tbody></table></div>
    </section>}
    {section === "climate" && <section className="intel-card"><div className="intel-card-header"><div><h3>Condições meteorológicas</h3><p>Open-Meteo · leitura de modelo para {place.name}</p></div><Wind size={22}/></div>{weatherIsCurrent ? <div className="intel-climate">{[["Temperatura", weather?.temperature, "°C"], ["Umidade relativa", weather?.humidity, "%"], ["Vento a 10 m", weather?.speed, "km/h"], ["Precipitação", weather?.rain, "mm"]].map(([name, val, unit]) => <div key={String(name)}><small>{name}</small><strong>{typeof val === "number" ? display(val) + " " + unit : "—"}</strong></div>)}</div> : <p className="intel-empty">Sem condições meteorológicas atuais suficientemente verificadas. Nenhum valor estimado será mostrado como medição recente.</p>}<p className="intel-note"><Info size={15}/> Referência: {weatherIsCurrent ? stamp(weather?.time, true) : "sem horário validado"}. O histórico atual não oferece uma série diária de precipitação; não será inventada.</p></section>}
    {section === "cities" && <section className="intel-card"><div className="intel-card-header"><div><h3>Comparação entre municípios</h3><p>Mesma janela temporal e raio de {radius} km. Totais comparáveis somente quando a cobertura coincide.</p></div><BarChart3 size={22}/></div><div className="intel-table"><table><thead><tr><th>Município</th><th>Detecções*</th><th>Dias INPE</th><th>PM2,5*</th><th>Dias CAMS</th></tr></thead><tbody>{municipalities.map(m => <tr key={m.id}><td>{m.name}</td><td>{m.count === null ? "—" : display(m.count,0)}</td><td>{m.coverage}/{days}</td><td>{m.pm === null ? "—" : display(m.pm)}</td><td>{m.airCoverage}/{days}</td></tr>)}{!municipalities.length && <tr><td colSpan={5}>{loading ? "Consultando histórico regional…" : "Histórico regional indisponível."}</td></tr>}</tbody></table></div><p className="intel-note"><Info size={15}/> *INPE: somente dias com arquivos completos. CAMS: somente dias com 24 h. Totais com números diferentes de dias NÃO são equivalentes.</p></section>}
    {section === "collection" && <section className="intel-card"><div className="intel-card-header"><div><h3>Saúde da coleta automática</h3><p>Fonte por fonte · observações históricas · sem mascarar falhas.</p></div><Database size={22}/></div><div className="intel-table"><table><thead><tr><th>Fonte</th><th>Última verificação</th><th>Respostas</th><th>Falhas</th><th>Taxa</th></tr></thead><tbody>{sourceRows.map(s => <tr key={s.id}><td>{s.name}</td><td>{stamp(s.latest?.checkedAt)}</td><td>{s.responses}</td><td>{s.failures}</td><td>{s.responseRate === null ? "—" : display(s.responseRate * 100, 0) + "%"}</td></tr>)}{!sourceRows.length && <tr><td colSpan={5}>{sourcesLoading ? "Consultando fontes…" : "Não há dados de saúde disponíveis."}</td></tr>}</tbody></table></div><p className="intel-note">Fonte: /api/source-health. Não confundir resposta HTTP com completude científica dos dados.</p></section>}
    {section === "powerbi" && <section className="intel-card"><div className="intel-card-header"><div><h3>Relatório corporativo · Microsoft Power BI</h3><p>Espaço reservado para relatório autenticado da organização.</p></div><ExternalLink size={20}/></div>{isOrganizationReportUrl(reportUrl) ? <><p className="intel-note">Incorporação autenticada: o usuário poderá precisar entrar com sua conta Microsoft. Disponibilidade sujeita às licenças e permissões do relatório.</p><iframe className="intel-report-frame" src={reportUrl} title="Relatório corporativo Power BI" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></> : <div className="intel-empty"><strong>Conexão Microsoft pendente</strong><p>A análise nativa já funciona. Para incorporar o Power BI, configure NEXT_PUBLIC_SENTINELA_POWERBI_REPORT_URL com a URL organizacional /reportEmbed e autorize o acesso na Microsoft. Não use “Publicar na Web”.</p><a href="https://learn.microsoft.com/pt-br/power-bi/collaborate-share/service-embed-secure" target="_blank" rel="noopener noreferrer">Documentação da Microsoft <ExternalLink size={14}/></a></div>}</section>}
    {missing && <p className="intel-warning">O histórico não respondeu. Nenhum indicador diário foi substituído por dados demonstrativos.</p>}
    <footer className="intel-footer">HOMOLOGAÇÃO · dados nativos do Sentinela Tapajós · INPE / CAMS via Open-Meteo / Open-Meteo. Horários em UTC−3. Não utilizar como aviso oficial de emergência.</footer>
  </div>;
}
