/** Isolated external staging build: never modify ChatGPT Sites' vite.config.ts. */
import vinext from 'vinext';
import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';

const databaseId = process.env.SENTINELA_D1_ID ?? '';
const databaseName = process.env.SENTINELA_D1_NAME ?? 'sentinela-tapajos-staging';
const deployment = process.env.SENTINELA_EXTERNAL_DEPLOY === '1';
if (deployment && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(databaseId)) {
  throw new Error('Defina SENTINELA_D1_ID com UUID válido. A publicação externa foi bloqueada.');
}
if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(databaseName)) throw new Error('SENTINELA_D1_NAME inválido');

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
      inspectorPort: false,
      config: {
        name: 'sentinela-tapajos-staging',
        main: './build/external-worker.ts',
        compatibility_date: '2026-10-20',
        compatibility_flags: ['nodejs_compat'],
        workers_dev: false,
        d1_databases: [{ binding: 'DB', database_name: databaseName,
          database_id: databaseId || '00000000-0000-4000-8000-000000000000' }],
      },
    }),
  ],
});
