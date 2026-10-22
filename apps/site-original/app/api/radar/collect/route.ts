import { collectAndSave } from "../../../../lib/radar-store";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "Envie JSON." }, { status: 415 });
  try { return Response.json({ success: true, ...await collectAndSave() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ success: false, error: "A coleta não foi concluída. O histórico já salvo permanece disponível." }, { status: 502 }); }
}
