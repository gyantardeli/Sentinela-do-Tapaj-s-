import { collectForecastMap, type ForecastProvider } from "../../../lib/weather-capture";

export async function GET(request: Request) {
  const provider = new URL(request.url).searchParams.get("provider") ?? "accuweather";
  if (provider !== "accuweather" && provider !== "climaeradar") return Response.json({ error: "Fornecedor meteorológico inválido." }, { status: 400 });
  try { return Response.json(await collectForecastMap(provider as ForecastProvider, Math.floor(Date.now() / 1000)), { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return Response.json({ error: "Não foi possível ler o mapa de previsão." }, { status: 503 }); }
}
