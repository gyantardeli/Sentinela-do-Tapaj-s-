import assert from "node:assert/strict";
import fs from "node:fs";

const unified = fs.readFileSync("components/unified-map.tsx", "utf8");
const forecast = fs.readFileSync("components/weather-forecast-map.tsx", "utf8");
const providers = fs.readFileSync("lib/weather-providers.ts", "utf8");
assert.match(unified, /\[weatherView, setWeatherView\] = useState\("clima"\)/, "RadarClima precisa ser o mapa inicial");
assert.match(unified, /src=\{links\.climaRadarEmbed\}/, "Mapa principal deve incorporar a URL do fornecedor");
assert.match(unified, /href=\{weatherView==="clima"\?links\.climaRadar:links\.accuRadar\}/, "Manter atalho para abrir o fornecedor");
assert.match(providers, /"https:\/\/radar\.wo-cloud\.com\/pwa\/\?"/, "Origem do radar deve ser a do próprio fornecedor");
assert(forecast.indexOf("<ProviderRainMap place={place}") < forecast.indexOf('<section className="panel forecast-map-panel"'), "RadarClima deve preceder a comparação regional");
assert.match(forecast, /<details className="forecast-regional-details">/, "Comparação de dados precisa continuar acessível");
console.log("Checagem estática: RadarClima como mapa inicial, link externo e comparativo preservados.");

if (process.argv.includes("--live")) {
  const urls = [
    "https://www.climaeradar.com.br/radarclima/itaituba/11821981",
    "https://radar.wo-cloud.com/pwa/?center=-4.2637%2C-55.99&desktop=true&lang=pt-BR&zoom=8",
    "https://api.wo-cloud.com/content/widget/?geoObjectKey=11821981&language=pt&region=BR&timeFormat=HH:mm&windUnit=kmh&systemOfMeasurement=metric&temperatureUnit=celsius"
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, {redirect:"follow", signal:AbortSignal.timeout(12000), headers: {"User-Agent":"Mozilla/5.0 (Sentinela iframe compatibility check)"}});
      const xfo = response.headers.get("x-frame-options") ?? "ausente";
      const csp = response.headers.get("content-security-policy") ?? "ausente";
      const ancestors = csp.match(/(?:^|;)\s*frame-ancestors\s+([^;]+)/i)?.[1] ?? "não declarada";
      const blocked = /\b(DENY|SAMEORIGIN)\b/i.test(xfo) || /(?:'none'|'self')/.test(ancestors);
      console.log(JSON.stringify({url: response.url, status:response.status, "x-frame-options":xfo, "frame-ancestors":ancestors, blockedByObservedHeader:blocked}));
    } catch (e) {
      console.log(JSON.stringify({url, result:"indeterminado", detail:String(e)}));
    }
  }
  console.log("A leitura de headers é indicativa; requer também teste visual no navegador. Um iframe não informa bloqueio de frame-ancestors ao pai de modo confiável.");
}
