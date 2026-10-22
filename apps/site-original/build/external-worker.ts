/** Cloudflare Workers external entrypoint (not used by ChatGPT Sites). */
import handler from 'vinext/server/fetch-handler';
import { collectEnvironment } from '../lib/environment-provider';
import { saveEnvironment } from '../lib/environment-store';
import { collectFirePacket } from '../lib/fire-snapshot';
import { saveFireSnapshot } from '../lib/fire-store';
import { collectAndSave } from '../lib/radar-store';
import { runScheduledCycle } from '../lib/scheduled-core.mjs';
import { accessSettings, verifyAccessJwt, withVerifiedIdentity, accessDenied } from '../lib/external-access.mjs';

type ExternalEnv = Cloudflare.Env & { ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string };

export default {
  async scheduled(controller: ScheduledController, env: ExternalEnv, ctx: ExecutionContext) {
    if (!env.DB) throw new Error('D1 staging obrigatorio no coletor');
    const now = () => Math.floor(Date.now() / 1000);
    const tasks = controller.cron === '17 */3 * * *'
      ? [{
          name: 'radar', run: async () => {
            const { run, reused } = await collectAndSave();
            return { status: run.available === 0 ? 'unavailable' : run.status === 'complete' ? 'ok' : 'partial',
              accepted: run.accepted, dataAt: run.completedAt,
              detail: `${run.available}/${run.checked} fontes responderam; reutilizada=${reused}` };
          },
        }]
      : controller.cron === '7 * * * *' ? [
        { name: 'air-weather', run: async () => {
          const packet = await collectEnvironment(now());
          await saveEnvironment(packet);
          const n = (packet.air?.length ?? 0) + (packet.weather?.length ?? 0);
          const status = n === 16 ? 'ok' : n > 0 ? 'partial' : 'unavailable';
          return { status, accepted: n, dataAt: packet.collectedAt,
            detail: `Ar ${packet.air?.length ?? 0}/8; meteorologia ${packet.weather?.length ?? 0}/8. ${Object.values(packet.failures).join(' ').slice(0, 180)}` };
        }},
        { name: 'inpe', run: async () => {
          const packet = await collectFirePacket(now());
          await saveFireSnapshot(packet);
          return { status: packet.errorKind ? 'unavailable' : packet.collection?.coverage.complete ? 'ok' : 'partial',
            accepted: packet.collection?.fires.length ?? 0, dataAt: packet.collection?.last ?? null,
            detail: packet.errorKind ?? packet.collection?.detail ?? packet.message ?? 'Sem leitura INPE' };
        }},
      ] : [];
    if (!tasks.length) throw new Error('Cron nao autorizado: ' + controller.cron);
    ctx.waitUntil(runScheduledCycle({ db: env.DB, mode: controller.cron === '7 * * * *' ? 'environment' : 'radar', tasks, now }));
  },
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
