import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../lib/watchdog.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { collectionIssues } = await import('data:text/javascript,' + encodeURIComponent(javascript));
test('coleta do radar de tres horas nao gera falso atraso de 90 minutos',()=>{
  const now=50000, targets=[{id:'radar-run',name:'Radar',lastAt:now-2*3600,failure:null},{id:'radar:g1',name:'G1',lastAt:now-3*3600,failure:null}];
  assert.deepEqual(collectionIssues(targets,now),[]);
  assert.match(collectionIssues([{...targets[0],lastAt:now-226*60}],now)[0].reason,/225 min/);
});
test('limite ambiental de 90 minutos continua valido',()=>{
  const now=50000;
  assert.deepEqual(collectionIssues([{id:'air',name:'Ar',lastAt:now-90*60,failure:null}],now),[]);
  assert.match(collectionIssues([{id:'air',name:'Ar',lastAt:now-91*60,failure:null}],now)[0].reason,/90 min/);
});
test('indisponibilidade, ausência e timestamps futuros ainda sao problemas',()=>{
  const now=50000;
  const issues=collectionIssues([
    {id:'radar:a',name:'A',lastAt:now-50,failure:'HTTP 403'},
    {id:'radar:b',name:'B',lastAt:null,failure:null},
    {id:'air',name:'Ar',lastAt:now+500,failure:null}
  ],now);
  assert.equal(issues.length,3);
  assert.match(issues[0].reason,/HTTP 403/);
  assert.match(issues[1].reason,/Sem registro/);
  assert.match(issues[2].reason,/no futuro/);
});
test('monitor horariamente independente nao mistura registros cron com watchdog', async()=>{
  const worker=await readFile(new URL('../build/external-worker.ts',import.meta.url),'utf8');
  const store=await readFile(new URL('../lib/watchdog-store.ts',import.meta.url),'utf8');
  assert.match(worker,/controller\.cron === '27 \* \* \* \*'/);
  assert.match(worker,/ctx\.waitUntil\(runWatchdog\('independent'\)\)/);
  assert.equal(store.split("WHERE mode IN ('manual','independent')").length,3);
});
