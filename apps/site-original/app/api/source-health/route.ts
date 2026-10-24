import { readHealth } from "../../../lib/monitoring-store";
export async function GET(request: Request) {
  const days = new URL(request.url).searchParams.get("days") === "30" ? 30 : 7;
  try { return Response.json(await readHealth(days, Math.floor(Date.now() / 1000)), { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return Response.json({ error: "Não foi possível ler a saúde das fontes." }, { status: 503 }); }
}
