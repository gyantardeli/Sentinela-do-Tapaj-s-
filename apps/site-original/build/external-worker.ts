/** Cloudflare Workers external entrypoint (not used by ChatGPT Sites). */
import handler from 'vinext/server/fetch-handler';
import { accessSettings, verifyAccessJwt, withVerifiedIdentity, accessDenied } from '../lib/external-access.mjs';

type ExternalEnv = Cloudflare.Env & { ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string };

export default {
  async fetch(request: Request, env: ExternalEnv, ctx: ExecutionContext) {
    // Only an authenticated operator should access this preview, including all GET/POST routes.
    if (!accessSettings(env)) return new Response('External auth not configured', { status: 503, headers: { 'Cache-Control': 'no-store' } });
    const identity = await verifyAccessJwt(request.headers.get('Cf-Access-Jwt-Assertion'), env);
    if (!identity) return accessDenied();
    const url = new URL(request.url);
    if (['/signin-with-chatgpt', '/signout-with-chatgpt', '/callback'].includes(url.pathname)) {
      return new Response('Use Cloudflare Access para autenticar', { status: 404 });
    }
    // Site identity headers originate only from the validated Access JWT, never from clients.
    return handler.fetch(withVerifiedIdentity(request, identity), env, ctx);
  }
};
