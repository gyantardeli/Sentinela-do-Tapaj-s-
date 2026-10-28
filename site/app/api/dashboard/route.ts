import { loadDashboard } from "../../../lib/data-service";
import { PLACES } from "../../../lib/environment";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("place") ?? "itaituba";
  const place = PLACES.find(p => p.id === id);
  if (!place) return Response.json({ error: "Município não encontrado." }, { status: 400 });
  try {
    const data = await loadDashboard(place);
    return Response.json(data, { headers: { "Cache-Control": "private, max-age=120", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ error: "Não foi possível consultar as fontes. Tente novamente." }, { status: 502 });
  }
}
