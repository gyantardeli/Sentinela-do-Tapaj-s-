import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
const base=new URL('../',import.meta.url);
const load=async s=>readFile(new URL(s,base),'utf8');

test('página mantém liberdade de contribuição e tom de cafezinho',async()=>{
 const p=await load('app/apoie/page.tsx');
 assert.match(p,/Me paga um café\?/);
 assert.match(p,/cafezinho simbólico/);
 assert.match(p,/continuam <strong>gratuitos<\/strong>/);
 assert.match(p,/não há benefícios digitais/i);
 assert.match(p,/não é campanha\s+beneficente/i);
});

test('sem dados Pix, botão de copiar está protegido por condicional',async()=>{
 const p=await load('app/apoie/page.tsx');
 assert.match(p,/pix\.enabled && pix\.cnpjKey && pix\.businessName/);
 assert.match(p,/Pagamentos desativados/);
 assert.doesNotMatch(p,/chave.*123456/i);
});

test('camada de Pix tem guardas de autorização e verificação',async()=>{
 const s=await load('lib/apoie-pix.ts');
 assert.match(s,/SENTINELA_PIX_ENABLED/);
 assert.match(s,/SENTINELA_PIX_VERIFIED/);
 assert.match(s,/permission && bankVerified && validCnpj/);
 assert.match(s,/enabled \? key : null/);
});

test('CSS usa classes locais, sem modificar global CSS',async()=>{
 const c=await load('app/apoie/style.module.css');
 assert.match(c,/\.page\{/);
 assert.match(c,/@media\(max-width:720px\)/);
});
