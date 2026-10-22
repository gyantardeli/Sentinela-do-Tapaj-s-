import test from 'node:test';
import assert from 'node:assert/strict';
import { runScheduledCycle } from '../lib/scheduled-core.mjs';
function storage() {
  const inserts=[], deletions=[];
  const db = { prepare(sql) {
    const obj={bind(...values) {obj.values=values; return obj;}};
    return obj;
  }, async batch(queries) {
    inserts.push(queries[0].values); deletions.push(queries[1].values);
  }};
  return {db,inserts,deletions};
}
test('coleta registra UTC, sucesso e dados de origem sem inventar deteccoes', async () => {
  const x=storage(), logs=[];
  const result=await runScheduledCycle({db:x.db,mode:'environment',now:()=>1000,
    id:()=> 'test-id',logger:{log:(...p)=>logs.push(p)},
    tasks:[{name:'air-weather',run:async()=>({status:'ok',accepted:16,dataAt:800})},
      {name:'inpe',run:async()=>({status:'partial',accepted:0,detail:'Cobertura parcial'})}]});
  assert.equal(result.status,'partial');
  assert.equal(result.results[1].accepted,0);
  assert.equal(result.results[1].status,'partial');
  assert.equal(x.inserts[0][2],'cron:environment');
  assert.equal(JSON.parse(x.inserts[0][3]).results[0].dataAt,800);
  assert.equal(x.deletions.length,1);
  assert.equal(logs.length,1);
});
test('falha de uma fonte nao elimina o resultado de outra', async () => {
  const x=storage();
  const result=await runScheduledCycle({db:x.db,mode:'environment',now:()=>2000,
    id:()=> 'test-2',logger:{log:()=>{}},
    tasks:[{name:'air',run:async()=>{throw new Error('HTTP 503')}},
      {name:'inpe',run:async()=>({status:'ok',accepted:5})}]});
  assert.equal(result.status,'partial'); assert.equal(result.results[0].status,'error');
  assert.match(result.results[0].detail,/HTTP 503/);
});
test('sem D1 ou modo desconhecido nao aceita executar',async()=> {
  await assert.rejects(()=>runScheduledCycle({db:null,mode:'radar',tasks:[{}]}));
  await assert.rejects(()=>runScheduledCycle({db:{},mode:'production',tasks:[{}]}));
});
test('erro de escrita do journal falha o cron',async()=>{
  const bad={prepare:()=>({bind:()=>({})}),batch:async()=>{throw new Error('D1 erro')}};
  await assert.rejects(()=>runScheduledCycle({db:bad,mode:'radar',id:()=>'x',tasks:[{name:'radar',run:async()=>({status:'ok'})}],logger:{log:()=>{}}}),/D1 erro/);
});
