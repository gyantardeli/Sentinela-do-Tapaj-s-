import type { Place } from "./environment";

// AccuWeather locations checked against the provider's place names and coordinates.
// Placas 2298001 is the Tapajós municipality; 2297685 is a different locality in Pará.
const ACCU_LOCATIONS: Record<string, string> = {
  itaituba: "2297818", jacareacanga: "39652", "novo-progresso": "2297921",
  ruropolis: "2298024", placas: "2298001", aveiro: "39625", trairao: "2298176", santarem: "34592",
};
// Official Clima & Radar city paths verified for Brazil / Pará.
const CLIMA_LOCATIONS: Record<string, string> = {
  itaituba: "11821981", jacareacanga: "5908939", "novo-progresso": "5603332",
  ruropolis: "306371", placas: "11137610", aveiro: "9221987", trairao: "1247901", santarem: "8063986",
};
function climaWidget(key: string) { return "https://api.wo-cloud.com/content/widget/?" + new URLSearchParams({
  geoObjectKey: key, language: "pt", region: "BR", timeFormat: "HH:mm", windUnit: "kmh", systemOfMeasurement: "metric", temperatureUnit: "celsius",
}); }
export function weatherLinks(place: Place) {
  const id = ACCU_LOCATIONS[place.id];
  const base = id ? `https://www.accuweather.com/pt/br/${place.id}/${id}` : null;
  const accu = (view: string) => base ? `${base}/${view}/${id}?unit=c` : "https://www.accuweather.com/";
  const climaId = CLIMA_LOCATIONS[place.id], climaSlug = climaId ? place.id : "itaituba", climaKey = climaId ?? CLIMA_LOCATIONS.itaituba;
  const point = place.id === "itaituba" ? "-4.2637,-55.99" : `${place.lat},${place.lon}`;
  const radarQuery = new URLSearchParams({ center: place.id === "itaituba" ? "-4.26,-56" : point, placemark: point, zoom: "8", period: "periodPrognose24h", tz: "America/Santarem" });
  return {
    accu: accu("weather-forecast"), hourly: accu("hourly-weather-forecast"), daily: accu("daily-weather-forecast"), accuRadar: accu("weather-radar"),
    clima: `https://www.climaeradar.com.br/previsao-tempo/${climaSlug}/${climaKey}`, climaRadar: `https://www.climaeradar.com.br/radarclima/${climaSlug}/${climaKey}?` + radarQuery,
    climaWidget: climaWidget(climaKey), climaExact: !!climaId, climaReference: climaId ? place.name : "Itaituba",
  };
}
