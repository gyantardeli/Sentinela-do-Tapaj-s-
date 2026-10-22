// First-party public page metadata fallback; not a general-purpose scraper.
// No inferred timestamps, no external redirects, no article bodies.
const entities = s => s.replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
const plain = s => entities(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
export function parsePublisherIndex(html, homepage){
  if(html.length>2_000_000 || !/<(?:html|article|script|main|body)\b/i.test(html))return [];
  const base = new URL(homepage), root = base.hostname.replace(/^www\./,''), results=[], seen=new Set();
  const trusted = raw => { try { const u=new URL(entities(raw),base),h=u.hostname.replace(/^www\./,'');return (u.protocol==='https:'||u.protocol==='http:')&&(h===root||h.endsWith('.'+root))&&!u.username&&!u.password ? u.href : null; }catch{return null;} };
  const add=(title,link,date) => {
    if(typeof title!=='string'||typeof link!=='string'||typeof date!=='string')return;
    const url=trusted(link), text=plain(title).slice(0,240),t=Date.parse(date);
    if(!url||!Number.isFinite(t)||text.length<14||seen.has(url))return;
    seen.add(url);results.push({title:text,url,date:new Date(t).toISOString(),text:'',sourceUrl:url});
  };
  for(const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try { const root=JSON.parse(match[1]); const walk=(node,depth)=>{
      if(!node||depth>4||typeof node!=='object')return;
      if(Array.isArray(node)){node.slice(0,100).forEach(v=>walk(v,depth+1));return;}
      const kind=[].concat(node['@type']||[]).map(String);
      if(kind.some(x=>['NewsArticle','Article','BlogPosting'].includes(x))) add(node.headline||node.name,typeof node.url==='string'?node.url:node.mainEntityOfPage?.['@id'],node.datePublished);
      if(node['@graph'])walk(node['@graph'],depth+1);
      if(node.itemListElement)walk(node.itemListElement,depth+1);
      if(node.item)walk(node.item,depth+1);
    };walk(root,0); }catch{}
  }
  for(const match of html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)){
    const s=match[1];if(s.length>18000)continue;
    const date=s.match(/<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1]||s.match(/\b(?:datePublished|data-date|data-published)=["']([^"']+)["']/i)?.[1];
    const heading=s.match(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/i)?.[1];if(!date||!heading)continue;
    const link=heading.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)||s.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
    if(link)add(link[2],link[1],date);
  }
  return results.slice(0,100);
}
export function declaredPublisherFeeds(html,homepage){
  if(html.length>2_000_000)return [];
  const base=new URL(homepage),root=base.hostname.replace(/^www\./,''),out=[];
  for(const match of html.matchAll(/<link\b[^>]*>/gi)){
    const attrs=Object.fromEntries([...match[0].matchAll(/([-\w]+)\s*=\s*["']([^"']+)["']/g)].map(a=>[a[1].toLowerCase(),a[2]]));
    if(!/\balternate\b/i.test(attrs.rel||'')||!/application\/(?:rss\+xml|atom\+xml)/i.test(attrs.type||''))continue;
    try{const u=new URL(entities(attrs.href||''),base),h=u.hostname.replace(/^www\./,'');if((u.protocol==='https:'||u.protocol==='http:')&&(h===root||h.endsWith('.'+root))&&!u.username&&!u.password&&!out.includes(u.href))out.push(u.href);}catch{}
  }
  return out.slice(0,2);
}
