import test from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import preview from '../pwa-preview/worker.mjs';
const req=(p,method='GET')=>new Request('https://pwa-preview.example'+p,{method});
test('PWA apresenta as cinco abas sem dados inventados',async()=>{
  const response=await preview.fetch(req('/'));
  assert.equal(response.status,200);
  const html=await response.text();
  for(const tab of ['Mapa','Visão geral','Previsão','Qualidade do ar','Coleta'])assert.ok(html.includes(tab),'aba ausente: '+tab);
  assert.match(html,/integração pendente/);
  assert.match(html,/Não configurada nesta prévia/);
  assert.match(response.headers.get('cache-control'),/no-store/);
});
test('manifesto instalável para uso somente online',async()=>{
  const res=await preview.fetch(req('/manifest.webmanifest'));
  const m=await res.json();
  assert.equal(m.display,'standalone');
  assert.equal(m.scope,'/');
  assert.ok(m.icons.some(i=>i.sizes==='192x192'));
  assert.ok(m.icons.some(i=>i.sizes==='512x512'));
});
test('JavaScript e CSS da interface com sintaxe básica correta',async()=>{
  const js=await (await preview.fetch(req('/app.js'))).text();
  assert.doesNotThrow(()=>new Script(js));
  assert.doesNotMatch(js,/serviceWorker\.register|caches\.open|localStorage\.setItem/);
  const css=await (await preview.fetch(req('/app.css'))).text();
  assert.match(css,/\.tabs/);
});
test('health não mente sobre o backend ou funcionamento offline',async()=>{
  const x=await preview.fetch(req('/health'));const d=await x.json();
  assert.equal(d.status,'ok');
  assert.equal(d.backendConectado,false);
  assert.equal(d.offline,false);
});
test('somente leitura, sem rotas de escrita',async()=>{
  assert.equal((await preview.fetch(req('/','POST'))).status,405);
  assert.equal((await preview.fetch(req('/api/collect'))).status,404);
});
