/* Cache de interface somente. Dados de API nunca são gravados no service worker:
   o adaptador controla snapshots offline, identificados com data de salvamento. */
const CACHE='sentinela-shell-v22';
const SHELL=['/','/painel','/app.css','/app.js','/frontend-adapter.mjs','/manifest.webmanifest','/icon-192.png','/icon-512.png','/fontes'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  if(new URL(req.url).pathname.startsWith('/api/'))return;
  event.respondWith(fetch(req).then(resp=>{if(resp.ok){const clone=resp.clone();caches.open(CACHE).then(c=>c.put(req,clone));}return resp;}).catch(()=>caches.match(req).then(v=>v||caches.match('/'))));
});
