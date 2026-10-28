import { validateEnvironment } from "../../../../lib/environment-provider";
import { environmentSummary, readEnvironmentCache, saveEnvironment } from "../../../../lib/environment-store";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || !request.headers.get("content-type")?.includes("application/json")) return Response.json({ success: false, error: "Requisição inválida." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 500000) return Response.json({ success: false, error: "Coleta muito grande." }, { status: 413 });
  let packet;
  try { packet = validateEnvironment(await request.json(), Math.floor(Date.now() / 1000)); }
  catch { return Response.json({ success: false, error: "A coleta não passou na validação de local, horário, série ou unidade." }, { status: 400 }); }
  try { await saveEnvironment(packet); return Response.json({ success: true, ...environmentSummary(await readEnvironmentCache()) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ success: false, error: "Não foi possível gravar a coleta ambiental." }, { status: 502 }); }
}
