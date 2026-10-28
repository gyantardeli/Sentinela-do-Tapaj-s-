import { env } from "cloudflare:workers";
import { NextResponse, type NextRequest } from "next/server";
import { guardSiteWrite } from "./lib/site-access";

export function middleware(request: NextRequest) {
  const denied=guardSiteWrite(request,{ownerEmail:env.SENTINELA_OWNER_EMAIL,serviceToken:env.SENTINELA_SERVICE_TOKEN});
  return denied ?? NextResponse.next();
}
export const config={matcher:["/api/:path*"]};
