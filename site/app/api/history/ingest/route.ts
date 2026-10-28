import { saveHistoryPacket, validateHistoryPacket } from "../../../../lib/monitoring-store";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || !request.headers.get("content-type")?.includes("application/json")) return Response.json({ success: false, error: "Requisição inválida." }, { status: 403 });
  let packet;
  try { const body = await request.text(); if (body.length > 1500000) return Response.json({ success: false, error: "Arquivo muito grande." }, { status: 413 }); packet = validateHistoryPacket(JSON.parse(body), Math.floor(Date.now() / 1000)); }
  catch { return Response.json({ success: false, error: "Histórico inválido: confira datas, municípios, recortes e valores." }, { status: 400 }); }
  try { await saveHistoryPacket(packet); return Response.json({ success: true, kind: packet.kind, collectedAt: packet.collectedAt, ...(packet.kind === "fire-day" ? { dayUtc: packet.dayUtc, parts: packet.parts.length } : {}) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ success: false, error: "Não foi possível salvar o histórico." }, { status: 502 }); }
}
