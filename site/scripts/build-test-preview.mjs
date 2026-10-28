import fs from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "vite";
import react from "@vitejs/plugin-react";
const [snapshotPath,outputPath]=process.argv.slice(2);
if(!snapshotPath||!outputPath||!path.isAbsolute(snapshotPath)||!path.isAbsolute(outputPath)) throw new Error("Pass absolute paths for the snapshot JSON and HTML output.");
const snapshot=JSON.parse(await fs.readFile(snapshotPath,"utf8"));
const dashboards=Object.values(snapshot.responses).filter(r=>r?.place&&Array.isArray(r.fires));
snapshot.commonFires=dashboards[0]?.fires??[];
const commonJson=JSON.stringify(snapshot.commonFires);
for(const row of dashboards) if(JSON.stringify(row.fires)===commonJson) {delete row.fires;row.firesRef=true;}
const worker=await fs.readFile("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs","utf8");
const result=await build({configFile:false,plugins:[
  {name:"single-file-map-worker",enforce:"pre",resolveId(id){if(id.endsWith("maplibre-gl-worker.mjs?worker&url"))return "\0preview-map-worker";},load(id){if(id==="\0preview-map-worker")return `export default URL.createObjectURL(new Blob([${JSON.stringify(worker)}],{type:"text/javascript"}));`;}},react()
],define:{"process.env.NODE_ENV":JSON.stringify("production")},build:{write:false,lib:{entry:path.resolve("preview/entry.tsx"),name:"SentinelaPreview",formats:["es"]},cssCodeSplit:false,assetsInlineLimit:10000000,rolldownOptions:{output:{codeSplitting:false}}}});
const outputs=Array.isArray(result)?result.flatMap(r=>r.output):result.output;
let js=outputs.filter(o=>o.type==="chunk").map(o=>o.code).join("\n"),css=outputs.filter(o=>o.type==="asset"&&o.fileName.endsWith(".css")).map(o=>o.source).join("\n");
for (const [asset,mime] of [["mark.svg","image/svg+xml"],["tapajos-guardian-panel-v2.webp","image/webp"],["tapajos-guardian-opening-v2.webp","image/webp"]]) {
 const embedded="data:"+mime+";base64,"+Buffer.from(await fs.readFile("public/branding/"+asset)).toString("base64");
 js=js.replaceAll(JSON.stringify("/branding/"+asset),JSON.stringify(embedded));
}
// No unopened hero or obsolete field-reader assets are needed for this review build.
css=css.replace(/url\(["']?\/branding\/[^)]+\)/g,"none");
const packed=gzipSync(Buffer.from(JSON.stringify(snapshot))).toString("base64");
css+=`.test-preview-banner{background:#f6e9bd;color:#53461d;padding:12px 24px;font:12px/1.6 system-ui;display:flex;gap:18px;align-items:center;position:relative;z-index:60}.test-preview-banner strong{white-space:nowrap}.test-preview-banner+.app-shell .sidebar{top:62px}.test-preview-banner+.app-shell{padding-top:0}@media(max-width:760px){.test-preview-banner{padding:10px 12px;display:block;font-size:10px}.test-preview-banner strong{display:block}.test-preview-banner+.app-shell .sidebar{top:0}}`;
const bootstrap=`const encoded=${JSON.stringify(packed)};const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));window.SENTINELA_TEST_DATA=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text());`;
const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#132e25"><title>Sentinela Tapajós · Teste do mapa único</title><style>${css.replaceAll("</style","<\\/style")}</style></head><body><div id="root"><p style="padding:40px;font:16px system-ui">Abrindo a versão de teste do Sentinela…</p></div><script type="module">try{${bootstrap}\n${js.replaceAll("</script","<\\/script")}\n}catch(e){document.getElementById("root").textContent="Não foi possível abrir a prévia. Use uma versão atual do Chrome, Edge ou Firefox. "+e.message;}</script></body></html>`;
await fs.mkdir(path.dirname(outputPath),{recursive:true});await fs.writeFile(outputPath,html);
console.log(JSON.stringify({output:outputPath,bytes:Buffer.byteLength(html),capturedAt:snapshot.capturedAt,apiSnapshots:Object.keys(snapshot.responses).length,productionWrites:0}));
