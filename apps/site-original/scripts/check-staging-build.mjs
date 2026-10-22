/**
 * Audit the generated staging Wrangler metadata before any remote operation.
 * Node-only: does not connect to Cloudflare and never deploys.
 */
import { readFile } from 'node:fs/promises';
const file = new URL('../dist/server/wrangler.json', import.meta.url);
const invalid = (message) => { console.error('STAGING BLOQUEADO:', message); process.exitCode = 1; };
let cfg;
try { cfg = JSON.parse(await readFile(file, 'utf8')); }
catch (error) { invalid('Configuração dist/server/wrangler.json ausente ou inválida: ' + error.message); process.exit(); }
const team = 'https://sentinela-tapajos.cloudflareaccess.com';
const db = cfg.d1_databases?.find(x => x.binding === 'DB');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deployMode = process.env.SENTINELA_EXTERNAL_DEPLOY === '1';
const expectedId = process.env.SENTINELA_D1_ID?.trim() ?? '';
const audience = process.env.ACCESS_AUD?.trim() ?? '';
if (cfg.name !== 'sentinela-tapajos-staging') invalid('Nome do Worker incorreto');
if (cfg.workers_dev !== false) invalid('workers.dev precisa permanecer desativado');
if (JSON.stringify(cfg.triggers?.crons) !== JSON.stringify(['7 * * * *','17 */3 * * *','27 * * * *'])) invalid('Agendamento staging ausente ou alterado');
if (cfg.preview_urls !== false) invalid('URLs de preview precisam permanecer desativadas');
const expectedAssetRoutes = ['/*', '!/_next/static/*', '!/*/_next/static/*'];
if (JSON.stringify(cfg.assets?.run_worker_first) !== JSON.stringify(expectedAssetRoutes)) invalid('Rotas asset precisam excluir CSS/JS de /_next/static do gateway e manter rotas de API nele');
if (cfg.assets?.html_handling !== 'none' || cfg.assets?.not_found_handling !== 'none') invalid('Fallback HTML de assets incorreto');
if (!cfg.assets?.directory) invalid('Build sem diretorio de Static Assets para CSS/JS');
if (cfg.vars?.ACCESS_TEAM_DOMAIN !== team) invalid('Domínio da equipe Zero Trust não corresponde ao esperado');
if (cfg.routes?.length || cfg.route || cfg.custom_domains?.length) invalid('Não publicar rotas/domínios no staging preparado');
if (!db || db.database_name !== 'sentinela-tapajos-staging') invalid('D1 staging não encontrado');
if (deployMode && db.database_id !== expectedId) invalid('O ID do D1 nao corresponde ao ambiente de staging autorizado');
if (deployMode && !/^[a-zA-Z0-9_-]{16,128}$/.test(audience)) invalid('ACCESS_AUD ausente ou incorreto');
if (deployMode && cfg.vars?.ACCESS_AUD !== audience) invalid('AUD compilado não corresponde ao AUD de staging');
if (deployMode && !uuid.test(db.database_id ?? '')) invalid('D1 staging precisa ter UUID válido antes de deploy');
if (deployMode && db.database_id === '00000000-0000-4000-8000-000000000000') invalid('D1 placeholder não pode ser publicado');
if (!process.exitCode) console.log('STAGING OK: build isolado, autenticação antes dos assets, URLs públicas desabilitadas e D1 identificado. Nenhum deploy executado.');
