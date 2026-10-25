/* Sentinela Tapajós — cinco easter eggs demonstrativos, estritamente client-side.
   Não modifica dados operacionais, mapas, endpoints ou armazenamentos locais. */
(() => {
  "use strict";
  const VALID = new Set(["guardiao","floresta","terminal","tempo","criador"]);
  if (window.__sentinelaEggsMounted) return;
  window.__sentinelaEggsMounted = true;
  let overlay = null, stopSound = null, lastFocus = null, heldTimer = null;
  let keyBuffer = "", keyAt = 0;
  const counts = new Map();
  const el=(tag,props={},text="")=>{
    const n=document.createElement(tag);
    for(const [key,value] of Object.entries(props)){
      if(key==="class") n.className=value;
      else if(key==="htmlFor") n.htmlFor=value;
      else n.setAttribute(key,value);
    }
    if(text) n.textContent=text;
    return n;
  };
  const root=el("div",{id:"st-eggs-root","aria-live":"off"});
  document.body.append(root);
  const names={guardiao:"O Despertar do Sentinela",floresta:"A Floresta Fala",terminal:"Terminal Secreto",tempo:"Portal do Tempo",criador:"Mensagem do Criador"};
  const clearChildren=n=>n.replaceChildren();
  const add=(parent,...children)=>{parent.append(...children);return parent;};
  function dismiss(){
    if(stopSound){stopSound();stopSound=null;}
    if(overlay){overlay.remove();overlay=null;}
    document.body.classList.remove("st-eggs-open");
    if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
    lastFocus=null;
  }
  function shell(id, description){
    dismiss();
    lastFocus=document.activeElement;
    const outer=el("div",{class:"st-egg-backdrop"});
    const dialog=el("section",{class:"st-egg-dialog",role:"dialog","aria-modal":"true","aria-labelledby":"st-egg-heading","aria-describedby":"st-egg-desc",tabindex:"-1"});
    const head=el("header",{class:"st-egg-head"});
    add(head,el("span",{class:"st-egg-kicker"},"SENTINELA TAPAJÓS · EXPERIÊNCIA OCULTA"),
      el("button",{class:"st-egg-close",type:"button","aria-label":"Fechar experiência"},"×"));
    add(dialog,head,el("h2",{id:"st-egg-heading"},names[id]),el("p",{id:"st-egg-desc",class:"st-egg-summary"},description));
    outer.append(dialog);
    root.append(outer);
    document.body.classList.add("st-eggs-open");
    overlay=outer;
    head.querySelector("button").addEventListener("click",dismiss);
    outer.addEventListener("click",e=>{if(e.target===outer)dismiss();});
    dialog.addEventListener("keydown",e=>{
      if(e.key==="Escape"){e.preventDefault();dismiss();}
      if(e.key==="Tab"){
        const list=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]')];
        if(list.length){
          const idx=list.indexOf(document.activeElement);
          if(e.shiftKey&&idx<=0){e.preventDefault();list[list.length-1].focus();}
          else if(!e.shiftKey&&idx===list.length-1){e.preventDefault();list[0].focus();}
        }
      }
    });
    dialog.focus();
    return dialog;
  }
  function guardian(){
    const p=shell("guardiao","Uma homenagem simbólica à vigilância e à proteção da floresta. Apenas uma animação — não é um indicador ambiental.");
    const scene=el("div",{class:"st-egg-guardian",role:"img","aria-label":"Guardião estilizado entre árvores, olhos iluminados e rio Tapajós."});
    add(scene,el("div",{class:"st-egg-moon"}),el("div",{class:"st-egg-canopy"}),
      el("div",{class:"st-egg-eyes"}),el("div",{class:"st-egg-river"}));
    add(p,scene,el("p",{class:"st-egg-quote"},"“Observar para compreender. Compreender para proteger.”"),
      el("p",{class:"st-egg-muted"},"Experiência artística fictícia. Nenhuma leitura, alerta ou dado do monitoramento foi alterado."));
  }
  function forest(){
    const p=shell("floresta","Uma paisagem sonora sintetizada de chuva, brisa e canto de aves. Não se trata de gravação real da fauna amazônica.");
    const art=el("div",{class:"st-egg-forest",role:"img","aria-label":"Ilustração abstrata de copa de árvores e chuva."});
    add(art,el("div",{class:"st-egg-forest-rain"}),el("div",{class:"st-egg-forest-trees"}));
    const btn=el("button",{class:"st-egg-action",type:"button"},"▶ Ouvir a floresta");
    const status=el("p",{class:"st-egg-muted",role:"status"},"Áudio desligado por padrão.");
    add(p,art,btn,status);
    let playing=false;
    btn.addEventListener("click",()=>{
      if(playing){
        if(stopSound) stopSound();
        stopSound=null;playing=false;btn.textContent="▶ Ouvir a floresta";status.textContent="Áudio encerrado.";return;
      }
      try{
        const AudioContextType=window.AudioContext||window.webkitAudioContext;
        if(!AudioContextType)throw Error("Áudio não suportado neste navegador.");
        const ctx=new AudioContextType();
        const len=Math.round(ctx.sampleRate*2);
        const buffer=ctx.createBuffer(1,len,ctx.sampleRate);
        const data=buffer.getChannelData(0);
        for(let i=0;i<len;i++) data[i]=(Math.random()*2-1)*.36;
        const rain=ctx.createBufferSource();rain.buffer=buffer;rain.loop=true;
        const filter=ctx.createBiquadFilter();filter.type="lowpass";filter.frequency.value=950;
        const gain=ctx.createGain();gain.gain.value=.055;
        rain.connect(filter);filter.connect(gain);gain.connect(ctx.destination);rain.start();
        let active=true;const interval=window.setInterval(()=>{
          if(!active)return;
          const osc=ctx.createOscillator(),g=ctx.createGain();
          osc.type="sine";osc.frequency.setValueAtTime(900+Math.random()*350,ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(500+Math.random()*150,ctx.currentTime+.16);
          g.gain.setValueAtTime(.0001,ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(.02,ctx.currentTime+.025);
          g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.19);
          osc.connect(g);g.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.2);
        },2400);
        stopSound=()=>{if(!active)return;active=false;clearInterval(interval);try{rain.stop();}catch{}void ctx.close();};
        void ctx.resume();
        playing=true;btn.textContent="■ Parar sons";status.textContent="Chuva e aves sintetizadas em execução. O volume é reduzido.";
      }catch(error){status.textContent="Não foi possível ativar o áudio: "+error.message;}
    });
  }
  function terminal(){
    const p=shell("terminal","Um terminal de exploração fictício e somente leitura. Seus comandos não executam ações reais no Sentinela.");
    const consoleBox=el("div",{class:"st-egg-console",role:"log","aria-label":"Saída do terminal"});
    const intro=el("pre",{},"SENTINELA / TAPAJÓS\nTerminal educacional · somente leitura\nDigite AJUDA para ver comandos.\n");
    consoleBox.append(intro);
    const form=el("form",{class:"st-egg-console-form"});
    const inp=el("input",{type:"text",placeholder:"Digite um comando...",autocomplete:"off",autocapitalize:"characters","aria-label":"Comando do terminal",maxlength:"32"});
    add(form,inp,el("button",{type:"submit"},"Enviar"));add(p,consoleBox,form);
    const responses={
      AJUDA:"AJUDA · FLORESTA · FONTES · TEMPO · DOOM · CREDITOS · LIMPAR · SAIR",
      FLORESTA:"A Amazônia abriga ecossistemas diversos. Consulte dados ambientais nas camadas oficiais do painel.",
      FONTES:"INPE, serviços meteorológicos e redes de qualidade do ar. Consulte sempre a origem, a data e a cobertura de cada leitura.",
      TEMPO:"Portal do Tempo disponível em /__egg/test. Mapas históricos verificáveis devem ser consultados no MapBiomas.",
      DOOM:"O DOOM está em uma experiência de teste separada. Este terminal não executa programas externos.",
      CREDITOS:"Sentinela Tapajós — monitoramento ambiental. Easter eggs experimentais e não operacionais.",
      SAIR:"Encerrando terminal."
    };
    form.addEventListener("submit",e=>{
      e.preventDefault();
      const raw=inp.value.trim().slice(0,32);
      const cmd=raw.toLocaleUpperCase("pt-BR");inp.value="";
      if(!cmd)return;
      if(cmd==="SAIR"){dismiss();return;}
      if(cmd==="LIMPAR"){clearChildren(consoleBox);return;}
      add(consoleBox,el("pre",{},"> "+raw+"\n"+(responses[cmd]||"Comando desconhecido. Digite AJUDA.")+"\n"));
      consoleBox.scrollTop=consoleBox.scrollHeight;
    });
    inp.focus();
  }
  function timePortal(){
    const p=shell("tempo","Compare períodos históricos usando as camadas anuais oficiais do MapBiomas. A prévia não inventa mapas nem valores de desmatamento.");
    const info=el("p",{class:"st-egg-muted"},"Série anual de cobertura e uso da terra do MapBiomas, 1985–2025. Os mapas são abertos no site da fonte e podem exigir a escolha da região.");
    const line=el("div",{class:"st-egg-time-grid"});
    const yearControl=(label,year)=>{
      const group=el("label",{class:"st-egg-year-control"});
      const title=el("strong",{},label);
      const value=el("output",{},String(year));
      const slider=el("input",{type:"range",min:"1985",max:"2025",step:"1",value:String(year),"aria-label":label});
      slider.addEventListener("input",()=>{value.textContent=slider.value;});
      add(group,title,value,slider);
      return {group,slider};
    };
    const old=yearControl("Período A",1985), current=yearControl("Período B",2025);
    add(line,old.group,current.group);
    const note=el("p",{class:"st-egg-muted"},"Clique nos links abaixo para ver cada período na plataforma oficial. Não são imagens locais armazenadas no aplicativo.");
    const actions=el("div",{class:"st-egg-actions"});
    const a=el("a",{href:"https://plataforma.mapbiomas.org/",target:"_blank",rel:"noopener noreferrer"},"Abrir mapa A ↗");
    const b=el("a",{href:"https://plataforma.mapbiomas.org/",target:"_blank",rel:"noopener noreferrer"},"Abrir mapa B ↗");
    const update=()=>{
      for(const [link,year] of [[a,old.slider.value],[b,current.slider.value]]){
        const u=new URL("https://plataforma.brasil.mapbiomas.org/cobertura");
        u.searchParams.set("activeModule","coverage");u.searchParams.set("activeYear",year);
        u.searchParams.set("mapPosition","-4.2637,-55.9916,9");
        link.href=u.toString();link.textContent="Abrir "+(link===a?"A":"B")+" ("+year+") ↗";
      }
    };
    old.slider.addEventListener("input",update);current.slider.addEventListener("input",update);update();
    add(actions,a,b);
    add(p,info,line,actions,note,el("p",{class:"st-egg-muted"},"Fonte: MapBiomas Brasil, coleção anual de cobertura e uso da terra. Não corresponde a detecções de incêndio em tempo real."));
  }
  function creator(){
    const p=shell("criador","Os bastidores e a razão de existir do projeto.");
    const art=el("div",{class:"st-egg-credits-art","aria-hidden":"true"},"SENTINELA\nTAPAJÓS");
    const text=el("blockquote",{class:"st-egg-quote"},"“A informação ambiental só protege quando pode ser compreendida, conferida e utilizada.”");
    add(p,art,text,el("p",{},"O Sentinela Tapajós reúne referências de monitoramento ambiental para facilitar a leitura de acontecimentos na Amazônia e, futuramente, em outras regiões do Brasil."),
      el("p",{class:"st-egg-muted"},"Uma iniciativa em desenvolvimento. Dados oficiais, estimativas e visualizações devem continuar identificados por origem, validade e limitações."),
      el("p",{class:"st-egg-muted"},"Agradecimento a quem estuda, protege e cuida das florestas e dos rios. Esta mensagem não integra boletins ou alertas operacionais."));
  }
  const actions={guardiao:guardian,floresta:forest,terminal:terminal,tempo:timePortal,criador:creator};
  function open(id){if(VALID.has(id))actions[id]();}
  // Atalhos são discretos; o endereço /__egg/test permite validar todos.
  function advance(id, threshold){
    const now=Date.now();
    const previous=counts.get(id)||{n:0,at:0};
    const n=now-previous.at>4600?1:previous.n+1;
    counts.set(id,{n:n,at:now});
    if(n>=threshold){counts.delete(id);open(id);}
  }
  const isEditable=t=>Boolean(t.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]'));
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&overlay){dismiss();return;}
    if(overlay||isEditable(e.target)||e.metaKey||e.ctrlKey||e.altKey||e.key.length!==1)return;
    const now=Date.now(); if(now-keyAt>2600) keyBuffer="";
    keyBuffer=(keyBuffer+e.key.toUpperCase()).slice(-16);keyAt=now;
    if(keyBuffer.endsWith("SENTINELA")){keyBuffer="";open("terminal");}
  });
  function logoTarget(t){
    const candidate=t.closest?.('button,a,strong,b,span,h1,h2,[aria-label],img');
    if(!candidate)return false;
    const text=(candidate.getAttribute("aria-label")||candidate.getAttribute("alt")||candidate.textContent||"").replace(/\s+/g," ").toUpperCase().trim();
    if(text.length>70)return false;
    return text==="ST"||text==="SENTINELA TAPAJÓS"||text==="SENTINELA"||text.includes("LOGO SENTINELA");
  }
  function dateTarget(t){
    const node=t.closest?.('time,[datetime],small,span');
    if(!node)return false;
    const s=(node.textContent||"").trim();
    return s.length<=45 && (/\b\d{1,2}\s+de\s+[a-zç]+\b/i.test(s)||/\b\d{2}\/\d{2}\/\d{4}\b/.test(s));
  }
  document.addEventListener("click",e=>{
    if(overlay||e.target.closest?.("#st-eggs-root"))return;
    if(dateTarget(e.target)){advance("tempo",5);return;}
    if(e.target.closest?.("footer")&&(e.target.textContent||"").length<100){advance("criador",3);return;}
    if(logoTarget(e.target)){advance("guardiao",7);}
  },true);
  document.addEventListener("pointerdown",e=>{
    if(overlay||!logoTarget(e.target))return;
    const target=e.target;
    heldTimer=window.setTimeout(()=>{if(!overlay)open("floresta");heldTimer=null;},5000);
    const clear=()=>{if(heldTimer){clearTimeout(heldTimer);heldTimer=null;}};
    target.addEventListener("pointerup",clear,{once:true});
    target.addEventListener("pointercancel",clear,{once:true});
    target.addEventListener("pointerleave",clear,{once:true});
  },true);
  const requested=new URLSearchParams(location.search).get("egg");
  if(VALID.has(requested)) window.setTimeout(()=>open(requested),350);
})();