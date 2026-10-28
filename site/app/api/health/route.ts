import { env } from "cloudflare:workers";
import { readEnvironmentCache } from "../../../lib/environment-store";
import { readRadar } from "../../../lib/radar-store";
import { collectorHealth } from "../../../lib/collector-health";
import type { HealthCheck } from "../../../lib/monitoring";
import { readFireSnapshot } from "../../../lib/fire-store";
export async function GET() {
  try { const [environment,radar,inpe,snapshot]=await Promise.all([readEnvironmentCache(),readRadar(),env.DB?.prepare("SELECT value FROM source_health_history WHERE source_id=? ORDER BY checked_at DESC LIMIT 1").bind("inpe").first<{value:string}>(),readFireSnapshot()]); return Response.json(collectorHealth(environment,radar,Math.floor(Date.now()/1000),inpe?JSON.parse(inpe.value) as HealthCheck:null,snapshot),{headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}}); }
  catch { return Response.json({error:"Diagnóstico temporariamente indisponível."},{status:503,headers:{"Cache-Control":"private, no-store"}}); }
}
