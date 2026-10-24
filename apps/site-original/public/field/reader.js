(function () {
  "use strict";
  let packet = null, page = 0, scale = 1, center = null;
  const $ = id => document.getElementById(id);
  const text = (id, value) => { $(id).textContent = value; };
  const stamp = t => t ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Santarem", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(t * 1000) : "Sem horário";
  const number = v => v == null || !Number.isFinite(v) ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  function element(tag, value, parent) { const node = document.createElement(tag); if (value != null) node.textContent = value; if (parent) parent.append(node); return node; }
  function svg(tag, attrs, parent) { const node = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value)); parent.append(node); return node; }
  function coordinates(p) { return p.lat.toFixed(5) + ", " + p.lon.toFixed(5); }
  function selected(f) { text("selected", `${f.satellite} · ${stamp(f.time)} · UTC−3 · ${coordinates(f)} · FRP ${f.frp == null ? "não informada" : number(f.frp) + " MW"} · ${f.municipality || "Município não informado"}`); }
  function filtered() { return packet.fires.filter(f => ($("satellite").value === "all" || f.satellite === $("satellite").value) && f.time >= packet.capturedAt - Number($("hours").value) * 3600); }
  function map(fires) {
    const root = $("map"); root.replaceChildren();
    let extent=packet.area?Math.max(1,packet.area.radiusKm||0):packet.radius;
    if(packet.area){for(const p of [...(packet.area.points||[]),...packet.fires])extent=Math.max(extent,Math.abs(p.lat-center.lat)*111.32,Math.abs(p.lon-center.lon)*111.32*Math.cos(center.lat*Math.PI/180));}
    const span=Math.max(1,extent)*1.2/scale;
    const cos = Math.cos(center.lat * Math.PI / 180);
    const point = p => ({ x: 320 + (p.lon - center.lon) * 111.32 * cos / span * 230, y: 270 - (p.lat - center.lat) * 111.32 / span * 230 });
    svg("rect", { width: 640, height: 540, fill: "#edf3e9" }, root);
    [-1, -.5, 0, .5, 1].forEach(n => svg("path", { d: `M${320+n*230} 30V510M60 ${270+n*230}H580`, stroke: "#ccdbca" }, root));
    const c = point(packet.place);
    svg("circle", { cx:c.x, cy:c.y, r:packet.radius / span * 230, fill:"none", stroke:"#5a8264", "stroke-dasharray":"6 5" },root);
    const a = packet.area;
    if (a && Array.isArray(a.points) && a.points.length) {
      const points = a.points.map(point), path = points.map((p,i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
      if (a.kind === "circle") svg("circle", {cx:points[0].x,cy:points[0].y,r:a.radiusKm/span*230,fill:"#377c9b", "fill-opacity":.08,stroke:"#377c9b"},root);
      else { if(a.kind === "corridor")svg("path",{d:path,fill:"none",stroke:"#377c9b","stroke-opacity":.12,"stroke-width":a.radiusKm*2/span*230,"stroke-linecap":"round"},root); svg("path",{d:path+(a.kind === "polygon" ? " Z" : ""),fill:a.kind === "polygon" ? "#377c9b" : "none","fill-opacity":.08,stroke:"#377c9b","stroke-width":2},root); }
    }
    fires.forEach(f => {
      const p = point(f); if(p.x < 0 || p.x > 640 || p.y < 0 || p.y > 540)return;
      const dot = svg("circle",{cx:p.x,cy:p.y,r:4,fill:packet.capturedAt-f.time<21600?"#d4542e":"#b27a23",stroke:"#fff","stroke-width":1,tabindex:0,role:"button","aria-label":`${f.satellite}, ${stamp(f.time)}`,class:"fire-dot"},root);
      svg("title",{},dot).textContent = `${f.satellite} · ${stamp(f.time)} · ${coordinates(f)}`;
      dot.addEventListener("click",()=>selected(f));dot.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selected(f);}});
    });
    svg("circle",{cx:c.x,cy:c.y,r:6,fill:"#174f32",stroke:"white","stroke-width":2},root);
    svg("text",{x:c.x+12,y:c.y-10,fill:"#173d2a","font-size":13},root).textContent=packet.place.name;
    svg("text",{x:570,y:28,"font-size":15},root).textContent="N ↑";
    svg("path",{d:"M35 490h100m-100-5v10m100-10v10",stroke:"#173d2a"},root);
    svg("text",{x:35,y:480,"font-size":12},root).textContent=number(span*100/230)+" km";
  }
  function render() {
    if(!packet)return;
    const fires=filtered(), q=$("search").value.trim().toLowerCase();
    const matches=fires.filter(f=>!q||`${f.satellite} ${f.municipality||""} ${coordinates(f)}`.toLowerCase().includes(q)).sort((a,b)=>b.time-a.time);
    page=Math.min(page,Math.max(0,Math.ceil(matches.length/30)-1));
    map(fires);text("map-count",`${fires.length} detecções nos filtros · ${packet.fires.length} no pacote. Busca textual afeta somente a lista.`);
    const body=$("fires");body.replaceChildren();
    matches.slice(page*30,(page+1)*30).forEach(f=>{const row=element("tr",null,body);element("td",stamp(f.time),row);const sat=element("td",f.satellite,row);element("small",f.frp==null?"FRP não informada":number(f.frp)+" MW",sat);element("td",coordinates(f),row);const button=element("button","Ver",element("td",null,row));button.addEventListener("click",()=>{center={lat:f.lat,lon:f.lon};scale=3;selected(f);map(fires);$("map").scrollIntoView({block:"center"});});});
    if(!matches.length)element("td","Nenhuma detecção nesses filtros. Confira a cobertura da fonte.",element("tr",null,body)).colSpan=4;
    text("page",`${page+1} / ${Math.max(1,Math.ceil(matches.length/30))}`);$("previous").disabled=page===0;$("next").disabled=(page+1)*30>=matches.length;
  }
  function connection() {
    const android=document.documentElement.dataset.platform==="android";
    text("connection",android?"Arquivo guardado neste aplicativo. Para dados novos, abra Atualizar pacote na tela inicial e importe a nova cópia.":navigator.onLine?"Conexão disponível no aparelho. Esta página continua exibindo a cópia salva até você atualizar.":"Sem conexão. Os focos, indicadores e manchetes deste pacote continuam disponíveis.");
    $("reconnect").hidden=android;
    if(packet){const age=Math.floor((Date.now()/1000-packet.capturedAt)/3600);text("freshness",age>=2?`Consulta com ${age} h de idade · cópia local`:"Cópia local · confira os horários das fontes");}
  }
  window.loadPacket=function(p){
    if(!p||p.schema!=="sentinela-field-v1"||!Array.isArray(p.fires)||!p.place)return;
    packet=p;center=p.area&&p.area.points&&p.area.points[0]?{...p.area.points[0]}:{...p.place};scale=1;page=0;
    text("scope",p.scopeLabel);text("cut",`${p.hours} h anteriores à consulta · ${p.satellite==="all"?"todos os satélites":p.satellite}`);text("captured",`Consulta ambiental: ${stamp(p.capturedAt)} · UTC−3`);text("saved",`Salvo em: ${stamp(p.savedAt)} · UTC−3`);
    const inpe=p.sources.find(s=>s.id==="inpe");text("total",inpe&&inpe.status!=="unavailable"?p.fires.length:"—");text("coverage",inpe?`${inpe.status==="partial"?"Cobertura parcial":inpe.status==="unavailable"?"Fonte indisponível":"Detecções disponíveis"} · ${stamp(inpe.dataTime)}`:"Fonte INPE indisponível");text("pm25",number(p.air&&p.air.pm25)+" µg/m³");text("air-time",`Modelo CAMS · ${stamp(p.air&&p.air.time)}`);text("wind",number(p.weather&&p.weather.speed)+" km/h");text("wind-time",`Modelo · ${stamp(p.weather&&p.weather.time)}`);
    $("satellite").replaceChildren();const all=element("option","Todos do pacote",$("satellite"));all.value="all";Array.from(new Set(p.fires.map(f=>f.satellite))).sort().forEach(s=>{element("option",s,$("satellite")).value=s;});
    for(const option of $("hours").options)option.disabled=Number(option.value)>p.hours;$("hours").value=String(p.hours);
    $("news").replaceChildren();text("news-time",`Coleta: ${stamp(p.newsCollectedAt)} · UTC−3`);
    p.news.forEach(n=>{const article=element("article",null,$("news"));article.className="news";element("h3",n.title,article);element("small",`${n.source} · ${stamp(n.publishedAt)} · ${n.copies} publicação(ões) agrupada(s)`,article);});if(!p.news.length)element("p","Nenhuma manchete salva. Isso não comprova ausência de ocorrências.",$("news"));
    const sources=$("sources");sources.replaceChildren();p.sources.forEach(s=>{const row=element("div",`${s.name} · ${{ok:"Disponível",partial:"Parcial",unavailable:"Indisponível",manual:"Manual",embedded:"Mapa externo",external:"Consulta externa",widget:"Widget externo"}[s.status]||s.status} · referência ${stamp(s.dataTime)}`,sources);row.className="source-line";});text("missing",p.missing.length?"Partes indisponíveis: "+p.missing.join(", "):"Horários originais preservados. Fotografias de satélite, relevo 3D e Windy exigem conexão.");connection();render();
  };
  document.addEventListener("DOMContentLoaded",()=>{
    $("satellite").addEventListener("change",()=>{page=0;render();});$("hours").addEventListener("change",()=>{page=0;render();});$("search").addEventListener("input",()=>{page=0;render();});$("previous").addEventListener("click",()=>{page--;render();});$("next").addEventListener("click",()=>{page++;render();});$("zoom-in").addEventListener("click",()=>{scale=Math.min(16,scale*1.5);render();});$("zoom-out").addEventListener("click",()=>{scale=Math.max(.5,scale/1.5);render();});$("reset").addEventListener("click",()=>{if(packet){center=packet.area&&packet.area.points&&packet.area.points[0]?{...packet.area.points[0]}:{...packet.place};scale=1;render();}});
    try{window.loadPacket(JSON.parse($("field-data").textContent));}catch{}connection();
  });
  window.addEventListener("online",()=>{connection();if(packet&&packet.autoSync&&window.location.protocol==="https:"&&window.location.hostname==="sentinela-tapajos-ar.gyantardeli.chatgpt.site"&&document.documentElement.dataset.platform!=="android"){try{if(localStorage.getItem("sentinela-field-autosync-v1")!=="false")window.location.replace("https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/?campo=1#campo");}catch{}}});window.addEventListener("offline",connection);
  setInterval(connection,60000);
})();
