// ============================================================
// DUKA LANGU — Service Worker v7.0.0
// PWA Offline + Background Sync ya Mauzo
// ============================================================

const VERSION = 'v8.0.0';
const STATIC_CACHE = `duka-static-${VERSION}`;
const DYNAMIC_CACHE = `duka-dynamic-${VERSION}`;

const SUPA_URL = 'https://snosfxagzglswaotrgzv.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub3NmeGFnemdsc3dhb3RyZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDcwMDAsImV4cCI6MjA5MDY4MzAwMH0.qS6lEKGJ6IRganQTcpB1sFtw90XDyK0BMaQKSTVLXKE';

const STATIC_ASSETS = [
  '/', '/index.html', '/manifest.json', '/logo.png',
  '/logo-white.png', '/icons/icon-192.png', '/icons/icon-512.png',
];

// ===== INSTALL =====
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.all(STATIC_ASSETS.map((url) =>
        cache.add(url).catch(() => console.warn('[SW] Skip:', url))
      ))
    ).then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE =====
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => ![STATIC_CACHE, DYNAMIC_CACHE].includes(k))
            .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ===== FETCH =====
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Supabase: Network first (data inabadilika mara kwa mara)
  if (url.hostname.includes('supabase')) {
    e.respondWith(networkFirst(request));
    return;
  }

  // HTML/JS/CSS: Network first, fallback kache
  if (request.mode === 'navigate' || request.destination === 'document' ||
      request.destination === 'script' || request.destination === 'style') {
    e.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Picha/fonts: Cache first
  if (request.destination === 'image' || request.destination === 'font' ||
      url.pathname.match(/\.(png|jpg|jpeg|svg|woff2?|ico)$/)) {
    e.respondWith(cacheFirst(request));
    return;
  }

  // Nyingine: stale-while-revalidate
  e.respondWith(staleWhileRevalidate(request));
});

// ===== BACKGROUND SYNC — MAUZO =====
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-sales') {
    e.waitUntil(doSyncSales());
  }
});

async function doSyncSales() {
  try {
    const pending = await getOfflineSales();
    if (!pending.length) return;
    console.log(`[SW Sync] Kutuma mauzo ${pending.length} yanayosubiri...`);

    let synced = 0;
    for (const sale of pending) {
      try {
        const { offline_id, sync_status, sync_attempts, last_attempt, _offline, ...cleanSale } = sale;
        const res = await fetch(`${SUPA_URL}/rest/v1/sales`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPA_KEY,
            'Authorization': `Bearer ${SUPA_KEY}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({ ...cleanSale, is_synced: true }),
        });
        if (res.ok) {
          const [saved] = await res.json();
          await markSynced(offline_id, saved?.id);
          synced++;
          // Sync stock updates pia
          await syncStockUpdates(cleanSale.items || [], cleanSale.business_id);
        } else {
          await incrementAttempts(offline_id);
        }
      } catch (err) {
        await incrementAttempts(sale.offline_id);
      }
    }

    // Arifu tab zote zilizowazi
    const clients = await self.clients.matchAll();
    clients.forEach((c) => c.postMessage({
      type: 'SYNC_COMPLETE',
      synced,
      total: pending.length,
    }));
    console.log(`[SW Sync] Imekamilika: ${synced}/${pending.length}`);
  } catch (err) {
    console.error('[SW Sync] Imeshindwa:', err);
    throw err; // Requeue background sync
  }
}

// Sync stock deductions kwenye Supabase
async function syncStockUpdates(items, bizId) {
  for (const item of items) {
    try {
      // Get current product quantity
      const prodRes = await fetch(
        `${SUPA_URL}/rest/v1/products?id=eq.${item.productId}&select=id,quantity`,
        { headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` } }
      );
      if (!prodRes.ok) continue;
      const [prod] = await prodRes.json();
      if (!prod) continue;
      const stockOut = item.qty * (item.fraction || 1);
      const nq = Math.max(0, prod.quantity - stockOut);
      await fetch(`${SUPA_URL}/rest/v1/products?id=eq.${item.productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPA_KEY,
          'Authorization': `Bearer ${SUPA_KEY}`,
        },
        body: JSON.stringify({ quantity: nq }),
      });
    } catch (e) { /* Stock sync kushindwa si tatizo kubwa */ }
  }
}

// ===== IndexedDB kutoka SW (simplified) =====
const DB_NAME = 'dukalangu-offline';
const STORE_SALES = 'pending_sales';

function swOpenDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_SALES)) {
        const s = db.createObjectStore(STORE_SALES, { keyPath: 'offline_id' });
        s.createIndex('sync_status', 'sync_status', { unique: false });
      }
    };
  });
}

async function getOfflineSales() {
  const db = await swOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readonly');
    const idx = tx.objectStore(STORE_SALES).index('sync_status');
    const req = idx.getAll('pending');
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function markSynced(offlineId, supabaseId) {
  const db = await swOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readwrite');
    const store = tx.objectStore(STORE_SALES);
    const get = store.get(offlineId);
    get.onsuccess = () => {
      if (!get.result) { resolve(); return; }
      const put = store.put({ ...get.result, sync_status: 'synced', synced_id: supabaseId, synced_at: new Date().toISOString() });
      put.onsuccess = () => resolve();
      put.onerror = () => reject(put.error);
    };
    get.onerror = () => reject(get.error);
  });
}

async function incrementAttempts(offlineId) {
  const db = await swOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readwrite');
    const store = tx.objectStore(STORE_SALES);
    const get = store.get(offlineId);
    get.onsuccess = () => {
      if (!get.result) { resolve(); return; }
      const attempts = (get.result.sync_attempts || 0) + 1;
      const put = store.put({
        ...get.result,
        sync_status: attempts >= 5 ? 'failed' : 'pending',
        sync_attempts: attempts,
        last_attempt: new Date().toISOString(),
      });
      put.onsuccess = () => resolve();
      put.onerror = () => reject(put.error);
    };
    get.onerror = () => reject(get.error);
  });
}

// ===== CACHE STRATEGIES =====
async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return caches.match(request) ||
      new Response(JSON.stringify({ error: 'Offline' }), {
        status: 503, headers: { 'Content-Type': 'application/json' },
      });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match('/index.html');
    if (fallback) return fallback;
    return new Response(getOfflinePage(), {
      status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#F0FDF4" width="100" height="100"/><text x="50" y="55" text-anchor="middle" font-size="40">📦</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// ===== MESSAGE HANDLER =====
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'TRIGGER_SYNC') doSyncSales();
  if (e.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});

// ===== OFFLINE PAGE =====
function getOfflinePage() {
  return `<!DOCTYPE html><html lang="sw"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Duka Langu - Offline</title><style>*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:linear-gradient(135deg,#0B7A3B,#065F2E);color:white;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;text-align:center}.c{max-width:400px;width:100%}.i{font-size:72px;margin-bottom:16px;animation:b 2s ease-in-out infinite}@keyframes b{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}h1{font-size:26px;font-weight:900;margin:0 0 8px}p{font-size:15px;opacity:.9;margin:0 0 20px;line-height:1.6}.box{background:rgba(255,255,255,.12);border-radius:16px;padding:16px;margin-bottom:16px;font-size:13px;text-align:left;line-height:1.8}b{opacity:1}.btn{width:100%;padding:14px;background:white;color:#0B7A3B;border:none;border-radius:12px;font-weight:800;font-size:15px;cursor:pointer}</style></head><body><div class="c"><div class="i">📡</div><h1>Hakuna Mtandao</h1><p>Angalizo: Mauzo yaliyofanywa bila mtandao<br>yatajituma yenyewe mtandao ukirudi.</p><div class="box"><b>📋 Kumbuka:</b><br>✅ Mauzo yanayofanywa sasa hivi yanakaa kwenye simu<br>📤 Yatatumwa Supabase moja kwa moja mtandao ukipatikana<br>📦 Stock inapungua moja kwa moja bila kusubiri</div><button class="btn" onclick="location.reload()">🔄 Jaribu Tena</button></div></body></html>`;
}
