"use client";
import { useState } from "react";
import { ArrowUpRight, CloudRain, CloudSun, Droplets, MapPin, RefreshCw, Sun, Wind } from "lucide-react";
import { weatherLinks } from "../lib/weather-providers";
import { compass, display, stamp, type Place, type Weather } from "../lib/environment";
import WeatherForecastMap from "./weather-forecast-map";

function SourceLink({ href, children, className = "button secondary" }: { href: string; children: React.ReactNode; className?: string }) {
  return <a href={href} target="_blank" rel="noreferrer" className={className}>{children}<ArrowUpRight size={16} /></a>;
}
export default function WeatherPanel({ place, weather, onOpenRain }: { place: Place; weather: Weather | null; onOpenRain: () => void }) {
  const [revision, setRevision] = useState(0);
  const links = weatherLinks(place);
  return <div className="weather-module">
    <div className="weather-section-heading"><div><span className="eyebrow">PREVISÕES DAS FONTES</span><h2>Compare antes de decidir.</h2><p>As previsões podem divergir. Confira o local e o horário de atualização em cada fornecedor.</p></div><span className="weather-location"><MapPin size={15} />{place.name}, PA</span></div>
    <WeatherForecastMap place={place} />
    <div className="forecast-grid">
      <section className="panel provider-card clima-card">
        <div className="provider-heading"><span className="provider-logo clima-logo"><CloudSun size={25} /></span><div><h3>Clima & Radar</h3><p>Previsão de {links.climaReference}, PA</p></div><span className="tiny-tag blue-tag">Widget oficial</span></div>
        {!links.climaExact && <p className="provider-location-note">Referência do widget: <strong>Itaituba</strong>. O radar abre centrado em {place.name}; selecione o ponto no mapa para consultar a previsão local.</p>}
        <div className="weather-widget-wrap"><iframe key={`${place.id}-${revision}`} src={links.climaWidget} title={`Previsão oficial do Clima & Radar para ${links.climaReference}, Pará`} name="CW2" width="290" height="318" scrolling="no" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div>
        <div className="provider-actions"><SourceLink href={links.climaRadar} className="button primary"><CloudRain size={16} />Radar · próximas 24 h</SourceLink><button className="icon-button" onClick={() => setRevision(r => r + 1)} aria-label="Recarregar widget do Clima e Radar"><RefreshCw size={17} /></button><SourceLink href={links.clima} className="text-button">Previsão completa</SourceLink></div>
        <p className="provider-footnote">Conteúdo atualizado pelo Clima & Radar. Se o quadro não aparecer, abra a previsão completa.</p>
      </section>
      <div className="forecast-side">
        <section className="panel provider-card accu-card"><div className="provider-heading"><span className="provider-logo accu-logo"><Sun size={26} /></span><div><h3>AccuWeather</h3><p>{place.name}, Pará</p></div><span className="tiny-tag orange-tag">Página pública</span></div><h4>Hora a hora ou por dia.</h4><p className="provider-description">Confira temperatura, sensação térmica, possibilidade de chuva e vento para o município selecionado.</p><div className="accu-options"><SourceLink href={links.hourly}><span>Por hora<small>Temperatura e chuva</small></span></SourceLink><SourceLink href={links.daily}><span>Por dia<small>Tendência dos próximos dias</small></span></SourceLink></div><SourceLink href={links.accu} className="button primary wide">Abrir previsão de {place.name}</SourceLink><p className="provider-footnote">As capturas disponíveis aparecem no mapa de previsão regional, com seus horários. A página do fornecedor mantém os detalhes completos.</p></section>
        <section className="weather-windy-card"><div className="weather-windy-icon"><Wind size={24} /></div><div><span className="eyebrow">VENTO E PRECIPITAÇÃO</span><h3>Veja o movimento no mapa.</h3><p>Abra a camada de chuva do Windy para comparar com a previsão.</p></div><button className="button secondary" onClick={onOpenRain}>Comparar no Windy<ArrowUpRight size={16} /></button></section>
      </div>
    </div>
    <section className="panel weather-model"><div className="weather-model-heading"><div><span className="eyebrow">CONDIÇÃO CALCULADA · OPEN-METEO</span><h3>Referência no ponto de {place.name}</h3></div><span>{weather ? `${stamp(weather.time)} · UTC−3` : "Sem referência recente"}</span></div><div className="weather-model-grid"><div><Sun size={19} /><span>Temperatura<strong>{display(weather?.temperature)}<small>°C</small></strong></span></div><div><Droplets size={19} /><span>Umidade<strong>{display(weather?.humidity, 0)}<small>%</small></strong></span></div><div><Wind size={19} /><span>Vento a 10 m<strong>{display(weather?.speed)}<small>km/h{weather?.direction != null ? ` · de ${compass(weather.direction)}` : ""}</small></strong></span></div></div><p>Estimativa de modelo, distinta das previsões dos dois fornecedores acima. Os horários e os pontos de referência podem diferir entre as fontes.</p></section>
  </div>;
}
