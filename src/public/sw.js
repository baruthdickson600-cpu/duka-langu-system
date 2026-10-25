// ============================================================
// DUKA LANGU — Service Worker v11 (MINIMAL — HTML NEVER CACHED)
// ============================================================
const VERSION = 'v11-fix-mime';
const CACHE_NAME = `duka-${VERSION}`;

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // Futa cache ZOTE za zamani
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // HTML na JS/CSS — DAIMA NETWORK ONLY (kamwe usicache — kuzuia stale code)
  if (request.mode === 'navigate' ||
      request.destination === 'document' ||
      request.destination === 'script' ||
      request.destination === 'style' ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.jsx') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Picha/fonts tu — cache first
  if (request.destination === 'image' || request.destination === 'font') {
    e.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone)).catch(()=>{});
          return res;
        }).catch(() => new Response('', { status: 404 }))
      )
    );
    return;
  }

  // Nyingine zote — network only
  e.respondWith(fetch(request).catch(() => caches.match(request)));
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});
