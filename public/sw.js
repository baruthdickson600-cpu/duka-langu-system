// SELF-DESTRUCT SW — inajifuta yenyewe na cache zote
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // Futa cache zote
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      // Jiondoe mwenyewe
      await self.registration.unregister();
      // Reload tabs zote
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.navigate(c.url));
    })()
  );
});
// Network only — kamwe usicache chochote
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
});
