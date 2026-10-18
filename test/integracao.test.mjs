import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';

async function port(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
const root=fileURLToPath(new URL('../',import.meta.url));
let server,dir,url;

// Servidor real, porém sem consultar serviços externos: teste de integração offline.
test.before(async()=>{
 dir=await mkdtemp(join(tmpdir(),'sentinela-http-'));const p=await port();url=`http://127.0.0.1:${p}`;
 server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(p),DATA_DIR:dir,ENABLE_AUTO_COLLECT:'0'},stdio:'ignore'});
 for(let i=0;i<80;i++){
  if(server.exitCode!==null)throw new Error('Servidor encerrou antes de escutar');
  try{const r=await fetch(url+'/api/health');if(r.ok)return;}catch{}
  await new Promise(r=>setTimeout(r,65));
 }
 throw new Error('Servidor não iniciou no tempo esperado');
});
test.after(async()=>{if(server && server.exitCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}if(dir)await rm(dir,{recursive:true,force:true});});

test('painel principal e monitor de fontes são servidos em rotas separadas',async()=>{
 let r=await fetch(url+'/');assert.equal(r.status,200);const html=await r.text();assert.match(html,/Queimadas e qualidade do ar/);assert.match(html,/id="regionBody"/);
 r=await fetch(url+'/fontes');assert.equal(r.status,200);assert.match(await r.text(),/Saúde das fontes/);
});

test('arquivos estáticos, adaptador e recursos offline são entregues pelo backend',async()=>{
 const types=new Map([['/app.js','text/javascript'],['/app.css','text/css'],['/frontend-adapter.mjs','text/javascript'],['/sw.js','text/javascript'],['/manifest.webmanifest','application/manifest+json'],['/icon-192.png','image/png']]);
 for(const [path,type] of types){const r=await fetch(url+path);assert.equal(r.status,200,path);assert.ok((r.headers.get('content-type')||'').startsWith(type),path);assert.ok((await r.arrayBuffer()).byteLength>100);}
});

test('campos vazios não aparecem como zeros, municípios coerentes na API',async()=>{
 const r=await fetch(url+'/api/environment?municipio=itaituba&raioKm=100&horas=24&satelite=todos');assert.equal(r.status,200);const j=await r.json();
 assert.equal(j.cidade.id,'itaituba');assert.equal(j.regional.length,8);assert.equal(j.indicadores.pm25,null);assert.equal(j.indicadores.ventoKmh,null);assert.equal(j.focos.total,null);assert.equal(j.focos.contagemCompleta,false);
});

test('saúde das fontes retorna 20 cadastradas com contagem não verificada',async()=>{
 const r=await fetch(url+'/api/health');assert.equal(r.status,200);const j=await r.json();assert.equal(j.fontesTotal,20);assert.equal(j.fontes.length,20);assert.equal(j.aindaNaoTestadas,20);assert.equal(j.rssConfirmado,0);
});

test('radar inicia vazio e comando de coleta sem segredo permanece bloqueado',async()=>{
 const r=await fetch(url+'/api/radar');const j=await r.json();assert.equal(j.total,0);assert.deepEqual(j.noticias,[]);
 const post=await fetch(url+'/api/collect',{method:'POST'});assert.equal(post.status,503);
});
