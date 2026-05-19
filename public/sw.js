// ============================================
// DUKA LANGU — Advanced Service Worker
// PWA Offline Support + Smart Caching
// ============================================

const VERSION = 'v6.0.0';
const STATIC_CACHE = `duka-static-${VERSION}`;
const DYNAMIC_CACHE = `duka-dynamic-${VERSION}`;
const API_CACHE = `duka-api-${VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/logo-white.png',
  '/icons/icon-72.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const MAX_DYNAMIC_ITEMS = 60;
const MAX_API_ITEMS = 50;

// INSTALL
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch(() => console.warn('[SW] Skip:', url))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ACTIVATE
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Trim cache size
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    return trimCache(cacheName, maxItems);
  }
}

// FETCH
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Supabase: Network first
  if (url.hostname.includes('supabase')) {
    e.respondWith(networkFirst(request, API_CACHE, MAX_API_ITEMS));
    return;
  }

  // API endpoints: Network only
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Images/fonts: Cache first
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|woff2?|ttf|otf|ico)$/)
  ) {
    e.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML/JS/CSS: Network first with offline fallback
  if (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    e.respondWith(networkFirstWithOffline(request));
    return;
  }

  // Everything else: Stale while revalidate
  e.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS));
});

// Network First strategy
async function networkFirst(request, cacheName, maxItems) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      trimCache(cacheName, maxItems);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Cache First strategy
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#F0FDF4" width="100" height="100"/><text x="50" y="55" text-anchor="middle" font-size="40">📦</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    throw new Error('Resource unavailable offline');
  }
}

// Network First with offline page
async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match('/index.html');
    if (fallback) return fallback;
    return new Response(getOfflinePage(), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// Stale While Revalidate
async function staleWhileRevalidate(request, cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
        trimCache(cacheName, maxItems);
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// Offline page
function getOfflinePage() {
  return `<!DOCTYPE html><html lang="sw"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Duka Langu - Offline</title><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#0B7A3B 0%,#065F2E 100%);color:white;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;text-align:center}.c{max-width:400px}.i{font-size:64px;margin-bottom:20px;animation:f 3s ease-in-out infinite}@keyframes f{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}h1{font-size:28px;margin:0 0 10px;font-weight:900}p{font-size:16px;opacity:.9;margin:8px 0;line-height:1.5}.r{margin-top:20px;padding:14px 32px;background:white;color:#0B7A3B;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer}.t{margin-top:24px;padding:16px;background:rgba(255,255,255,.1);border-radius:12px;font-size:13px;text-align:left}</style></head><body><div class="c"><div class="i">📡</div><h1>Hakuna Internet</h1><p>Mfumo unahitaji intaneti kuendelea kufanya kazi.</p><button class="r" onclick="location.reload()">🔄 Jaribu Tena</button><div class="t"><b>Vidokezo:</b><br>• Hakikisha WiFi/Data imewashwa<br>• Wasiliana nasi: +255 628 986 770</div></div></body></html>`;
}

// Background Sync
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-sales') {
    e.waitUntil(syncOfflineSales());
  }
});

async function syncOfflineSales() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach((c) => c.postMessage({ type: 'SYNC_START' }));
    clients.forEach((c) => c.postMessage({ type: 'SYNC_COMPLETE' }));
  } catch (err) {
    console.error('[SW] Sync failed:', err);
  }
}

// Push Notifications
self.addEventListener('push', (e) => {
  if (!e.data) return;
  let data;
  try { data = e.data.json(); } catch { data = { title: 'Duka Langu', body: e.data.text() }; }
  e.waitUntil(
    self.registration.showNotification(data.title || 'Duka Langu', {
      body: data.body || 'Una arifa mpya',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'duka-notification',
      data: data.url || '/',
      actions: [
        { action: 'open', title: 'Fungua' },
        { action: 'close', title: 'Funga' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'close') return;
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) return client.focus();
      }
      return self.clients.openWindow(e.notification.data || '/');
    })
  );
});

// Message handler
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});
