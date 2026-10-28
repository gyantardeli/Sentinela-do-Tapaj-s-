import { collectAirMap } from "../../../lib/air-quality-provider";

export async function GET(request: Request) {
  try {
    const cache = typeof caches !== "undefined" ? await caches.open("sentinela-air-public-v1").catch(() => undefined) : undefined;
    const value = await collectAirMap(Math.floor(Date.now() / 1000), { origin: new URL(request.url).origin, cache });
    return Response.json(value, { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ error: "Não foi possível consultar o mapa de qualidade do ar." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
