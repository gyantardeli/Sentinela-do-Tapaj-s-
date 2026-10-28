/* Diário do Explorador • pacote independente para integração posterior.
 * Sem cookies, localStorage, chamadas de API, analytics ou service worker. */
(function () {
  'use strict';
  const dataset = Array.isArray(window.DIARIO_TAPAJOS) ? window.DIARIO_TAPAJOS : [];
  if (!dataset.length) return;
  const $ = selector => document.querySelector(selector);
  const container = $('#page-tabs');
  const chapterEl = $('#chapter-panel');
  const sourceCards = $('#source-cards');
  const dialog = $('#bibliography-dialog');
  let current = 0;
  const getPage = () => dataset[current];
  const create = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const icon = name => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('ico');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#ico-' + name);
    svg.append(use);
    return svg;
  };
  const sourceLink = source => {
    const link = create('a', 'source-card');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `Abrir fonte externa: ${source.org} — ${source.titulo}`);
    const copy = create('span', 'source-copy');
    copy.append(create('strong', '', source.org + ' · ' + source.titulo), create('small', '', source.desc));
    const open = icon('external');
    open.classList.add('external-icon');
    link.append(icon('book'), copy, open);
    return link;
  };
  function renderTabs(filter='') {
    const normalized = filter.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    container.replaceChildren();
    let total = 0;
    dataset.forEach((entry,index) => {
      const haystack = [entry.titulo,entry.subtitulo,entry.tipo,entry.epoca,entry.resumo,...entry.paragrafos].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      if(normalized && !haystack.includes(normalized)) return;
      total++;
      const tab = create('button','tab-page');
      tab.type = 'button';
      tab.id = `diary-tab-${entry.id}`;
      tab.dataset.index = index;
      tab.setAttribute('role','tab');
      tab.setAttribute('aria-controls','chapter-panel');
      tab.setAttribute('aria-selected',String(index === current));
      tab.tabIndex = index===current?0:-1;
      const copy = create('span','tab-name');
      copy.append(create('b','',entry.titulo),create('small','',entry.tipo + ' · ' + entry.numero));
      const arrow = create('span','tab-chevron','›');
      arrow.setAttribute('aria-hidden','true');
      tab.append(icon(entry.icon),copy,arrow);
      tab.addEventListener('click',()=>render(index));
      container.append(tab);
    });
    if(!total) container.append(create('p','tab-empty','Nenhuma página encontrada. Tente outro termo.'));
  }
  function render(index,{focus=false}={}) {
    if (index<0 || index>=dataset.length) return;
    current=index;
    const page=getPage();
    $('#meta-numero').textContent=`PÁGINA ${current+1} DE ${dataset.length}`;
    $('#meta-epoca').textContent=page.epoca.toLocaleUpperCase('pt-BR');
    $('#chapter-title').textContent=page.titulo;
    $('#chapter-subtitle').textContent=page.subtitulo;
    $('#chapter-lead').textContent=page.resumo;
    $('#chapter-epoch-chip').textContent=page.tipo.toLocaleUpperCase('pt-BR');
    const iconUse=$('#current-page-icon use');
    iconUse.setAttribute('href','#ico-'+page.icon);
    const pEl=$('#chapter-paragraphs');
    pEl.replaceChildren(...page.paragrafos.map(p=>create('p','',p)));
    const noteEl=$('#chapter-observations');
    noteEl.replaceChildren(...page.observacoes.map(t=>create('li','',t)));
    sourceCards.replaceChildren(...page.fontes.map(sourceLink));
    $('#source-numeration').textContent=page.fontes.length+' registros';
    $('#page-progress').textContent=`${String(current+1).padStart(2,'0')} / ${String(dataset.length).padStart(2,'0')}`;
    $('#prev-page').disabled=current===0;
    $('#next-page').disabled=current===dataset.length-1;
    chapterEl.setAttribute('aria-labelledby','diary-tab-'+page.id);
    $('#journal').classList.remove('page-changing');
    // Restart a short transition without changing the actual content's accessibility.
    void $('#journal').offsetWidth;
    $('#journal').classList.add('page-changing');
    renderTabs($('#busca-paginas').value);
    if (focus) {
      const target=document.getElementById('diary-tab-'+page.id);
      if (target) target.focus({preventScroll:true});
      else $('#chapter-panel').focus({preventScroll:true});
    }
  }
  function addBibliography() {
    const content=$('#bibliography-content');
    const all=[];
    dataset.forEach(page=>{
      const group=create('section','bibliography-group');
      group.append(create('h3','',page.numero+' · '+page.titulo));
      page.fontes.forEach(source=>{
        const link=create('a','');
        link.textContent=source.org + ' — '+source.titulo;
        link.href=source.url;
        link.target='_blank';
        link.rel='noopener noreferrer';
        const detail=create('span','',' · '+source.desc);
        link.append(detail);group.append(link);
        all.push(source.url);
      });
      content.append(group);
    });
    $('#source-count').textContent=String(all.length);
  }
  $('#prev-page').addEventListener('click',()=>render(current-1));
  $('#next-page').addEventListener('click',()=>render(current+1));
  $('#busca-paginas').addEventListener('input',event=>renderTabs(event.target.value));
  $('#page-tabs').addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault();
    const tabs=[...container.querySelectorAll('[role="tab"]')];
    if(!tabs.length)return;
    const activeIndex=tabs.findIndex(t=>t.dataset.index===String(current));
    const i=event.key==='Home'?0:event.key==='End'?tabs.length-1:
      (Math.max(0,activeIndex)+(event.key==='ArrowUp'||event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length;
    render(Number(tabs[i].dataset.index),{focus:true});
  });
  document.addEventListener('keydown',event=>{
    if(event.altKey || event.metaKey || event.ctrlKey || dialog.open) return;
    if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    if(event.target.closest('[role="tablist"]'))return;
    if(event.key==='ArrowRight') render(current+1);
    if(event.key==='ArrowLeft') render(current-1);
  });
  $('#all-sources').addEventListener('click',()=>dialog.showModal());
  $('#close-bib').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  addBibliography();
  render(0);
})();
