// Regression for the published IBAMA RSS 1.0 feed; no external requests or database writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const modules=new Map();
function load(name){
 if(modules.has(name))return modules.get(name);
 const file=path.resolve(name+'.ts'),exports={};modules.set(name,exports);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('require','exports',code)(id=>load('./'+path.relative(process.cwd(),path.resolve(path.dirname(file),id))),exports);return exports;
}
const now=Math.floor(Date.now()/1000),radar=load('./lib/radar-collector');
async function check(name,fn){await fn();console.log('PASS '+name);}
await check('Official IBAMA RSS 1.0 preserves publication dates and direct collection',async()=>{
 const source=load('./lib/radar-sources').RADAR_SOURCES.find(s=>s.id==='ibama'),core=load('./lib/radar-core'),url='https://www.gov.br/ibama/pt-br/noticias/2026/nota-teste';
 const rdf=`<?xml version="1.0"?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel rdf:about="${source.url}"><title>IBAMA</title></channel><item rdf:about="${url}"><title>Brigadistas combatem incêndio em Itaituba</title><link>${url}</link><dc:date>${new Date(now*1000).toISOString()}</dc:date><description>Combate ao fogo no Pará.</description></item></rdf:RDF>`;
 const entries=core.parseFeed(rdf);assert.equal(entries.length,1);assert.equal(entries[0].url,url);assert.equal(Date.parse(entries[0].date)/1000,now);
 const calls=[],result=await radar.collectSource(source,now,async u=>{calls.push(u);return u===source.feeds[0]?new Response(rdf):new Response('',{status:404});});
 assert.equal(calls[0],'https://www.gov.br/ibama/pt-br/RSS');assert(!calls.includes('https://www.gov.br/feed/'));assert.equal(result.check.status,'ok');assert.equal(result.items.length,1);assert.equal(result.items[0].mode,'rss');assert.equal(result.items[0].publishedAt,now);
 assert.throws(()=>core.parseFeed('<rdf:RDF xmlns="https://example.invalid/schema"><item><title>Not a feed</title></item></rdf:RDF>'));
 assert.throws(()=>core.parseFeed('<html>RSS unavailable</html>'));assert.throws(()=>core.parseFeed(rdf+' '.repeat(2_000_001)));
 assert.equal(core.parseFeed('<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom item</title><link href="'+url+'"/><updated>2026-10-26T12:00:00Z</updated></entry></feed>')[0].url,url);
});
