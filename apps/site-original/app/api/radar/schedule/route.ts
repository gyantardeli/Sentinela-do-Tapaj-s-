import { saveRadarSchedule } from "../../../../lib/radar-store";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || !request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "Requisição inválida." }, { status: 403 });
  try {
    const value = await request.json() as { id: string; enabled: boolean; cadence: string; timezone: string };
    if (typeof value.id !== "string" || value.id.length > 200 || typeof value.enabled !== "boolean" || value.cadence !== "hourly" || value.timezone !== "America/Bahia") return Response.json({ error: "Configuração inválida." }, { status: 400 });
    await saveRadarSchedule(value); return Response.json({ success: true });
  } catch { return Response.json({ error: "Não foi possível salvar a situação do agendamento." }, { status: 502 }); }
}
