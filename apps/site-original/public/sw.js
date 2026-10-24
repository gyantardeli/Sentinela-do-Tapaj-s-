/* Public offline shell + explicitly saved private bulletin. Never cache auth pages, APIs or third-party resources. */
const CACHE="sentinela-offline-v1",SHELL_CACHE="sentinela-shell-v1",REVISION="pwa-v2";
const FALLBACK='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#234f39"><title>Sentinela Tapajós - sem conexão</title><style>body{margin:0;background:#f3f6ee;color:#284e36;font:17px/1.7 system-ui,sans-serif}main{max-width:620px;margin:12vh auto;padding:28px}small{letter-spacing:2px}h1{font-size:34px;line-height:1.2}a{display:inline-block;padding:12px 18px;border-radius:10px;background:#234f39;color:white;text-decoration:none}p{color:#68765e}</style><main><small>SENTINELA TAPAJÓS</small><h1>Sem conexão neste momento.</h1><p>Nenhum boletim foi salvo neste navegador. Com internet, abra Boletim e modo offline e escolha Salvar para uso sem conexão.</p><p>Se você baixou uma cópia HTML ou PDF, abra o arquivo em Downloads. Os mapas externos e notícias completas precisam de internet.</p><a href="/">Tentar novamente</a></main></html>';
let writeQueue=Promise.resolve();
const FIELD_CACHE="sentinela-field-v1";
async function savedField(part="html") { const cache=await caches.open(FIELD_CACHE); const pointer=await cache.match(key("/offline/field/current")); if(!pointer)return null;try{const meta=await pointer.json();return await cache.match(key("/offline/field/"+meta.id+"/"+part));}catch{return null;} }
const key=path=>self.location.origin+path;
async function pointer(cache){const response=await cache.match(key("/offline/current"));if(!response)return null;try{return await response.json();}catch{return null;}}
async function savedPart(part){const cache=await caches.open(CACHE),current=await pointer(cache);return current?cache.match(key("/offline/entries/"+current.id+"/"+part)):cache.match(key(part==="html"?"/offline/boletim":"/offline/boletim.pdf"));}
async function status(){const cache=await caches.open(CACHE),current=await pointer(cache),html=await savedPart("html"),pdf=await savedPart("pdf");return {revision:REVISION,hasBulletin:!!html,hasPdf:!!pdf,capturedAt:current?.capturedAt??null,savedAt:current?.savedAt??null,shellReady:!!await caches.open(SHELL_CACHE).then(c=>c.match(key("/offline.html")))};}
self.addEventListener("install",event=>event.waitUntil((async()=>{const cache=await caches.open(SHELL_CACHE);await cache.put(key("/offline.html"),new Response(FALLBACK,{headers:{"Content-Type":"text/html; charset=utf-8"}}));await self.skipWaiting();})()));
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("message",event=>{
  if(!event.source?.url||new URL(event.source.url).origin!==self.location.origin)return;
  if(event.data?.type==="GET_STATUS"){event.waitUntil(status().then(value=>event.ports[0]?.postMessage(value)));return;}
  if(event.data?.type==="CLEAR_FIELD") { const job=writeQueue.then(async()=>{await caches.delete(FIELD_CACHE);event.ports[0]?.postMessage({saved:true});});writeQueue=job.catch(()=>{});event.waitUntil(job);return; }
  if(event.data?.type==="SAVE_FIELD") {
    const save=async()=>{
      const cache=await caches.open(FIELD_CACHE),id=Date.now().toString(36)+Math.random().toString(36).slice(2,9),prefix="/offline/field/"+id+"/";
      try {
        const {html,packet}=event.data;
        if(typeof html!=="string"||html.length>15000000||!html.startsWith("<!doctype html>")||packet?.schema!=="sentinela-field-v1"||!Number.isInteger(packet.capturedAt)||!Array.isArray(packet.fires)||JSON.stringify(packet).length>10000000)throw new Error("Invalid packet");
        const headers={"X-Sentinela-Copy":id,"X-Content-Type-Options":"nosniff"};
        await cache.put(key(prefix+"html"),new Response(html,{headers:{...headers,"Content-Type":"text/html; charset=utf-8"}}));
        await cache.put(key(prefix+"packet"),new Response(JSON.stringify(packet),{headers:{...headers,"Content-Type":"application/json"}}));
        const [h,p]=await Promise.all([cache.match(key(prefix+"html")),cache.match(key(prefix+"packet"))]);
        if(h?.headers.get("X-Sentinela-Copy")!==id||p?.headers.get("X-Sentinela-Copy")!==id)throw new Error("Readback failed");
        await cache.put(key("/offline/field/current"),new Response(JSON.stringify({id,capturedAt:packet.capturedAt}),{headers:{"Content-Type":"application/json"}}));
        try{for(const request of await cache.keys()){const path=new URL(request.url).pathname;if(path!=="/offline/field/current"&&!path.startsWith(prefix))await cache.delete(request);}}catch{}
        event.ports[0]?.postMessage({saved:true});
      }catch{await Promise.all([cache.delete(key(prefix+"html")),cache.delete(key(prefix+"packet"))]);event.ports[0]?.postMessage({saved:false});}
    };
    const job=writeQueue.then(save,save);writeQueue=job.catch(()=>{});event.waitUntil(job);return;
  }
  if(event.data?.type!=="SAVE_BULLETIN")return;
  const save=async()=>{
    const cache=await caches.open(CACHE),id=Date.now().toString(36)+Math.random().toString(36).slice(2,9),prefix="/offline/entries/"+id+"/";
    try{
      const {html,pdf,capturedAt}=event.data;
      if(typeof html!=="string"||!html.includes("<html")||html.length>15000000||!(pdf instanceof Uint8Array)||pdf.length>15000000||pdf.length<4||String.fromCharCode(...pdf.subarray(0,4))!=="%PDF")throw new Error("Invalid bulletin");
      const headers={"X-Sentinela-Copy":id,"X-Content-Type-Options":"nosniff"};
      await cache.put(key(prefix+"html"),new Response(html,{headers:{...headers,"Content-Type":"text/html; charset=utf-8"}}));
      await cache.put(key(prefix+"pdf"),new Response(pdf,{headers:{...headers,"Content-Type":"application/pdf","Content-Disposition":"attachment; filename=boletim-sentinela-salvo.pdf"}}));
      const [h,p]=await Promise.all([cache.match(key(prefix+"html")),cache.match(key(prefix+"pdf"))]);
      if(h?.headers.get("X-Sentinela-Copy")!==id||p?.headers.get("X-Sentinela-Copy")!==id)throw new Error("Readback failed");
      const meta={id,savedAt:Math.floor(Date.now()/1000),capturedAt:Number.isInteger(capturedAt)?capturedAt:null};
      await cache.put(key("/offline/current"),new Response(JSON.stringify(meta),{headers:{"Content-Type":"application/json"}}));
      // Commit the pointer only after both versions are stored. An interrupted save keeps the previous copy.
      try{for(const request of await cache.keys()){const path=new URL(request.url).pathname;if(path!=="/offline/current"&&!path.startsWith(prefix))await cache.delete(request);}}catch{}
      event.ports[0]?.postMessage({saved:true,revision:REVISION,hasBulletin:true,hasPdf:true,capturedAt:meta.capturedAt,savedAt:meta.savedAt});
    }catch{await Promise.all([cache.delete(key(prefix+"html")),cache.delete(key(prefix+"pdf"))]);event.ports[0]?.postMessage({saved:false});}
  };
  const job=writeQueue.then(save,save);writeQueue=job.catch(()=>{});event.waitUntil(job);
});
self.addEventListener("fetch",event=>{
  const request=event.request,url=new URL(request.url);
  if(url.origin!==self.location.origin||request.method!=="GET")return;
  if(url.pathname==="/offline/campo"){event.respondWith(savedField().then(saved=>saved||new Response(FALLBACK,{headers:{"Content-Type":"text/html; charset=utf-8"}})));return;}
  if(url.pathname==="/offline/boletim.pdf"){event.respondWith(savedPart("pdf").then(saved=>saved||new Response("Nenhum PDF salvo neste navegador.",{status:404})));return;}
  if(url.pathname==="/offline/boletim"){event.respondWith(savedPart("html").then(saved=>saved||new Response(FALLBACK,{headers:{"Content-Type":"text/html; charset=utf-8"}})));return;}
  if(request.mode!=="navigate"||/^\/(api|auth|login|logout|oauth|\.well-known)(\/|$)/.test(url.pathname))return;
  event.respondWith((async()=>{try{return await fetch(request);}catch{return await savedField()||await savedPart("html")||new Response(FALLBACK,{headers:{"Content-Type":"text/html; charset=utf-8","X-Sentinela-Offline":"true"}});}})());
});
