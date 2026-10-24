import { validateCollection } from "../../../../lib/radar-ingest";
import { persistCollection } from "../../../../lib/radar-store";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || !request.headers.get("content-type")?.includes("application/json")) return Response.json({ success: false, error: "Requisição inválida." }, { status: 403 });
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 2_000_000) return Response.json({ success: false, error: "Coleta muito grande." }, { status: 413 });
  let collection;
  try { collection = validateCollection(await request.json(), Math.floor(Date.now() / 1000)); }
  catch { return Response.json({ success: false, error: "A coleta não passou na validação de fonte, data, link ou classificação." }, { status: 400 }); }
  try { const run = await persistCollection(collection.result, collection.startedAt, collection.runId); return Response.json({ success: true, run }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ success: false, error: "Não foi possível gravar a coleta." }, { status: 502 }); }
}
