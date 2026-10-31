import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
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
    const publicRequest = new Request(request, { headers: publicHeaders });
    return runWithConnectorBinding(binding, () => handler.fetch(publicRequest, env, ctx));
  },
};
