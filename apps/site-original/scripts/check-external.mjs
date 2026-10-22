/** Fail-closed static readiness inspection. Does not require installing dependencies. */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=new URL('../',import.meta.url);
const read=async path=>readFile(new URL(path,root),'utf8');
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const original=await read('vite.config.ts');
const external=await read('vite.external.config.ts');
const worker=await read('build/external-worker.ts');
const auth=await read('lib/external-access.mjs');
const pkg=JSON.parse(await read('package.json'));
assert(pkg.engines.node.startsWith('>=22'),'Node 22 mínimo não confirmado');
assert(original.includes('sites({ mockAuth:'),'Configuração original do Sites foi alterada');
assert(external.includes("workers_dev: false"),'Staging deve bloquear domínio workers.dev');
assert(external.includes('preview_urls: false'),'Staging não deve expor URLs de preview');
assert(external.includes("run_worker_first: ['/*', '!/_next/static/*', '!/*/_next/static/*']"),'Arquivos JS/CSS compilados precisam ser servidos via Workers Static Assets; paginas/API pelo gateway');
assert(external.includes("html_handling: 'none'") && external.includes("not_found_handling: 'none'"),'Evitar fallback de HTML estático em rotas dinamicas');
assert(external.includes("ACCESS_TEAM_DOMAIN: 'https://sentinela-tapajos.cloudflareaccess.com'"),'Domínio Zero Trust divergente');
assert(external.includes("SENTINELA_EXTERNAL_DEPLOY"),'Deploy deve ter verificação de configuração');
assert(external.includes("triggers: { crons: ['7 * * * *', '17 */3 * * *', '27 * * * *'] }"),'Triggers staging ambiental e radar devem existir');
assert(worker.includes('async scheduled(')&&worker.includes('runScheduledCycle'),'Worker sem handler de coleta agendada');
assert(worker.includes("runWatchdog('independent')") && worker.includes("controller.cron === '27 * * * *'"),'Cron independente do monitor nao esta vinculado');
assert(worker.includes('verifyAccessJwt')&&worker.includes('accessDenied()'),'Gateway não exige Access');
assert(worker.includes('withVerifiedIdentity')&&auth.includes("headers.delete(name)"),'Headers de identidade não são higienizados');
assert(auth.includes("crypto.subtle.verify")&&auth.includes("payload.iss")&&auth.includes("payload.aud"),'JWT não verificado corretamente');
const api=new URL('../app/api/',import.meta.url);
async function routes(dir){let arr=[];for(const x of await readdir(dir,{withFileTypes:true})){const p=join(dir,x.name);if(x.isDirectory())arr.push(...await routes(p));else if(x.name==='route.ts')arr.push(p)}return arr}
const paths=await routes(fileURLToPath(api));
let mutations=[];
for(const p of paths){const code=await readFile(p,'utf8');if(/export\s+async\s+function\s+(?:POST|PUT|PATCH|DELETE)\b/.test(code))mutations.push(p.replace(fileURLToPath(root),''));}
assert(mutations.length>=7,'A auditoria de rotas de gravação não encontrou o conjunto esperado');
console.log('Pré-verificação OK: autenticação obrigatória via JWT Access e workers.dev desativado.');
console.log('Rotas com gravação no código original (protegidas pelo gateway):',mutations.length);
console.log('Aviso: nenhum build, migração D1 ou implantação remota foi executada.');
