import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const mock=fileURLToPath(new URL('./support/rede-simulada.mjs',import.meta.url));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function port(){
  const server=createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const value=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return value;
}
async function waitFor(check,timeout=9000){
  const until=Date.now()+timeout;
  while(Date.now()<until){
    try{const result=await check();if(result)return result;}catch{}
    await sleep(90);
  }
  throw new Error('Expirou o tempo de espera da coleta/servidor');
}
async function stop(child){
  if(child.exitCode!==null)return;
  child.kill('SIGTERM');
  await Promise.race([once(child,'exit'),sleep(2500)]);
  if(child.exitCode===null)child.kill('SIGKILL');
}

test('coleta automática funciona sem painel aberto e restaura estado após reiniciar',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'sentinela-auto-'));
  const p=await port();
  const url='http://127.0.0.1:'+p;
  const env={...process.env,DATA_DIR:dir,PORT:String(p),HOST:'127.0.0.1',ENABLE_AUTO_COLLECT:'1',COLLECT_TOKEN:''};
  let child=spawn(process.execPath,['--import',mock,'server.mjs'],{cwd:root,env,stdio:'ignore'});
  try{
    // Nenhuma requisição à interface é feita antes da coleta persistida.
    const state=await waitFor(async()=>{
      const saved=JSON.parse(await readFile(join(dir,'estado.json'),'utf8'));
      return saved?.ultimaExecucao && saved?.camadas?.inpe?.dados?.focos?.length?saved:null;
    });
    assert.equal(state.camadas.ar.dados.itaituba.pm25,0);
    assert.equal(state.camadas.tempo.dados.itaituba.ventoKmh,0);
    assert.equal(state.camadas.inpe.dados.focos.length,1);
    assert.equal(state.camadas.inpe.estado,'atual');
    await stop(child);
    child=spawn(process.execPath,['server.mjs'],{cwd:root,
      env:{...env,ENABLE_AUTO_COLLECT:'0'},stdio:'ignore'});
    const health=await waitFor(async()=>{
      const response=await fetch(url+'/api/health');
      return response.ok?response.json():null;
    });
    assert.equal(health.ultimaExecucao,state.ultimaExecucao);
    assert.equal(health.camadas.inpe.diagnostico.totalFocosEmCache,1);
    assert.deepEqual(health.camadas.inpe.diagnostico.errosParciais,[]);
    const envResponse=await fetch(url+'/api/environment?municipio=itaituba');
    assert.equal(envResponse.status,200);
    const payload=await envResponse.json();
    assert.equal(payload.indicadores.pm25,0);
    assert.equal(payload.focos.total,1);
  }finally{
    await stop(child);
    await rm(dir,{recursive:true,force:true});
  }
});
