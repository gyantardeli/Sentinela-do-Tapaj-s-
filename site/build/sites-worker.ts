import handler from "vinext/server/fetch-handler";
import { verifiedAdminIdentity } from "./admin-access";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    // Hospedagem externa: o cliente controla os cabeçalhos HTTP.
    // A identidade do ChatGPT Sites não está disponível aqui; impedir spoofing.
    const publicHeaders = new Headers(request.headers);
    for (const key of publicHeaders.keys()) {
      if (key.toLowerCase().startsWith("oai-authenticated-user-")) {
        publicHeaders.delete(key);
      }
    }
    // A session is promoted to administrator only after RSA signature,
    // audience, issuer, expiry and owner email have all been verified.
    const owner = await verifiedAdminIdentity(request, env);
    if (owner) {
      const method = request.method.toUpperCase();
      if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        const origin = request.headers.get("origin");
        const fetchSite = request.headers.get("sec-fetch-site");
        const sameOrigin = new URL(request.url).origin;
        if (origin !== sameOrigin && !(origin === null && fetchSite === "same-origin")) {
          return Response.json({ success: false, error: "Origem de alteração não autorizada." },
            { status: 403, headers: { "Cache-Control": "no-store" } });
        }
      }
      publicHeaders.set("oai-authenticated-user-id", owner.userId);
      publicHeaders.set("oai-authenticated-user-email", owner.email);
    }
    // Never forward a client-supplied Access assertion to application logic.
    publicHeaders.delete("cf-access-jwt-assertion");
    const publicRequest = new Request(request, { headers: publicHeaders });
    return runWithConnectorBinding(binding, () => handler.fetch(publicRequest, env, ctx));
  },
};
