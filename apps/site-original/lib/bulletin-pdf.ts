import { PDFDocument, PDFName, PDFString, rgb, type PDFPage } from "pdf-lib";
import { areaDescription } from "./areas";
import fontkit from "@pdf-lib/fontkit";
import { PLACES, compass, display, stamp } from "./environment";
import { bulletinGeometry, bulletinLimits, bulletinView, localityName, safeUrl, sourceLabel, type Bulletin } from "./bulletin";

export async function createBulletinPdf(b:Bulletin,fonts?:{regular:Uint8Array;bold:Uint8Array}):Promise<Uint8Array> {
  async function readFont(path:string){const response=await fetch(path,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error("Fonte do PDF indisponível.");return new Uint8Array(await response.arrayBuffer());}
  const bytes=fonts??{regular:await readFont("/fonts/DejaVuSans.ttf"),bold:await readFont("/fonts/DejaVuSans-Bold.ttf")};
  const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
  const regular=await doc.embedFont(bytes.regular,{subset:true}),bold=await doc.embedFont(bytes.bold,{subset:true});
  const green=rgb(.13,.31,.22),ink=rgb(.16,.26,.20),muted=rgb(.39,.45,.39),line=rgb(.85,.89,.84),soft=rgb(.94,.96,.93),orange=rgb(.85,.40,.22);
  const width=595.28,height=841.89,left=42,right=553,body=right-left;
  // Embedded fonts keep Portuguese readable across devices. Normalize dashes and unsupported glyphs.
  const supported=new Set(regular.getCharacterSet());
  function clean(value:unknown){return Array.from(String(value??"")).map(c=>{if(/[\u2010-\u2015\u2212]/.test(c))return "-";if(c==="\u202f"||c==="\u00a0")return " ";return supported.has(c.codePointAt(0)!)?c:" ";}).join("");}
  function wrap(value:unknown,max=body,size=10.2,strong=false){const font=strong?bold:regular,words=clean(value).split(/\s+/),lines:string[]=[];let row="";for(const word of words){let pieces=[word];if(font.widthOfTextAtSize(word,size)>max){pieces=[];let part="";for(const char of word){if(font.widthOfTextAtSize(part+char,size)>max){pieces.push(part);part="";}part+=char;}if(part)pieces.push(part);}for(const part of pieces){const next=row?row+" "+part:part;if(font.widthOfTextAtSize(next,size)>max&&row){lines.push(row);row=part;}else row=next;}}if(row)lines.push(row);return lines;}
  let page!:PDFPage;let y=0;
  function newPage(){page=doc.addPage([width,height]);page.drawRectangle({x:0,y:height-13,width,height:13,color:green});page.drawText("SENTINELA TAPAJÓS",{x:left,y:height-44,size:10,font:bold,color:green});page.drawText("BOLETIM AMBIENTAL",{x:385,y:height-44,size:9,font:regular,color:muted});page.drawLine({start:{x:left,y:height-57},end:{x:right,y:height-57},thickness:.6,color:line});y=height-86;}
  function room(needed:number){if(y-needed<57)newPage();}
  function text(value:unknown,size=10.2,strong=false,color=ink,max=body,x=left){const lines=wrap(value,max,size,strong);for(const row of lines){room(size*1.45);page.drawText(row,{x,y,size,font:strong?bold:regular,color});y-=size*1.45;}return lines.length;}
  function gap(n=10){y-=n;}
  function heading(value:string){room(48);gap(8);text(value,15,true,green);gap(6);}
  function note(value:string){text(value,9,false,muted);gap(8);}
  function link(value:string,url:string){const target=safeUrl(url);if(!target)return;text(value,10,true,green);const count=wrap(value,body,10,true).length;const annotation=doc.context.obj({Type:PDFName.of("Annot"),Subtype:PDFName.of("Link"),Rect:[left,y+2,right,y+count*14.5+2],Border:[0,0,0],A:{Type:PDFName.of("Action"),S:PDFName.of("URI"),URI:PDFString.of(target)}});page.node.addAnnot(doc.context.register(annotation));}
  function row(cells:string[],sizes:number[],header=false){const lines=cells.map((c,i)=>wrap(c,sizes[i]-12,header?9:9.2,header)),h=Math.max(...lines.map(l=>l.length))*13.4+14;room(h);page.drawRectangle({x:left,y:y-h+8,width:body,height:h,color:header?soft:rgb(1,1,1)});let x=left;lines.forEach((ls,i)=>{ls.forEach((l,j)=>page.drawText(l,{x:x+6,y:y-5-j*13.4,size:header?9:9.2,font:header?bold:regular,color:header?green:ink}));x+=sizes[i];});page.drawLine({start:{x:left,y:y-h+8},end:{x:right,y:y-h+8},thickness:.5,color:line});y-=h;}
  const v=bulletinView(b),g=bulletinGeometry(b);
  doc.setTitle(`Sentinela Tapajós - ${b.scope==="regional"?"Região":v.place.name} - ${stamp(b.capturedAt,true)}`);doc.setAuthor("Sentinela Tapajós");doc.setSubject("Detecções INPE, modelo de partículas e vento, notícias e cobertura das fontes");doc.setCreationDate(new Date(b.capturedAt*1000));
  newPage();text(b.area?b.area.name:b.scope==="regional"?"Boletim regional do Tapajós":`Boletim de ${v.place.name}`,23,true,green);gap();
  text(`${v.place.name} como referência ambiental | ${b.area?areaDescription(b.area):"raio "+b.radius+" km"} | últimas ${b.hours} h`,11);text(`Satélite: ${b.satellite==="all"?"todos":b.satellite}`,10);gap(6);
  note(`Recorte fixo salvo em ${stamp(b.capturedAt,true)} (UTC-3). Horários originais preservados. Este PDF não se atualiza.`);
  if(b.missing.length){text(`Indisponível na captura: ${b.missing.join("; ")}.`,10,true,orange);gap();}
  const cards=[{label:"DETECÇÕES INPE",value:v.fireAvailable?String(v.fires.length):"Sem dado",time:sourceLabel(v.inpe?.status??"unavailable")},{label:"PM2,5 / MODELO",value:`${display(v.air?.pm25)} µg/m³`,time:stamp(v.air?.time)},{label:"VENTO / MODELO",value:`${display(v.weather?.speed)} km/h`,time:v.weather?.direction!=null?`De ${compass(v.weather.direction)} | ${stamp(v.weather.time)}`:"Direção indisponível"}];
  room(89);cards.forEach((c,i)=>{const x=left+i*173;page.drawRectangle({x,y:y-72,width:165,height:77,color:soft});page.drawText(clean(c.label),{x:x+10,y:y-10,size:8,font:bold,color:muted});page.drawText(clean(c.value),{x:x+10,y:y-36,size:18,font:bold,color:green});page.drawText(clean(c.time),{x:x+10,y:y-57,size:8,font:regular,color:muted});});y-=92;
  note(`Consulta ambiental ${stamp(b.dashboard?.fetchedAt,true)}; arquivo INPE ${stamp(v.inpe?.dataTime,true)}. AQI EUA: ${display(v.air?.aqi,0)}. PM2,5 e vento no centro de ${v.place.name}.`);
  heading("Detecções no território");
  const mapHeight=340;room(mapHeight+80);const bottom=y-mapHeight,mapX=left,mapY=bottom,centerX=left+body/2,centerY=bottom+mapHeight/2,scale=mapHeight*.43/g.span;
  const project=(x:number,z:number)=>({x:centerX+x*scale,y:centerY+z*scale});
  page.drawRectangle({x:mapX,y:mapY,width:body,height:mapHeight,color:soft});
  for(const n of [-1,-.5,0,.5,1]){page.drawLine({start:{x:centerX+n*g.span*scale,y:bottom+15},end:{x:centerX+n*g.span*scale,y:bottom+mapHeight-15},color:line,thickness:.5});page.drawLine({start:{x:left+15,y:centerY+n*g.span*scale},end:{x:right-15,y:centerY+n*g.span*scale},color:line,thickness:.5});}
  if(!g.area)for(const c of g.locations){const p=project(c.x,c.y);page.drawCircle({x:p.x,y:p.y,size:b.radius*scale,borderWidth:.6,borderColor:rgb(.57,.68,.58),opacity:.08,color:green});}
  if(g.area){const a=g.area,qs=a.projected.map(p=>project(p.x,p.y)),blue=rgb(.21,.48,.61);if(a.kind==="circle")page.drawCircle({x:qs[0].x,y:qs[0].y,size:a.radiusKm*scale,borderColor:blue,borderWidth:1});else{for(let i=1;i<qs.length;i++){if(a.kind==="corridor")page.drawLine({start:qs[i-1],end:qs[i],color:blue,thickness:a.radiusKm*2*scale,opacity:.12});page.drawLine({start:qs[i-1],end:qs[i],color:blue,thickness:1});}if(a.kind==="polygon")page.drawLine({start:qs.at(-1)!,end:qs[0],color:blue,thickness:1});else for(const q of qs)page.drawCircle({x:q.x,y:q.y,size:a.radiusKm*scale,color:blue,opacity:.12});}}
  for(const c of g.points){const p=project(c.x,c.y);page.drawCircle({x:p.x,y:p.y,size:1.5,color:orange,opacity:.65});}
  for(const c of g.locations){const p=project(c.x,c.y);page.drawCircle({x:p.x,y:p.y,size:3,color:green});page.drawText(clean(c.name),{x:p.x+5,y:p.y+6,size:7.8,font:bold,color:green});}
  page.drawText("N",{x:right-26,y:bottom+mapHeight-26,size:10,font:bold,color:green});page.drawLine({start:{x:right-22,y:bottom+mapHeight-49},end:{x:right-22,y:bottom+mapHeight-31},color:green,thickness:1});
  page.drawLine({start:{x:left+16,y:bottom+18},end:{x:left+96,y:bottom+18},color:green,thickness:1.5});page.drawText(`${display(80/scale,0)} km`,{x:left+16,y:bottom+26,size:8,font:regular,color:muted});
  y=bottom-16;note("Laranja: detecções INPE. Azul: área personalizada, quando selecionada. Verde: sedes e raios municipais. Projeção local aproximada, norte no topo, sem mapa de fundo. Ausência de pontos não prova ausência de fogo.");
  newPage();heading(`Vento na sede de ${v.place.name}`);
  if(v.weather?.direction!=null&&v.weather.speed!=null){const cx=left+63,cy=y-53;page.drawCircle({x:cx,y:cy,size:45,borderColor:line,borderWidth:1});for(const [label,dx,dy] of [["N",0,51],["L",53,0],["S",0,-58],["O",-58,0]] as const)page.drawText(label,{x:cx+dx-3,y:cy+dy,size:9,font:bold,color:muted});if(v.weather.speed>=2){const angle=(90-v.weather.direction-180)*Math.PI/180,dx=Math.cos(angle),dy=Math.sin(angle);page.drawLine({start:{x:cx-dx*30,y:cy-dy*30},end:{x:cx+dx*30,y:cy+dy*30},color:green,thickness:2});page.drawLine({start:{x:cx+dx*30,y:cy+dy*30},end:{x:cx+dx*20-dy*7,y:cy+dy*20+dx*7},color:green,thickness:2});page.drawLine({start:{x:cx+dx*30,y:cy+dy*30},end:{x:cx+dx*20+dy*7,y:cy+dy*20-dx*7},color:green,thickness:2});}const top=y;y-=12;text(`De ${compass(v.weather.direction)} (${display(v.weather.direction,0)}°), ${display(v.weather.speed)} km/h`,11,true,green,330,left+150);text(`Referência: ${stamp(v.weather.time,true)} (UTC-3)`,9,false,muted,330,left+150);text(v.weather.speed>=2?"Seta indica para onde o vento sopra. Uma referência na superfície; não calcula transporte, dispersão ou chegada da fumaça.":"Vento abaixo de 2 km/h. Cruzamento direcional suspenso.",10,false,ink,330,left+150);y=Math.min(y,top-126);}else note("Vento recente indisponível no recorte. Não foi desenhada direção estimada.");
  if(b.scope==="regional"){
    heading("Modelos nas oito sedes");row(["Município","PM2,5 / µg/m³","Vento / km/h"],[161,175,175],true);
    for(const p of PLACES){const c=b.regional?.places.find(l=>l.id===p.id);row([p.name,`${display(c?.air?.pm25)} | ${stamp(c?.air?.time)}`,`${display(c?.weather?.speed)} | ${stamp(c?.weather?.time)}`],[161,175,175]);}
    gap();note(`Horários UTC-3. Coleta CAMS: ${stamp(b.regional?.airCollectedAt,true)}; meteorologia: ${stamp(b.regional?.weatherCollectedAt,true)}. Modelos não são medições físicas.`);
  }
  room(360);heading(`Histórico de 7 dias - ${v.place.name}`);note(`Raio municipal de ${b.radius} km e mesmo satélite; dias locais UTC-3. A área personalizada não filtra este histórico. Diferente da janela móvel de ${b.hours} h. PM2,5 médio somente das horas disponíveis.`);
  row(["Dia","Detecções / cobertura","PM2,5 / horas","Notícias / grupos"],[78,170,136,127],true);
  if(!b.history)note("Histórico indisponível na captura.");
  for(const d of b.history?.daily??[])row([d.day,`${d.fireCount??"Sem arquivo"} / ${d.fireCoverage==="full"?"arquivos recebidos":d.fireCoverage==="partial"?"parcial":"sem arquivo"}`,`${display(d.pm25)} / ${d.pmSamples} de ${d.expectedHours} h`,`${d.newsPublications} / ${d.newsGroups}`],[78,170,136,127]);
  room(250);heading("Notícias por relevância");note(`Publicadas nas últimas 72 h; até seis grupos. Coleta ${stamp(b.radar?.run?.completedAt,true)} (UTC-3). Raio e satélite não filtram notícias.`);
  if(!v.news.length)text("Nenhuma publicação disponível neste recorte. A ausência de notícias não indica ausência de fogo.");
  for(const group of v.news){const item=group.lead;room(145);text(`${group.label.toUpperCase()} | ${group.score}/100 | ${item.topic}`,9,true,green);gap(4);link(item.title,item.url);text(`${v.sourceName(item.sourceId)} | ${stamp(item.publishedAt,true)} (UTC-3)`,9,false,muted);text(item.places.map(id=>localityName(id)).join("; ")||item.regions.join("; ")+" - sem local exato",9);text(`${item.mode==="rss"?"RSS direto":"Google Notícias - índice parcial"}${group.members.length>1?` | ${group.members.length} publicações agrupadas como possíveis republicações`:""}`,9,false,muted);gap(14);}
  newPage();heading("Cobertura real das fontes");note("Última consulta conhecida na captura. Índice parcial, resposta vazia e falha são situações diferentes. Os canais externos não têm coleta automática de conteúdo.");
  const sources=b.health?.sources??[];
  if(!sources.length)text("Diagnóstico das fontes indisponível na captura.");
  for(const s of sources){const detail=s.latest?.detail??(s.automatic?"Sem registro de consulta.":"Acesso externo, sem leitura automática do conteúdo.");const lines=wrap(detail,body,9);room(58+lines.length*13.1);link(s.name,s.url);text(`${s.automatic?s.latest?sourceLabel(s.latest.status):"Sem coleta":"Consulta externa"} | ${stamp(s.latest?.checkedAt,true)} (UTC-3)${s.stale?" | coleta atrasada":""}`,9,true,s.stale?orange:muted);text(detail,9);gap(11);}
  heading("Método e limitações");for(const [i,t]of bulletinLimits.entries()){text(`${i+1}. ${t}`,9.5);gap(7);}
  gap();link("Programa Queimadas / INPE","https://data.inpe.br/queimadas/portal/");link("CAMS / Open-Meteo - dados e atribuição","https://open-meteo.com/en/docs/air-quality-api");link("Open-Meteo - meteorologia e atribuição","https://open-meteo.com/en/docs");
  const pages=doc.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:left,y:41},end:{x:right,y:41},color:line,thickness:.5});p.drawText(clean(`Cópia fixa: ${stamp(b.capturedAt,true)} (UTC-3)`),{x:left,y:27,size:8,font:regular,color:muted});p.drawText(`${i+1} / ${pages.length}`,{x:right-30,y:27,size:8,font:regular,color:muted});});
  return doc.save();
}
