import test from 'node:test';
import assert from 'node:assert/strict';
import { planFireArchiveDays } from '../lib/history-scheduler.mjs';
const now = Date.parse('2026-10-23T12:00:00Z') / 1000;
const dateAgo = n => new Date((now - n*86400)*1000).toISOString().slice(0,10);
const filled = Array.from({length:31},(_,i)=>({day_utc:dateAgo(i),collected_at:now-3600,closed:i>0?true:false}));
test('histórico íntegro evita duplicações e reimportação a cada execução',()=>{
 assert.deepEqual(planFireArchiveDays(now,filled),[]);
});
test('renova arquivo do dia atual quando ficar defasado',()=>{
 const rows=filled.map(x=>({...x}));
 rows[0].collected_at=now-7*3600;
 assert.deepEqual(planFireArchiveDays(now,rows),[dateAgo(0)]);
});
test('prioriza fechamento de dia antes importado parcialmente',()=>{
 const rows=filled.map(x=>({...x}));
 rows[1].closed=false;
 assert.deepEqual(planFireArchiveDays(now,rows),[dateAgo(1)]);
});
test('identifica falta histórica e limita no máximo três downloads',()=>{
 const rows=filled.filter(x=>![dateAgo(16),dateAgo(28),dateAgo(29)].includes(x.day_utc));
 const plan=planFireArchiveDays(now,rows);
 assert.ok(plan.includes(dateAgo(28))||plan.includes(dateAgo(29)));
 assert.ok(plan.length<=3);
 assert.equal(new Set(plan).size,plan.length);
});
test('planejamento não presume que dias ausentes tenham zero detecções',()=>{
 const rows=filled.filter(x=>x.day_utc!==dateAgo(10));
 assert.deepEqual(planFireArchiveDays(now,rows),[dateAgo(10)]);
});
test('recusa datas inválidas ou número de downloads ilimitado',()=>{
 assert.throws(()=>planFireArchiveDays(NaN,filled));
 assert.throws(()=>planFireArchiveDays(now,filled,30));
});
