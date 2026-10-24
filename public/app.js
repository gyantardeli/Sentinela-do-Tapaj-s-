import {consultarColetor, indicadorPrincipal, verificarConsistencia} from '/frontend-adapter.mjs';

const $=id=>document.getElementById(id);
const COORD={itaituba:[-4.2637,-55.9916],jacareacanga:[-6.222,-57.754], 'novo-progresso':[-7.143,-55.379],ruropolis:[-4.096,-54.906],placas:[-3.868,-54.218],aveiro:[-3.608,-55.332],trairao:[-4.574,-55.944],santarem:[-2.443,-54.708]};
const NAMES={itaituba:'Itaituba',jacareacanga:'Jacareacanga','novo-progresso':'Novo Progresso',ruropolis:'Rurópolis',placas:'Placas',aveiro:'Aveiro',trairao:'Trairão',santarem:'Santarém'};
const CITY_WORDS={itaituba:/itaituba|miritituba/i,jacareacanga:/jacareacanga|cururu/i,'novo-progresso':/novo progresso|moraes almeida|castelo dos sonhos/i,ruropolis:/rur[oó]polis/i,placas:/\bplacas\b/i,aveiro:/aveiro|fordl[aâ]ndia/i,trairao:/trair[aã]o/i,santarem:/santar[eé]m/i};
const estados={atual:'Atual',parcial:'Parcial',cache_anterior:'Cache anterior',defasado:'Desatualizado',erro:'Erro',sem_dados:'Sem dados',nao_consultado:'Não consultado'};
let env=null,radar=null,health=null,radarError=null,healthError=null;
const num=(x,d=1)=>typeof x==='number'&&Number.isFinite(x)?x.toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:d}):'—';
const time=s=>{if(!s||!Number.isFinite(Date.parse(s)))return 'sem horário';return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Santarem',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(s))+' (UTC−3)';};
const node=(t,cls,text)=>{const n=document.createElement(t);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const clear=n=>n.replaceChildren();
const getOpt=()=>({municipio:$('city').value,raioKm:Number($('radius').value),horas:Number($('hours').value),satelite:$('sat').value});
function showBanner(msg){$('notice').hidden=!msg;$('notice').textContent=msg||'';}
function setConnection(text,bad=false){const e=$('connection');e.textContent=text;e.className='conn '+(bad?'bad':'good');}
function selectSatellites(data){const picker=$('sat');const current=picker.value;const options=[...new Set((data?.focos?.itens||[]).map(f=>f.satelite).filter(Boolean))].sort();
  picker.replaceChildren(new Option('Todos','todos'));
  for(const s of options)picker.add(new Option(s,s));
  if(options.includes(current))picker.value=current;
}
function renderCards(d){const c=indicadorPrincipal(d),missing=d?.indisponivel;
  $('airValue').textContent=num(c.pm25);$('windValue').textContent=num(c.ventoKmh);
  const f=d?.focos;
  $('hotValue').textContent=f?.contagemCompleta?num(f.total,0):typeof f?.limiteInferior==='number'?`≥ ${num(f.limiteInferior,0)}`:'—';
  $('hotSub').textContent=`INPE · ${f?.contagemCompleta?'contagem no recorte':f?.parcial?'cobertura parcial':'sem contagem confirmada'} · ${estados[c.estadoINPE]||c.estadoINPE}`;
  $('airSub').textContent=`µg/m³ · ${estados[c.estadoAr]||c.estadoAr} · ${time(c.referenciaAr)}`;
  $('windSub').textContent=`km/h · ${estados[c.estadoVento]||c.estadoVento} · ${time(c.referenciaVento)}`;
  $('sensorValue').textContent='—';
  if(missing)return;
}
function updateWindy(d){const [lat,lon]=COORD[d?.cidade?.id]||COORD.itaituba;
  $('windCity').textContent=`${d?.cidade?.nome||'Itaituba'} · previsão do vento`;
  // O embed oficial é uma visualização de terceiros, não fornece leitura numérica ao aplicativo.
  const url=`https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=400&zoom=7&level=surface&overlay=wind&product=ecmwf&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh`;
  const container=$('windbox');clear(container);
  const frame=node('iframe');frame.src=url;frame.loading='lazy';frame.referrerPolicy='no-referrer';frame.title=`Mapa de ventos do Windy, referência ${d?.cidade?.nome||'Itaituba'}`;frame.setAttribute('allowfullscreen','');container.append(frame);
  $('windlink').href=`https://www.windy.com/?${lat},${lon},7`;
}
function drawPoints(d){const grid=$('gridlines'),marks=$('points'),labels=$('maplabel');clear(grid);clear(marks);clear(labels);
 const [lat,lon]=COORD[d?.cidade?.id]||COORD.itaituba;const radius=d?.raioKm||100;const latDelta=radius/110.6*1.14,lonDelta=radius/(110.6*Math.cos(lat*Math.PI/180))*1.14;
 const X=x=>280+((x-lon)/lonDelta)*260,Y=y=>163-((y-lat)/latDelta)*148;
 const SVG='http://www.w3.org/2000/svg';const el=(type,attrs)=>{const n=document.createElementNS(SVG,type);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
 for(let i=0;i<=6;i++){const p=i*560/6;grid.append(el('line',{x1:p,y1:0,x2:p,y2:326}),el('line',{x1:0,y1:i*326/6,x2:560,y2:i*326/6}));}
 const ring=el('circle',{cx:280,cy:163,r:130,fill:'none',stroke:'#89ae91','stroke-width':1.5,'stroke-dasharray':'7 5'});grid.append(ring);
 const focus=Array.isArray(d?.focos?.itens)?d.focos.itens:[];const now=Date.now();
 for(const f of focus.slice(0,1000)){const x=X(f.lon),y=Y(f.lat);if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>560||y<0||y>326)continue;const age=now-Date.parse(f.data_hora_gmt);const circle=el('circle',{cx:x,cy:y,r:age<=21600000?4:3,fill:age<=21600000?'#e07c38':'#e4ba62',stroke:'#fff','stroke-width':0.7,opacity:'.86'});circle.append(el('title',{}));circle.firstChild.textContent=`Satélite ${f.satelite||'?'} · ${time(f.data_hora_gmt)}`;marks.append(circle);}
 marks.append(el('circle',{cx:280,cy:163,r:5,fill:'#17533c',stroke:'#fff','stroke-width':2}));
 const txt=el('text',{x:293,y:157,fill:'#183e2b','font-family':'system-ui,sans-serif','font-size':'13','font-weight':'700'});txt.textContent=d?.cidade?.nome||'Itaituba';labels.append(txt);
 const txt2=el('text',{x:16,y:24,fill:'#47715a','font-family':'system-ui,sans-serif','font-size':'11'});txt2.textContent=`Raio ${radius} km · ${focus.length} ponto(s) carregado(s)`;labels.append(txt2);
 const status=d?.focos?.contagemCompleta?`${focus.length} detecção(ões) no recorte com cobertura indicada como completa.`:focus.length?`Ao menos ${focus.length} detecção(ões), cobertura incompleta ou antiga.`:'Sem contagem confirmada — ausência de dados não representa zero focos.';
 $('inpeStatus').textContent=status+' Grade esquemática em coordenadas geográficas; não é carta topográfica nem imagem de satélite.';
 $('inpeWindow').textContent=`${d?.cidade?.nome||'Itaituba'} · raio ${radius} km · últimas ${d?.horas||24} h`;
}
function renderTrend(d){const panel=$('trend');clear(panel);const series=d?.ar?.dados?.serie||[];const valid=series.filter(p=>Number.isFinite(p.pm25)&&Number.isFinite(Date.parse(p.horario)));
 if(valid.length<2){panel.append(node('div','empty','Série temporal indisponível nesta consulta.'));return;}
 const SVG='http://www.w3.org/2000/svg';const svg=document.createElementNS(SVG,'svg');svg.setAttribute('viewBox','0 0 540 154');svg.setAttribute('role','img');svg.setAttribute('aria-label','Gráfico de PM2,5 modelado ao longo do tempo');
 const el=(tag,attributes)=>{const n=document.createElementNS(SVG,tag);for(const [k,v] of Object.entries(attributes))n.setAttribute(k,String(v));return n;};
 const first=Date.parse(valid[0].horario),last=Date.parse(valid[valid.length-1].horario);const min=Math.min(...valid.map(p=>p.pm25)),max=Math.max(...valid.map(p=>p.pm25));const div=(max-min)||1;const dx=(last-first)||1;
 for(let i=0;i<=4;i++){svg.append(el('line',{x1:34,y1:16+i*28,x2:529,y2:16+i*28,stroke:'#dfeae3','stroke-width':1}));const t=el('text',{x:29,y:20+i*28,'text-anchor':'end','font-size':9,fill:'#819587'});t.textContent=num(max-i*div/4,0);svg.append(t);}
 const plot=valid.map(p=>`${34+495*((Date.parse(p.horario)-first)/dx)},${128-108*(p.pm25-min)/div}`).join(' ');svg.append(el('polyline',{points:plot,stroke:'#337b57','stroke-width':2.5,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'}));
 for(const pos of [0,1]){const i=pos?valid.length-1:0;const t=el('text',{x:pos?527:38,y:147,'text-anchor':pos?'end':'start','font-size':9,fill:'#819587'});t.textContent=time(valid[i].horario).replace(' (UTC−3)','');svg.append(t);}panel.append(svg);
}
function renderWindContext(d){const r=d?.indicadores;const recent=d?.tempo?.observadoEm&&Math.abs(Date.now()-Date.parse(d.tempo.observadoEm))<=2*3600000;
 if(!recent||!(typeof r?.ventoKmh==='number')||r.ventoKmh<2){$('windContext').textContent='Sem vento recente e suficientemente intenso para triagem direcional. A análise por setor permanece suspensa.';return;}
 $('windContext').textContent=`Modelo indica vento de ${num(r.ventoKmh)} km/h (${time(r.referenciaVento)}). ${d?.focos?.contagemCompleta?'Há cobertura do INPE disponível para comparação.':'A cobertura incompleta do INPE impede concluir ausência de focos no setor.'} A direção isolada não é previsão de dispersão.`;
}
function renderRegion(d){const table=$('regionBody');clear(table);
 if(!Array.isArray(d?.regional)){table.append(node('tr'));table.firstChild.append(node('td','', 'Sem panorama regional em cache'));table.firstChild.firstChild.colSpan=4;return;}
 for(const m of d.regional){const tr=node('tr');const td=node('td');const btn=node('button','',m.municipio);btn.type='button';btn.addEventListener('click',()=>{$('city').value=m.id;change();window.scrollTo({top:0,behavior:'smooth'});});td.append(btn);if(m.id===d.cidade.id)td.append(node('span','tag','Selecionado'));tr.append(td);
  tr.append(node('td','',num(m.ar?.pm25)+' µg/m³'));
  tr.append(node('td','',num(m.tempo?.ventoKmh)+' km/h'));
  const st=node('td');st.append(node('span',`tag ${['defasado','cache_anterior'].includes(m.estadoAr)?'warn':''}`,estados[m.estadoAr]||m.estadoAr),node('span',`tag ${['defasado','cache_anterior'].includes(m.estadoTempo)?'warn':''}`,estados[m.estadoTempo]||m.estadoTempo),node('br'),node('small','',`Ar: ${time(m.referenciaAr)} · Vento: ${time(m.referenciaVento)}`));tr.append(st);table.append(tr);
 }
}
function renderNews(){const list=$('newsList');clear(list);const hours=Number($('newsPeriod').value);const city=$('city').value;const cutoff=Date.now()-hours*3600000;
 const items=(radar?.noticias||[]).filter(a=>{const t=Date.parse(a.publicadoEm);return Number.isFinite(t)&&t>=cutoff&&t<=Date.now()+300000&&typeof a.titulo==='string'&&typeof a.link==='string'&&/^https?:\/\//.test(a.link);});
 const relevant=items.filter(a=>CITY_WORDS[city].test([a.titulo,a.local].join(' ')));
 const first=relevant.length?relevant:items;
 const visible=first.slice(0,4);
 if(!visible.length){list.append(node('div','panel empty',radarError?'Não foi possível consultar as notícias no servidor.':'Nenhuma notícia válida no recorte disponível. Isso não comprova ausência de ocorrências.'));}
 for(const a of visible){const card=node('article','panel story');card.append(node('div','meta',`${a.fonte||'Fonte não identificada'} · ${time(a.publicadoEm)} · ${a.modoColeta==='indice_parcial'?'Índice parcial':'RSS direto'}`));const heading=node('h3'),link=node('a','',a.titulo);link.href=a.link;link.target='_blank';link.rel='noopener noreferrer';heading.append(link);card.append(heading);card.append(node('small','',a.local||'Região monitorada'));list.append(card);}
 const f=health;if(f){const total=f.fontesTotal||20;const feeds=f.rssConfirmado||0;const parcial=f.indiceParcial||0;$('newsCoverage').textContent=`${feeds} RSS direto(s) · ${parcial} índice(s) parcial(is) · ${total-feeds-parcial} não confirmadas · consulta ao servidor`;}
 else $('newsCoverage').textContent='Cobertura das fontes não verificada nesta consulta';
}
async function getOnline(url){
 try{
   const resp=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!resp.ok)throw new Error(`HTTP ${resp.status}`);
   return {data:await resp.json(),erro:null};
 }catch(error){return {data:null,erro:String(error?.message||error)};}
}
let seq=0;
async function change(){const id=++seq;const o=getOpt();$('refresh').disabled=true;setConnection('Consultando o histórico disponível…');
 const [e,r,h]=await Promise.all([consultarColetor(o),getOnline('/api/radar?limit=500'),getOnline('/api/health')]);
 if(id!==seq)return;env=e;radar=r.data;health=h.data;radarError=r.erro;healthError=h.erro;
 $('refresh').disabled=false;
 const problems=[];
 if(e.indisponivel)problems.push('Consulta ambiental indisponível no servidor. Verifique a conexão.');
 if(e.focos?.parcial)problems.push('INPE: cobertura incompleta ou defasada; não interpretar ausência de focos como zero.');
 if(r.erro)problems.push('Notícias: consulta ao servidor indisponível.');
 if(h.erro)problems.push('Diagnóstico das fontes: sem resposta do servidor nesta consulta.');
 if(e.cidade && !verificarConsistencia(e).coerente)problems.push('Inconsistência entre cartão principal e panorama; dados recusados.');
 showBanner(problems.join(' '));
 setConnection(e.indisponivel?'Servidor indisponível':`Histórico no servidor · ${time(e.ultimaExecucao)}`,Boolean(e.indisponivel));
 renderCards(e);drawPoints(e);renderTrend(e);renderWindContext(e);renderRegion(e);renderNews();if(e.cidade)selectSatellites(e);
 updateWindy(e);
}
$('refresh').addEventListener('click',change);
for(const id of ['city','radius','hours','sat'])$(id).addEventListener('change',change);
$('newsPeriod').addEventListener('change',renderNews);
$('copySummary').addEventListener('click',async()=>{const c=indicadorPrincipal(env);const content=`SENTINELA TAPAJÓS — ${env?.cidade?.nome||'Área não disponível'}\nConsulta: ${time(env?.ultimaExecucao)}\nPM2,5 modelo: ${num(c.pm25)} µg/m³ (${time(c.referenciaAr)}; ${c.estadoAr})\nVento modelo: ${num(c.ventoKmh)} km/h (${time(c.referenciaVento)}; ${c.estadoVento})\nFocos INPE: ${env?.focos?.contagemCompleta?num(c.detecoes,0):env?.focos?.limiteInferior!=null?'ao menos '+num(env.focos.limiteInferior,0):'sem contagem confirmada'}\nDetecção não equivale a incêndio independente.`;
 try{await navigator.clipboard.writeText(content);$('copySummary').textContent='Resumo copiado';}catch{$('copySummary').textContent='Cópia indisponível';}setTimeout(()=>$('copySummary').textContent='Copiar resumo',1800);});
$('print').addEventListener('click',()=>window.print());
// Remove o cache offline antigo sem apagar histórico nem preferências mantidas no servidor.
async function desativarOfflineLegado(){
  if('serviceWorker' in navigator){
    try{
      const regs=await navigator.serviceWorker.getRegistrations();
      const antigos=regs.filter(r=>[r.active,r.waiting,r.installing].some(w=>w && new URL(w.scriptURL,location.href).pathname==='/sw.js'));
      await Promise.all(antigos.map(r=>r.unregister()));
    }catch{}
  }
  if('caches' in window){
    try{
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith('sentinela-shell-')).map(k=>caches.delete(k)));
    }catch{}
  }
  try{
    for(let i=localStorage.length-1;i>=0;i--){
      const key=localStorage.key(i);
      if(key && (/^sentinela-env-v21:/.test(key)||key==='sentinela-radar-v22'||key==='sentinela-health-v22'))localStorage.removeItem(key);
    }
  }catch{}
}
void desativarOfflineLegado();
change();
