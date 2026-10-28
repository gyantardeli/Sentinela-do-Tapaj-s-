/* Desativa o service worker legado. Sem roteamento offline nem armazenamento de novas copias. */
self.addEventListener("install", event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    try { await caches.delete("sentinela-shell-v1"); }
    finally { await self.registration.unregister(); }
  })());
});
