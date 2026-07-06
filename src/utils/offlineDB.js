// ============================================================
// DUKA LANGU — Offline IndexedDB Manager
// Inahifadhi mauzo offline na kuqueue kwa ajili ya sync
// ============================================================

const DB_NAME = 'dukalangu-offline';
const DB_VERSION = 1;
const STORE_SALES = 'pending_sales';
const STORE_STOCK = 'offline_stock';
const STORE_META = 'sync_meta';

// ===== Fungua / Unda DB =====
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      // Mauzo yanayosubiri kutumwa
      if (!db.objectStoreNames.contains(STORE_SALES)) {
        const store = db.createObjectStore(STORE_SALES, { keyPath: 'offline_id' });
        store.createIndex('business_id', 'business_id', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
        store.createIndex('sync_status', 'sync_status', { unique: false });
      }
      // Stock ya bidhaa (snapshot) — kutumia wakati wa offline
      if (!db.objectStoreNames.contains(STORE_STOCK)) {
        db.createObjectStore(STORE_STOCK, { keyPath: 'id' });
      }
      // Metadata ya sync
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ===== MAUZO OFFLINE =====

// Hifadhi uuzaji kwenye IndexedDB (offline queue)
export async function saveSaleOffline(saleData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readwrite');
    const store = tx.objectStore(STORE_SALES);
    const record = {
      ...saleData,
      offline_id: saleData.offline_id || crypto.randomUUID(),
      sync_status: 'pending', // pending | synced | failed
      created_at: saleData.created_at || new Date().toISOString(),
      sync_attempts: 0,
    };
    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

// Pata mauzo YOTE yanayosubiri sync
export async function getPendingSales() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readonly');
    const store = tx.objectStore(STORE_SALES);
    const index = store.index('sync_status');
    const req = index.getAll('pending');
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// Pata mauzo YOTE (ikiwa ni pamoja na yaliyosync) — kwa kuonyesha kwenye history
export async function getAllOfflineSales(bizId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readonly');
    const store = tx.objectStore(STORE_SALES);
    const index = store.index('business_id');
    const req = index.getAll(bizId);
    req.onsuccess = () => resolve(
      (req.result || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    );
    req.onerror = () => reject(req.error);
  });
}

// Badilisha status ya uuzaji (baada ya sync kufanikwa)
export async function markSaleSynced(offlineId, supabaseId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readwrite');
    const store = tx.objectStore(STORE_SALES);
    const getReq = store.get(offlineId);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (!record) { resolve(null); return; }
      const updated = { ...record, sync_status: 'synced', synced_id: supabaseId, synced_at: new Date().toISOString() };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(updated);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// Weka alama ya kushindwa (failed) na ongeza attempt count
export async function markSaleFailed(offlineId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SALES, 'readwrite');
    const store = tx.objectStore(STORE_SALES);
    const getReq = store.get(offlineId);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (!record) { resolve(null); return; }
      const attempts = (record.sync_attempts || 0) + 1;
      // Baada ya majaribio 5, weka kama failed (itahitaji mkono wa binadamu)
      const status = attempts >= 5 ? 'failed' : 'pending';
      const updated = { ...record, sync_status: status, sync_attempts: attempts, last_attempt: new Date().toISOString() };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(updated);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// Hesabu mauzo yanayosubiri sync
export async function getPendingCount() {
  const pending = await getPendingSales();
  return pending.length;
}

// ===== STOCK SNAPSHOT =====
// Hifadhi bidhaa zote kwenye IndexedDB (kwa kutumia offline)
export async function saveStockSnapshot(products) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STOCK, 'readwrite');
    const store = tx.objectStore(STORE_STOCK);
    // Futa zote za zamani kwanza
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      let done = 0;
      if (!products.length) { resolve(); return; }
      for (const p of products) {
        const req = store.put({ ...p });
        req.onsuccess = () => { done++; if (done === products.length) resolve(); };
        req.onerror = () => reject(req.error);
      }
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
}

// Pata bidhaa kutoka IndexedDB (kwa kutumia offline)
export async function getStockSnapshot() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STOCK, 'readonly');
    const store = tx.objectStore(STORE_STOCK);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// Punguza stock ndani ya IndexedDB (wakati wa kuuza offline)
export async function deductStockOffline(productId, qty) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STOCK, 'readwrite');
    const store = tx.objectStore(STORE_STOCK);
    const getReq = store.get(productId);
    getReq.onsuccess = () => {
      const prod = getReq.result;
      if (!prod) { resolve(null); return; }
      const newQty = Math.max(0, (prod.quantity || 0) - qty);
      const updated = { ...prod, quantity: newQty };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(updated);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// ===== SYNC ENGINE =====
// Fanya sync ya mauzo yote yanayosubiri → Supabase
export async function syncPendingSales(supabaseUrl, supabaseKey, onProgress) {
  const pending = await getPendingSales();
  if (!pending.length) return { synced: 0, failed: 0, total: 0 };

  let synced = 0;
  let failed = 0;

  for (const sale of pending) {
    try {
      // Andaa data safi (ondoa fields za offline tu)
      const { offline_id, sync_status, sync_attempts, last_attempt, ...cleanSale } = sale;

      // Tuma kwenye Supabase moja kwa moja kwa fetch (sw.js haitumii supabase-js)
      const res = await fetch(`${supabaseUrl}/rest/v1/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(cleanSale),
      });

      if (res.ok) {
        const [saved] = await res.json();
        await markSaleSynced(offline_id, saved?.id);
        synced++;
        onProgress?.({ synced, failed, total: pending.length, current: sale });
      } else {
        const err = await res.text();
        console.warn('[Sync] Sale failed:', err);
        await markSaleFailed(offline_id);
        failed++;
      }
    } catch (e) {
      console.warn('[Sync] Network error:', e);
      await markSaleFailed(sale.offline_id);
      failed++;
    }
  }

  return { synced, failed, total: pending.length };
}

// ===== META / TIMESTAMPS =====
export async function setMeta(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readwrite');
    const store = tx.objectStore(STORE_META);
    const req = store.put({ key, value, updated_at: new Date().toISOString() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getMeta(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readonly');
    const store = tx.objectStore(STORE_META);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}
