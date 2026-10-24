import { environmentSummary, readEnvironmentCache } from "../../../lib/environment-store";
export async function GET() { return Response.json(environmentSummary(await readEnvironmentCache()), { headers: { "Cache-Control": "no-store" } }); }
