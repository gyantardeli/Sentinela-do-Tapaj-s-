import { readRadar } from "../../../lib/radar-store";
export async function GET() {
  try { return Response.json(await readRadar(), { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return Response.json({ items: [], sources: [], run: null, schedule: null, storageReady: false, now: Math.floor(Date.now() / 1000), error: "Não foi possível ler o histórico do radar. Tente novamente." }, { status: 503 }); }
}
