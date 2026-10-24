import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const nativeRequire=createRequire(import.meta.url);
export function harness(filename=':memory:'){
  const sql=new DatabaseSync(filename);
  if(!sql.prepare("SELECT name FROM sqlite_master WHERE name='radar_settings'").get())for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));
  const hooks={beforeBatch:null,beforeAll:null,failRun:null};
  const DB={prepare(query){let args=[];const statement={bind(...a){assert(a.length<=100,'D1 bindings');args=a;return statement;},async first(){return sql.prepare(query).get(...args)??null;},async all(){if(hooks.beforeAll){const hook=hooks.beforeAll;hooks.beforeAll=null;await hook(query);}return {results:sql.prepare(query).all(...args)};},async run(){if(hooks.failRun?.(query))throw new Error('Injected D1 failure');const result=sql.prepare(query).run(...args);return {meta:{changes:Number(result.changes)}};}};return statement;},async batch(statements){if(hooks.beforeBatch){const hook=hooks.beforeBatch;hooks.beforeBatch=null;await hook();}sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out;}catch(error){sql.exec('ROLLBACK');throw error;}}};
  function loader(fetcher=async()=>{throw new Error('Network disabled');},clock=()=>Date.now()){
    const modules=new Map();
    class Clock extends Date{constructor(...args){super(...(args.length?args:[clock()]));}static now(){return clock();}}
    const context=vm.createContext({URL,URLSearchParams,Date:Clock,console,crypto,fetch:fetcher,AbortSignal,Request,Response,Headers,TextEncoder,TextDecoder,Uint8Array,setTimeout,clearTimeout});
    function load(name){if(name==='cloudflare:workers')return {env:{DB}};if(!name.startsWith('.'))return nativeRequire(name);if(modules.has(name))return modules.get(name).exports;const file=path.resolve(name+'.ts'),mod={exports:{}};modules.set(name,mod);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;vm.runInContext(`(function(require,module,exports){${code}\n})`,context)(id=>load(id.startsWith('.')?'./'+path.relative(process.cwd(),path.resolve(path.dirname(file),id)):id),mod,mod.exports);return mod.exports;}
    return load;
  }
  return {sql,DB,hooks,loader};
}
export const plain=value=>JSON.parse(JSON.stringify(value));
