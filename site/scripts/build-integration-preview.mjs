import fs from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "vite";
import react from "@vitejs/plugin-react";
const [outputPath]=process.argv.slice(2);
if(!outputPath||!path.isAbsolute(outputPath)) throw new Error("Pass an absolute HTML output path.");
let diary=await fs.readFile("public/diario/index.html","utf8");
const diaryCss=await fs.readFile("public/diario/style.css","utf8");
const diaryData=await fs.readFile("public/diario/data.js","utf8");
const diaryApp=await fs.readFile("public/diario/app.js","utf8");
const diaryImage="data:image/webp;base64,"+Buffer.from(await fs.readFile("public/diario/assets/mapa-explorador.webp")).toString("base64");
diary=diary.replace(/<link[^>]*href="style.css"[^>]*>/,'<style>'+diaryCss.replaceAll("assets/mapa-explorador.webp",diaryImage)+'</style>')
 .replace(/<script[^>]*src="(?:data|app).js"[^>]*><\/script>/g,'')
 .replace('</body>','<script>'+diaryData+'\n'+diaryApp+'</script></body>');
const worker=await fs.readFile("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs","utf8");
const result=await build({configFile:false,plugins:[
  {name:"single-file-map-worker",enforce:"pre",resolveId(id){if(id.endsWith("maplibre-gl-worker.mjs?worker&url"))return "\0preview-map-worker";},load(id){if(id==="\0preview-map-worker")return `export default URL.createObjectURL(new Blob([${JSON.stringify(worker)}],{type:"text/javascript"}));`;}},react()
],define:{"process.env.NODE_ENV":JSON.stringify("production")},build:{write:false,lib:{entry:path.resolve("preview/integration-entry.tsx"),name:"SentinelaPreview",formats:["es"]},cssCodeSplit:false,assetsInlineLimit:10000000,rolldownOptions:{output:{codeSplitting:false}}}});
const outputs=Array.isArray(result)?result.flatMap(r=>r.output):result.output;
let js=outputs.filter(o=>o.type==="chunk").map(o=>o.code).join("\n"),css=outputs.filter(o=>o.type==="asset"&&o.fileName.endsWith(".css")).map(o=>o.source).join("\n");
for (const [asset,mime] of [["mark.svg","image/svg+xml"],["tapajos-guardian-panel-v2.webp","image/webp"],["tapajos-guardian-opening-v2.webp","image/webp"]]) {
 const embedded="data:"+mime+";base64,"+Buffer.from(await fs.readFile("public/branding/"+asset)).toString("base64");
 js=js.replaceAll(JSON.stringify("/branding/"+asset),JSON.stringify(embedded));
}
const forest="data:image/webp;base64,"+Buffer.from(await fs.readFile("public/branding/forest-homolog.webp")).toString("base64");
css=css.replaceAll("/branding/forest-homolog.webp",forest);
for (const asset of ["tapajos-guardian-panel-v2.webp","tapajos-guardian-opening-v2.webp"]) {
 const embedded="data:image/webp;base64,"+Buffer.from(await fs.readFile("public/branding/"+asset)).toString("base64");
 css=css.replaceAll("/branding/"+asset,embedded);
}
js=js.replaceAll(JSON.stringify("/diario/index.html"),"PREVIEW_DIARY_URL");
css+=`.integration-preview-banner{background:#e7d9a8;color:#29351f;padding:10px 18px;font:12px/1.5 system-ui;display:flex;gap:20px;flex-wrap:wrap;position:relative;z-index:60}.integration-preview-banner+.app-shell .sidebar{top:56px;height:calc(100vh - 56px)}@media(max-width:760px){.integration-preview-banner{font-size:11px;gap:2px}.integration-preview-banner+.app-shell .sidebar{top:0;height:100vh}}`;
const bootstrap=`const PREVIEW_DIARY_URL=URL.createObjectURL(new Blob([${JSON.stringify(diary)}],{type:"text/html"}));`;
const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#132e25"><title>Sentinela Tapajós · Prévia da integração 24–25 OUT</title><style>${css.replaceAll("</style","<\\/style")}</style></head><body><div id="root"><p style="padding:40px;font:16px system-ui">Abrindo a versão de teste do Sentinela…</p></div><script type="module">try{${bootstrap.replaceAll("</script","<\\/script")}\n${js.replaceAll("</script","<\\/script")}\n}catch(e){document.getElementById("root").textContent="Não foi possível abrir a prévia. Use uma versão atual do Chrome, Edge ou Firefox. "+e.message;}</script></body></html>`;
await fs.mkdir(path.dirname(outputPath),{recursive:true});await fs.writeFile(outputPath,html);
console.log(JSON.stringify({output:outputPath,bytes:Buffer.byteLength(html),environmentalDataIncluded:false,productionWrites:0}));
