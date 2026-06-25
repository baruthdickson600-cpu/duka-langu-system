// ============================================================
// DUKA LANGU — Service Worker v9.0.0 (SELF-HEALING)
// Inafuta cache zote za zamani na kuhakikisha mfumo unafunguka
// ============================================================

const VERSION = 'v10-no-otp';
const CACHE_NAME = `duka-${VERSION}`;

// ===== INSTALL — ruka waiting moja kwa moja =====
self.addEventListener('install', (e) => {
  self.skipWaiting(); // Lazimisha SW mpya ichukue nafasi mara moja
});

// ===== ACTIVATE — FUTA CACHE ZOTE ZA ZAMANI =====
self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // Futa cache ZOTE za zamani bila ubaguzi
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      // Chukua udhibiti wa tabs zote mara moja
      await self.clients.claim();
      console.log('[SW v9] Cache zote za zamani zimefutwa');
    })()
  );
});

// ===== FETCH — NETWORK FIRST (daima pata toleo jipya) =====
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // HTML/JS/CSS — DAIMA network first (hakuna stale code)
  if (request.mode === 'navigate' ||
      request.destination === 'document' ||
      request.destination === 'script' ||
      request.destination === 'style') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          // Cache nakala mpya
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone)).catch(()=>{});
          return res;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // Picha/fonts — cache first (hazibadiliki)
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

  // Supabase na nyingine — network only
  e.respondWith(fetch(request).catch(() => caches.match(request)));
});

// ===== MESSAGE =====
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});
