import { createServer } from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { collectAll, emptyState, markStale } from './collector.mjs';
import { buildEnvironmentView } from './environment-view.mjs';
import { SOURCES, MUNICIPIOS, CONSULTAS_MANUAIS } from './registry.mjs';

const ROOT=dirname(fileURLToPath(import.meta.url));
const DATA_DIR=resolve(process.env.DATA_DIR||join(ROOT,'data'));
const DATA_FILE=join(DATA_DIR,'estado.json');
const PORT=Number(process.env.PORT||8787);
const HOST=process.env.HOST||'127.0.0.1'; // padrão: protegido na própria máquina
const TOKEN=process.env.COLLECT_TOKEN||'';
let state=emptyState(), busy=false;

async function load(){
  try { const obj=JSON.parse(await readFile(DATA_FILE,'utf8'));if(obj?.versao===2)state={...emptyState(),...obj}; }
  catch(err){if(err.code!=='ENOENT')console.error('Arquivo de dados inválido; cópia não foi substituída:',err.message);}
}
async function persist(next){
  await mkdir(DATA_DIR,{recursive:true});
  const tmp=DATA_FILE+`.tmp-${process.pid}`;
  await writeFile(tmp,JSON.stringify(next),'utf8');
  await rename(tmp,DATA_FILE); // gravação atômica em sistema de arquivos local
  state=next;
}
export async function runCollection(){
  if(busy)return {iniciado:false,motivo:'coleta_ja_em_andamento'};
  busy=true;
  try{
    const next=await collectAll(state);
    await persist(next);
    return {iniciado:true,concluidoEm:next.ultimaExecucao,camadas:Object.fromEntries(Object.entries(next.camadas).map(([k,v])=>[k,v.estado]))};
  }finally{busy=false;}
}
function respond(res,status,body,headers={}){
  const text=JSON.stringify(body);
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});
  res.end(text);
}
function summaries(){
  const now=Date.now(),maxAgeMs=4*3600000;
  const fontes=SOURCES.map(source=>{
    const checked=state.fontes[source.id];
    if(!checked)return {...source,status:'nao_consultado',defasada:false};
    const age=now-Date.parse(checked.atualizadoEm||'');
    return {...source,...checked,defasada:!Number.isFinite(age)||age>maxAgeMs};
  });
  const comAcesso=s=>['ok_rss','rss_sem_resultados','parcial_indice','indice_sem_resultados'].includes(s.status);
  const novos=fontes.filter(s=>comAcesso(s)&&!s.defasada);
  const camadas=Object.fromEntries(['ar','tempo','inpe'].map(k=>{
    const obj=markStale(state.camadas[k],now,k)||{estado:'nao_consultado'};
    return [k,{estado:obj.estado,ultimaAtualizacao:obj.ultimaAtualizacao??null,
      ultimaTentativa:obj.ultimaTentativa??null,tipoErro:obj.tipoErro??null,
      mensagem:obj.mensagem??null,
      usandoCache:obj.usandoCache??obj.estado==='cache_anterior',defasado:obj.defasado??false,
      parcial:k==='inpe'?Boolean(obj.dados?.parcial):Object.keys(obj.falhasMunicipais||{}).length>0,
      municipiosComFalha:k==='inpe'?null:Object.keys(obj.falhasMunicipais||{}).length,
      ...(k==='inpe'?{diagnostico:{
        arquivos:obj.dados?.arquivos??[],
        errosParciais:obj.dados?.errosParciais??[],
        falhasUltimaTentativa:obj.falhasArquivos??[],
        recuperadosCache:obj.dados?.recuperadosCache??0,
        totalFocosEmCache:obj.dados?.focos?.length??null,
        ultimoFoco:obj.dados?.focos?.[0]?.data_hora_gmt??null,
        janelaHoras:obj.dados?.janelaHoras??null
      }}:{})}];
  }));
  return {versao:2,ultimaExecucao:state.ultimaExecucao,emExecucao:busy, fontesTotal:SOURCES.length,
    rssConfirmado:novos.filter(s=>['ok_rss','rss_sem_resultados'].includes(s.status)).length,
    indiceParcial:novos.filter(s=>['parcial_indice','indice_sem_resultados'].includes(s.status)).length,
    falhas:fontes.filter(s=>s.status==='erro').length,
    fontesDefasadas:fontes.filter(s=>s.defasada).length,
    aindaNaoTestadas:fontes.filter(s=>s.status==='nao_consultado').length,
    camadas,fontes,historico:state.execucoes.slice(0,30),consultasManuais:CONSULTAS_MANUAIS};
}

function readEnv(url){
  return buildEnvironmentView(state,{
    municipio:url.searchParams.get('municipio')||'itaituba',
    raioKm:url.searchParams.get('raioKm')||100,
    horas:url.searchParams.get('horas')||24,
    satelite:url.searchParams.get('satelite')||'todos'
  });
}

async function handle(req,res){
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  const paginas = new Map([
    ['/','index.html'], ['/painel','index.html'], ['/fontes','fontes.html'],
    ['/app.js','app.js'], ['/app.css','app.css'],
    ['/doom','doom.html'], ['/doom.html','doom.html'],
    ['/doom.js','doom.js'], ['/doom.css','doom.css'], ['/doom-unlock.js','doom-unlock.js'],
    ['/frontend-adapter.mjs','../frontend-adapter.mjs'],
    ['/manifest.webmanifest','manifest.webmanifest'], ['/icon-192.png','icon-192.png'], ['/icon-512.png','icon-512.png'], ['/sw.js','sw.js']
  ]);
  if(req.method==='GET' && paginas.has(url.pathname)){
    const entry=paginas.get(url.pathname);
    const full=entry.startsWith('../')?join(ROOT,entry.slice(3)):join(ROOT,'public',entry);
    const mime=entry.endsWith('.png')?'image/png':entry.endsWith('.css')?'text/css':entry.endsWith('.js')||entry.endsWith('.mjs')?'text/javascript':entry.endsWith('.webmanifest')?'application/manifest+json':'text/html';
    try{const bytes=await readFile(full);res.writeHead(200,{
      'Content-Type':mime==='image/png'?mime:`${mime}; charset=utf-8`,
      'Cache-Control':entry==='sw.js'?'no-cache':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer',
      'X-Frame-Options':'DENY'
    });res.end(bytes);}catch{res.writeHead(404);res.end();}
    return;
  }
  if(req.method==='GET'&&url.pathname==='/api/health'){respond(res,200,summaries());return;}
  if(req.method==='GET'&&url.pathname==='/api/environment'){respond(res,200,readEnv(url));return;}
  if(req.method==='GET'&&url.pathname==='/api/radar'){
    const limit=Math.min(Math.max(Number(url.searchParams.get('limit')||100),1),500);
    respond(res,200,{data:state.ultimaExecucao,total:state.noticias.length,noticias:state.noticias.slice(0,limit),fontes:summaries().fontes});return;
  }
  if(req.method==='POST'&&url.pathname==='/api/collect'){
    if(!TOKEN){respond(res,503,{erro:'COLLECT_TOKEN não configurado; acionamento remoto desativado'});return;}
    if(req.headers.authorization!==`Bearer ${TOKEN}`){respond(res,401,{erro:'Autorização necessária'});return;}
    if(busy){respond(res,409,{erro:'Coleta já em andamento'});return;}
    // resposta de início; a execução fica no processo, com exclusão de concorrência
    respond(res,202,{status:'iniciando'});
    runCollection().catch(err=>console.error('Falha na rotina:',err));return;
  }
  respond(res,404,{erro:'Endpoint não encontrado'});
}
await load();
if(process.argv.includes('--once')){
  const result=await runCollection();console.log(JSON.stringify(result,null,2));
}else{
  const server=createServer((req,res)=>handle(req,res).catch(e=>{console.error(e);if(!res.headersSent)respond(res,500,{erro:'Falha interna'});else res.end();}));
  server.listen(PORT,HOST,()=>console.log(`Sentinela coletor v2: http://${HOST}:${PORT} (automático: ${process.env.ENABLE_AUTO_COLLECT!=='0'})`));
  if(process.env.ENABLE_AUTO_COLLECT!=='0'){
    setTimeout(()=>runCollection().catch(console.error),700);
    setInterval(()=>runCollection().catch(console.error),3600000);
  }
}
