import { INPE_RISK, INPE_WMS, parseRiskMetadata, type InpeRisk } from "../../../lib/inpe";
let cached: InpeRisk | null = null;
export async function GET() {
  const now = Math.floor(Date.now() / 1000);
  if (cached && now - cached.checkedAt < 600) return Response.json(cached, { headers: { "Cache-Control": "private, max-age=300" } });
  let date: string | null = null;
  try {
    const response = await fetch(INPE_WMS + "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities", { signal: AbortSignal.timeout(15000) });
    if (response.ok) date = parseRiskMetadata(await response.text());
  } catch { /* An unavailable map never becomes a low-risk map. */ }
  cached = { available: !!date, date, checkedAt: now, title: "Risco de fogo · produto diário INPE", layer: INPE_RISK, url: INPE_WMS };
  return Response.json(cached, { headers: { "Cache-Control": "private, max-age=300" } });
}
