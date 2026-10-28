export type SiteAccessSettings = { ownerEmail?: string; serviceToken?: string };
function equalToken(provided: string, expected: string) {
  if (expected.length < 32 || expected.length > 512 || provided.length > 512) return false;
  let difference = provided.length ^ expected.length;
  for (let i=0;i<expected.length;i++) difference |= expected.charCodeAt(i) ^ (provided.charCodeAt(i) || 0);
  return difference === 0;
}
export function ownerRequest(request: Request, settings: SiteAccessSettings) {
  // Sites dispatch owns these identity headers; browsers cannot choose their values.
  const email=request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  return !!request.headers.get("oai-authenticated-user-id") && !!settings.ownerEmail && email === settings.ownerEmail.trim().toLowerCase();
}
export function serviceRequest(request: Request, settings: SiteAccessSettings) {
  return !!settings.serviceToken && equalToken(request.headers.get("x-sentinela-service-token") ?? "",settings.serviceToken);
}
export function guardSiteWrite(request: Request, settings: SiteAccessSettings): Response | null {
  if (["GET","HEAD","OPTIONS"].includes(request.method.toUpperCase())) return null;
  if (ownerRequest(request,settings) || serviceRequest(request,settings)) return null;
  return Response.json({success:false,error:"Acesso de consulta. Entre com a conta do proprietário para alterar o painel."},{status:403,headers:{"Cache-Control":"private, no-store"}});
}
