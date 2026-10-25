/* Sentinela Tapajós — quatro easter eggs demonstrativos, estritamente client-side.
   Não modifica dados operacionais, mapas, endpoints ou armazenamentos locais. */
(() => {
  "use strict";
  const VALID = new Set(["guardiao","floresta","diario","criador"]);
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
  const names={guardiao:"O Despertar do Sentinela",floresta:"A Floresta Fala",diario:"Diário do Explorador",criador:"Mensagem do Criador"};
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
    const p=shell("guardiao","O guardião da floresta desperta em uma sequência visual de seis segundos. Uma representação artística, sem relação com alertas reais.");
    const scene=el("div",{class:"st-egg-guardian st-egg-animate",role:"img","aria-label":"Animação: luz da lua ilumina a selva, o guardião abre os olhos e observa o rio."});
    add(scene,
      el("div",{class:"st-egg-stars"}),
      el("div",{class:"st-egg-moon"}),
      el("div",{class:"st-egg-tree-back"}),
      el("div",{class:"st-egg-guardian-face"}),
      el("div",{class:"st-egg-eyes"}),
      el("div",{class:"st-egg-tree-front"}),
      el("div",{class:"st-egg-river"}),
      el("div",{class:"st-egg-beam"}),
      el("div",{class:"st-egg-guardian-title"},"O SENTINELA DESPERTOU"));
    const replay=el("button",{class:"st-egg-action",type:"button"},"↻ Repetir animação");
    const status=el("p",{class:"st-egg-muted",role:"status"},"O guardião está despertando.");
    let sequence=0;
    const start=()=>{
      sequence++;
      scene.querySelectorAll(".st-egg-moon,.st-egg-eyes,.st-egg-river,.st-egg-beam,.st-egg-guardian-title")
        .forEach(node=>{
          node.getAnimations().forEach(animation=>animation.cancel());
          node.style.setProperty("animation","none","important");
        });
      const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const effects=[
        [".st-egg-moon",[{opacity:0.15,transform:"translateY(45px) scale(.65)"},{offset:.42,opacity:1,transform:"translateY(0) scale(1)"},{opacity:1,transform:"translateY(0) scale(1)"}]],
        [".st-egg-eyes",[
          {offset:0,opacity:0,transform:"translateX(-50%) scaleY(.04)"},
          {offset:.3,opacity:0,transform:"translateX(-50%) scaleY(.04)"},
          {offset:.42,opacity:1,transform:"translateX(-50%) scaleY(1)"},
          {offset:.55,opacity:1,transform:"translateX(-50%) scaleY(1)"},
          {offset:.57,opacity:1,transform:"translateX(-50%) scaleY(.08)"},
          {offset:.6,opacity:1,transform:"translateX(-50%) scaleY(1)"},
          {offset:1,opacity:1,transform:"translateX(-50%) scaleY(1)"}
        ]],
        [".st-egg-river",[{opacity:0,backgroundPosition:"0px 0px"},{offset:.4,opacity:.6,backgroundPosition:"50px 0px"},{opacity:.9,backgroundPosition:"120px 0px"}]],
        [".st-egg-beam",[{opacity:0,transform:"translateX(-50%) scaleX(.1)"},{offset:.28,opacity:0,transform:"translateX(-50%) scaleX(.1)"},{offset:.53,opacity:.9,transform:"translateX(-50%) scaleX(1.6)"},{opacity:.24,transform:"translateX(-50%) scaleX(1)"}]],
        [".st-egg-guardian-title",[{opacity:0,transform:"translateY(24px)"},{offset:.58,opacity:0,transform:"translateY(24px)"},{offset:.79,opacity:1,transform:"translateY(0)"},{opacity:1,transform:"translateY(0)"}]]
      ];
      for(const [selector,frames] of effects){
        const node=scene.querySelector(selector);
        if(!node)continue;
        if(reduced||typeof node.animate!=="function"){
          const last=frames[frames.length-1];
          for(const [name,value] of Object.entries(last)){
            if(name!=="offset")node.style[name]=value;
          }
        }else{
          node.animate(frames,{duration:6500,easing:"ease-in-out",fill:"forwards"});
        }
      }
      status.textContent=(sequence===1?"Animação iniciada.":"Animação reiniciada.")+" A lua se eleva, os olhos despertam e o título aparece.";
    };
    replay.addEventListener("click",start);
    add(p,scene,replay,status,
      el("p",{class:"st-egg-quote"},"“Observar para compreender. Compreender para proteger.”"),
      el("p",{class:"st-egg-muted"},"Cena ilustrativa, sem leitura de sensores e sem afetar o mapa ou os alertas."));
    start();
  }
    function forest(){
    const p=shell("floresta","Uma experiência sonora com duas opções: paisagem sintética local ou reprodução oficial de um vídeo do YouTube indicado para o projeto.");
    const art=el("div",{class:"st-egg-forest",role:"img","aria-label":"Ilustração de uma floresta sob chuva fina."});
    add(art,el("div",{class:"st-egg-forest-rain"}),el("div",{class:"st-egg-forest-trees"}));
    const buttons=el("div",{class:"st-egg-actions"});
    const btn=el("button",{class:"st-egg-action",type:"button"},"▶ Sons sintetizados");
    const youtube=el("button",{class:"st-egg-action st-egg-youtube",type:"button"},"▶ Ouvir vídeo do YouTube");
    add(buttons,btn,youtube);
    const playerHolder=el("div",{class:"st-egg-media-slot"});
    const status=el("p",{class:"st-egg-muted",role:"status"},"O áudio inicia somente após você escolher uma fonte.");
    const external=el("a",{href:"https://www.youtube.com/watch?v=DNwvIQEXHP4",target:"_blank",rel:"noopener noreferrer",class:"st-egg-source-link"},"Abrir o vídeo original no YouTube ↗");
    add(p,art,buttons,playerHolder,status,external,
      el("p",{class:"st-egg-muted"},"Reprodução por incorporação oficial do YouTube. Se o criador tiver desativado a incorporação ou seu navegador bloquear o player, utilize o link externo. Nenhum áudio do vídeo é copiado para o servidor. Ao ativar o vídeo, a plataforma poderá receber dados de acesso."));
    let playing=false;
    const stopSynth=()=>{
      if(stopSound){stopSound();stopSound=null;}
      playing=false;btn.textContent="▶ Sons sintetizados";
    };
    const stopYoutube=()=>{playerHolder.replaceChildren();youtube.textContent="▶ Ouvir vídeo do YouTube";};
    btn.addEventListener("click",()=>{
      if(playing){stopSynth();status.textContent="Sons sintetizados encerrados.";return;}
      stopYoutube();
      try{
        const AudioContextType=window.AudioContext||window.webkitAudioContext;
        if(!AudioContextType)throw Error("Áudio indisponível neste navegador.");
        const ctx=new AudioContextType();
        const len=Math.round(ctx.sampleRate*2);
        const buffer=ctx.createBuffer(1,len,ctx.sampleRate);
        const data=buffer.getChannelData(0);
        for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*.36;
        const rain=ctx.createBufferSource();rain.buffer=buffer;rain.loop=true;
        const filter=ctx.createBiquadFilter();filter.type="lowpass";filter.frequency.value=950;
        const gain=ctx.createGain();gain.gain.value=.055;
        rain.connect(filter);filter.connect(gain);gain.connect(ctx.destination);rain.start();
        let active=true;
        const interval=window.setInterval(()=>{
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
        playing=true;btn.textContent="■ Parar sons sintetizados";
        status.textContent="Chuva e aves sintetizadas em execução.";
      }catch(error){status.textContent="Falha ao ativar sons sintéticos: "+error.message;}
    });
    youtube.addEventListener("click",()=>{
      if(playerHolder.querySelector("iframe")){
        stopYoutube();status.textContent="Vídeo encerrado.";return;
      }
      stopSynth();
      const frame=el("iframe",{
        title:"A Floresta Fala — vídeo indicado no YouTube",
        src:"https://www.youtube-nocookie.com/embed/DNwvIQEXHP4?autoplay=1&rel=0",
        loading:"eager",
        allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        referrerpolicy:"strict-origin-when-cross-origin",
        allowfullscreen:""
      });
      playerHolder.append(frame);
      youtube.textContent="■ Fechar vídeo";
      status.textContent="O player oficial do YouTube foi solicitado. Pressione Play no vídeo se a reprodução automática for bloqueada.";
    });
  }
    function diary(){
    const p=shell("diario","Caderno de expedição interativo: oito capítulos, pesquisa e 24 referências bibliográficas, com mapas e bússolas no fundo.");
    p.classList.add("st-egg-diary-dialog");
    const frame=el("iframe",{
      class:"st-egg-diary-frame",
      title:"Diário do Explorador — oito páginas interativas do Tapajós",
      src:"/__egg/diario",
      loading:"eager",
      referrerpolicy:"no-referrer"
    });
    const footer=el("div",{class:"st-egg-diary-footer"});
    add(footer,
      el("span",{class:"st-egg-diary-hint"},"A navegação, a pesquisa e a bibliografia funcionam dentro do caderno."),
      el("a",{class:"st-egg-diary-external",href:"/__egg/diario",target:"_blank",rel:"noopener noreferrer"},"Abrir em tela inteira ↗"));
    add(p,frame,footer);
  }
  function creator(){
    const p=shell("criador","Registro reservado — Sentinela Tapajós");
    const art=el("div",{class:"st-egg-credits-art","aria-hidden":"true"},"SENTINELA\nTAPAJÓS");
    const letter=el("article",{class:"st-egg-creator-letter",lang:"pt-BR"});
    const paragraph=(text,props={})=>el("p",props,text);
    const intro=paragraph();
    add(intro,
      document.createTextNode("O Sentinela nasceu de uma ideia simples: "),
      el("strong",{},"não podemos proteger aquilo que não conhecemos, nem cuidar daquilo que escolhemos ignorar."));
    add(letter,
      el("h3",{},"UMA MENSAGEM DO CRIADOR"),
      paragraph("Registro reservado — Sentinela Tapajós",{class:"st-egg-creator-subtitle"}),
      paragraph("“Há lugares no mundo que não precisam de mais olhos. Precisam de pessoas que realmente enxerguem."),
      paragraph("A Amazônia respira, muda, sofre e resiste. Cada rio carrega uma história. Cada árvore sustenta uma vida. Cada sinal no horizonte pode revelar algo que merece nossa atenção."),
      intro,
      paragraph("Este projeto não foi criado apenas para reunir mapas, satélites e informações. Foi criado para transformar dados em consciência, conhecimento em responsabilidade e observação em atitudes que façam a diferença."),
      paragraph("A tecnologia pode ampliar nossa visão, revelar o que está distante e nos ajudar a compreender o que antes parecia invisível. Mas somente o ser humano pode decidir o que fazer com aquilo que vê."),
      paragraph("E, por trás de cada ideia, de cada desafio superado e de cada passo desta jornada, existe algo ainda maior."),
      el("strong",{class:"st-egg-creator-emphasis"},"Minha primeira e mais profunda gratidão é a Deus."),
      paragraph("A Ele, Criador dos céus, da terra, dos rios e das florestas, agradeço pela vida, pela sabedoria concedida, pela força nos momentos difíceis e pela oportunidade de transformar uma simples ideia em algo que possa contribuir para o bem."),
      paragraph("Ao contemplar a imensidão da Amazônia, é impossível não reconhecer a grandeza de Sua criação. Cada árvore, cada rio e cada forma de vida revelam uma beleza que nenhuma tecnologia será capaz de reproduzir plenamente."),
      paragraph("Que este projeto seja também uma expressão de gratidão a Deus e um lembrete de que recebemos não apenas a capacidade de conhecer o mundo, mas também a responsabilidade de cuidar dele."),
      paragraph("Agradeço igualmente a todos que, de alguma forma, contribuíram para que esta ideia ganhasse vida, aos que acreditam na importância da preservação e àqueles que dedicam seus esforços, muitas vezes silenciosamente, à proteção da nossa Amazônia."),
      el("strong",{class:"st-egg-creator-affirmation"},"Que todo conhecimento nos torne mais humildes, toda descoberta nos torne mais conscientes e toda capacidade recebida seja utilizada para fazer o bem."));
    const scripture=el("blockquote",{class:"st-egg-creator-scripture"});
    add(scripture,
      el("em",{},"“Do Senhor é a terra e tudo o que nela existe, o mundo e os que nele vivem.”"),
      el("cite",{},"— Salmos 24:1"));
    add(letter,
      scripture,
      paragraph("Se você encontrou esta mensagem, descobriu algo que não aparece nos mapas:"),
      el("strong",{class:"st-egg-creator-emphasis"},"O verdadeiro Sentinela não é o sistema. É quem está diante dele."),
      paragraph("Porque proteger não é apenas observar o que acontece. É reconhecer o valor daquilo que nos foi confiado."),
      paragraph("Continue observando."),
      paragraph("A floresta ainda tem muito a nos contar."),
      paragraph("E que, acima de tudo, Deus seja glorificado em cada boa obra realizada.”"),
      paragraph("— O Criador",{class:"st-egg-creator-signature"}),
      el("hr",{class:"st-egg-creator-divider"}),
      el("strong",{class:"st-egg-creator-brand"},"SENTINELA TAPAJÓS"),
      paragraph("Vigiar para conhecer. Conhecer para proteger.",{class:"st-egg-creator-motto"}));
    add(p,art,letter);
  }
  const actions={guardiao:guardian,floresta:forest,diario:diary,criador:creator};
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
    if(e.key==="Escape"&&overlay){dismiss();}
  });

  // A imagem da harpia no cabeçalho é /branding/mark.svg, dentro de .brand-mark.
  // O texto do cabeçalho é um alvo diferente para preservar o Guardião.
  function harpyTarget(target){
    const mark=target?.closest?.(".brand-mark");
    return Boolean(mark?.querySelector('img[src$="/branding/mark.svg"]'));
  }
  function guardianTitleTarget(target){
    const brand=target?.closest?.('a.brand[aria-label*="Sentinela Tapajós"]');
    if(!brand || harpyTarget(target))return false;
    const mark=brand.querySelector(".brand-mark");
    if(mark?.contains(target))return false;
    return /SENTINELA\s*TAPAJÓS/i.test((brand.textContent||"").replace(/\s+/g," "));
  }
  document.addEventListener("click",event=>{
    if(overlay||event.target.closest?.("#st-eggs-root"))return;
    if(event.target.closest?.("footer")&&(event.target.textContent||"").length<100){advance("criador",3);return;}
    if(harpyTarget(event.target)){advance("diario",7);return;}
    if(guardianTitleTarget(event.target)){advance("guardiao",7);}
  },true);
  document.addEventListener("pointerdown",event=>{
    if(overlay||!harpyTarget(event.target))return;
    const target=event.target;
    heldTimer=window.setTimeout(()=>{if(!overlay)open("floresta");heldTimer=null;},5000);
    const clear=()=>{if(heldTimer){clearTimeout(heldTimer);heldTimer=null;}};
    target.addEventListener("pointerup",clear,{once:true});
    target.addEventListener("pointercancel",clear,{once:true});
    target.addEventListener("pointerleave",clear,{once:true});
  },true);
  const requested=new URLSearchParams(location.search).get("egg");
  if(VALID.has(requested)) window.setTimeout(()=>open(requested),350);
})();