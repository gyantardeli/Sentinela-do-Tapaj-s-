import { normalizeParaCatalog, PARA_IBGE_ENDPOINT, PARA_MUNICIPALITY_COUNT } from "../../../../lib/municipal-catalog";

/** Endpoint de homologação: somente catálogo geográfico, sem ativar fontes/coletas. */
export async function GET(request: Request) {
  const uf = new URL(request.url).searchParams.get("uf")?.toUpperCase() ?? "PA";
  if (uf !== "PA") {
    return Response.json({ error: "Nesta fase, somente municípios do Pará (uf=PA)." }, { status: 400 });
  }
  try {
    const response = await fetch(PARA_IBGE_ENDPOINT, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`IBGE indisponível: ${response.status}`);
    const municipalities = normalizeParaCatalog(await response.json());
    return Response.json({
      uf: "PA",
      source: "IBGE — Serviço de Dados / Localidades",
      sourceUrl: PARA_IBGE_ENDPOINT,
      count: PARA_MUNICIPALITY_COUNT,
      monitoringCoverage: "not_evaluated",
      municipalities,
    }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({
      error: "Catálogo oficial indisponível ou incompleto. Nenhum município foi incluído a partir de dados parciais.",
      sourceUrl: PARA_IBGE_ENDPOINT,
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
