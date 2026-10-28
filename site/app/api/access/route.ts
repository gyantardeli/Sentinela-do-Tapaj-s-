import { env } from "cloudflare:workers";
import { ownerRequest } from "../../../lib/site-access";
export async function GET(request: Request) {
  return Response.json({canManage:ownerRequest(request,{ownerEmail:env.SENTINELA_OWNER_EMAIL}),publicRead:env.SENTINELA_PUBLIC_READ==="1"},{headers:{"Cache-Control":"private, no-store"}});
}
