import { PLACES } from "../../../lib/environment";
import { RADII } from "../../../lib/monitoring";
import { readHistory } from "../../../lib/monitoring-store";
import { readRadar } from "../../../lib/radar-store";
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams, place = PLACES.find(p => p.id === q.get("place")) ?? PLACES[0];
  const radius = Number(q.get("radius") ?? 100), days = q.get("days") === "30" ? 30 : 7, satellite = q.get("satellite") ?? "all";
  if (!RADII.includes(radius as any) || satellite.length > 60 || !/^[a-zA-Z0-9_ .+/-]+$/.test(satellite)) return Response.json({ error: "Filtros inválidos." }, { status: 400 });
  try { return Response.json(await readHistory(place.id, radius, satellite, days, await readRadar(), Math.floor(Date.now() / 1000)), { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return Response.json({ error: "Não foi possível ler o histórico regional." }, { status: 503 }); }
}
