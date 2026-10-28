import { historyStatus } from "../../../../lib/monitoring-store";
export async function GET() {
  try { return Response.json(await historyStatus(), { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return Response.json({ error: "Não foi possível ler a cobertura do histórico." }, { status: 503 }); }
}
