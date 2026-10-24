/* Desativação do service worker antigo: o Sentinela passa a operar somente conectado.
   O arquivo permanece acessível para permitir atualização e limpeza dos clientes antigos. */
self.addEventListener('install',()=>{self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('sentinela-shell-')).map(k=>caches.delete(k)));
    await self.registration.unregister();
  })());
});
