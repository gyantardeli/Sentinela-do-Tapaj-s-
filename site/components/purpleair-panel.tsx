"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, MapPin, RefreshCw, WifiOff } from "lucide-react";
import type { Place } from "../lib/environment";
import { PURPLEAIR_REGION_URL, PURPLEAIR_AQI_BANDS } from "../lib/purpleair";

export { PURPLEAIR_REGION_URL } from "../lib/purpleair";
const IQAIR_URL = "https://www.iqair.com/br/air-quality-map";

function PurpleAirMap({ url, label, provider = "PurpleAir" }: { url: string; label: string; provider?: string }) {
  const [online, setOnline] = useState(true);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);
  const showMap = online;

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!showMap) return;
    setLoading(true);
    setSlow(false);
    setFailed(false);
    const timer = setTimeout(() => setSlow(true), 20_000);
    return () => clearTimeout(timer);
  }, [showMap, revision]);

  return <>
    <div className="purpleair-map-toolbar">
      <span><MapPin size={15} />{label}</span>
      <div>
        {showMap && <button className="button secondary compact" onClick={() => setRevision(v => v + 1)}><RefreshCw size={15} />Recarregar mapa</button>}
        <a className="button secondary compact" href={url} target="_blank" rel="noopener noreferrer">Abrir mapa completo<ArrowUpRight size={15} /></a>
      </div>
    </div>
    <div className="purpleair-map-viewport" aria-label={`Mapa de qualidade do ar ${provider}`}>
      {!online ? <div className="purpleair-placeholder" role="status"><WifiOff size={32} /><h3>Mapa externo sem conexão.</h3><p>Conecte-se à internet para consultar as leituras de {provider}.</p></div>
          : <>
            {loading && !failed && <span className="purpleair-loading" role="status">Abrindo o mapa {provider}…</span>}
            <iframe
              key={revision}
              src={url}
              title={`${provider} · qualidade do ar · ${label}`}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setFailed(true); }}
            />
          </>}
    </div>
    <div className="purpleair-map-note" role={failed ? "status" : undefined}>
      <span>{failed ? "O navegador não conseguiu abrir o quadro. " : slow && showMap ? "Se o mapa permanecer vazio, " : "Se o mapa não aparecer, "}<a href={url} target="_blank" rel="noopener noreferrer">abra diretamente no {provider}<ArrowUpRight size={13} /></a>.</span>
      <span>Confira o horário e o tipo de cada sensor no mapa.</span>
    </div>
  </>;
}

export default function PurpleAirPanel({ place }: { place: Place }) {
  const [view, setView] = useState<"region" | "municipality">("region");
  const [iqairOpen, setIqairOpen] = useState(false);
  const url = view === "region" ? PURPLEAIR_REGION_URL : `${PURPLEAIR_REGION_URL.split("#")[0]}#9/${place.lat}/${place.lon}`;
  const label = view === "region" ? "Região do Tapajós" : `${place.name}, PA`;

  return <div className="purpleair-module">
    <section className="panel purpleair-panel" aria-labelledby="purpleair-title">
      <div className="panel-head purpleair-heading">
        <div><h2 id="purpleair-title"><MapPin size={20} />Mapa PurpleAir</h2><p>Toque em um sensor para conferir a leitura e o horário.</p></div>
        <span className="tiny-tag purpleair-tag">Sensores PurpleAir</span>
      </div>
      <div className="purpleair-view-controls" role="group" aria-label="Enquadramento do PurpleAir">
        <button className={view === "region" ? "active" : ""} aria-pressed={view === "region"} onClick={() => setView("region")}>Ver região do Tapajós</button>
        <button className={view === "municipality" ? "active" : ""} aria-pressed={view === "municipality"} onClick={() => setView("municipality")}>Ver {place.name}</button>
      </div>
      <PurpleAirMap key={url} url={url} label={label} />
    </section>
    <section className="panel purpleair-scale" aria-labelledby="purpleair-scale-title">
      <div className="purpleair-scale-heading"><div><span className="eyebrow">LEGENDA EM PORTUGUÊS</span><h2 id="purpleair-scale-title">Cores e valores do AQI</h2><p>Compare o número do sensor com a escala AQI dos EUA.</p></div><span className="tiny-tag purpleair-tag">US EPA AQI</span></div>
      <ol className="purpleair-color-scale">{PURPLEAIR_AQI_BANDS.map(band => <li key={band.min} style={{ borderTopColor: band.color }}><span>{band.range}</span><strong>{band.label}</strong></li>)}</ol>
      <p className="purpleair-scale-footnote">Legenda para a camada US EPA AQI. O índice não é uma concentração de PM2,5 em µg/m³ nem o IQAr brasileiro. Acima de 500, o valor fica fora da escala.</p>
      <p className="purpleair-scale-footnote">Contorno preto: sensor interno. Sem contorno: sensor externo. Ponto cinza: sensor sem envio de dados. Confira o horário de cada leitura; ausência de sensores não significa ar bom.</p>
    </section>
    <section className="purpleair-about" aria-labelledby="purpleair-references-title">
      <h3 id="purpleair-references-title">Referências</h3>
      <div><p>Fonte das leituras: PurpleAir. Configuração inicial: US EPA AQI para PM2,5, média de 10 minutos. Os controles do próprio mapa permitem alterar a camada e o período.</p>
      <p><a href="https://www.airnow.gov/aqi/aqi-basics/" target="_blank" rel="noopener noreferrer">Escala AQI · US EPA / AirNow<ArrowUpRight size={13} /></a> · <a href="https://community.purpleair.com/t/purpleair-map-guide/90" target="_blank" rel="noopener noreferrer">Guia do mapa PurpleAir<ArrowUpRight size={13} /></a></p></div>
    </section>
    <details className="purpleair-original" onToggle={event => setIqairOpen(event.currentTarget.open)}>
      <summary>Mapa IQAir · qualidade do ar</summary>
      {iqairOpen && <section className="purpleair-module" aria-label="Mapa IQAir"><p>Consulte as estações, a escala e os horários informados pelo IQAir. Os filtros do Sentinela não alteram este mapa.</p><PurpleAirMap url={IQAIR_URL} label="IQAir Brasil" provider="IQAir" /><p>Fonte e referência: <a href={IQAIR_URL} target="_blank" rel="noopener noreferrer">IQAir · mapa de qualidade do ar<ArrowUpRight size={13} /></a>. Use a legenda do próprio mapa para interpretar os valores.</p></section>}
    </details>
  </div>;
}
