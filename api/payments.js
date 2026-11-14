import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ============================================================
// DukaLangu — Mfumo wa Malipo (Auto-activation) — TeePay
// Endpoint moja, actions kadhaa (ili tusizidi kikomo cha Vercel):
//   POST /api/payments?action=initiate  -> anzisha malipo (USSD push kwa simu)
//   POST /api/payments?action=webhook   -> TeePay inathibitisha -> mfumo unajifungua
//   GET  /api/payments?action=status&ref=-> angalia hali (+ polling ya TeePay)
//
// ENV za Vercel zinazohitajika:
//   SUPABASE_SERVICE_ROLE_KEY   (au VITE_SUPABASE_KEY)
//   VITE_SUPABASE_URL
//   TEEPAY_API_KEY              (secret key ya TeePay — Bearer)
//   TEEPAY_WEBHOOK_SECRET       (inaanza na whsec_... — kwa uthibitisho wa webhook)
//   APP_URL                     (mf. https://dukalangu.com)
//
// Webhook URL ya kuweka kwenye dashboard ya TeePay:
//   https://dukalangu.com/api/payments?action=webhook
// ============================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;
const TEEPAY_KEY = process.env.TEEPAY_API_KEY || process.env.PAYMENT_API_KEY || '';
const WEBHOOK_SECRET = process.env.TEEPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || '';
const APP_URL = process.env.APP_URL || process.env.VITE_APP_URL || 'https://dukalangu.com';
const TEEPAY_BASE = 'https://api.teepay.me';

// Vercel: tunahitaji RAW body kwa uthibitisho wa saini ya webhook
export const config = { api: { bodyParser: false } };

function db() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Soma raw body (Vercel bodyParser imezimwa)
async function readRawBody(req) {
  return await new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
function parseJSON(raw) { try { return JSON.parse(raw || '{}'); } catch { return {}; } }

// Namba ya simu iwe +255XXXXXXXXX (TeePay inataka E.164)
function toE164(p) {
  let x = String(p || '').replace(/[^\d]/g, '');
  if (x.startsWith('0')) x = '255' + x.slice(1);
  if (x.startsWith('255')) return '+' + x;
  if (x.length === 9) return '+255' + x;
  return '+' + x;
}
// TZS -> minor units (TeePay: asset_scale=2, hivyo 15000 TZS = "1500000")
const toMinor = (amount) => String(Math.round((parseFloat(amount) || 0) * 100));

// ---- TeePay: anzisha collection (USSD push) ----
async function teepayInitiate({ amount, phone, reference, email, name, days, plan }) {
  const r = await fetch(`${TEEPAY_BASE}/v1/collections`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TEEPAY_KEY}`,
      'Idempotency-Key': reference,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      money: { amount_minor: toMinor(amount), currency: 'TZS' },
      customer: { country: 'TZ', phone: toE164(phone), name: name || 'DukaLangu Mteja', email: email || 'malipo@dukalangu.com' },
      description: `DukaLangu — ${plan || 'basic'} siku ${days || 30} (${reference})`,
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: d.message || d.error?.message || 'TeePay: imeshindwa kuanzisha malipo.' };
  // Response: { id, public_reference, status, ... }
  return { ok: true, publicRef: d.public_reference || d.id, teepayId: d.id, status: d.status };
}

// ---- TeePay: soma hali ya collection (polling) ----
async function teepayStatus(publicRef) {
  try {
    const r = await fetch(`${TEEPAY_BASE}/v1/collections/${encodeURIComponent(publicRef)}`, {
      headers: { 'Authorization': `Bearer ${TEEPAY_KEY}` },
    });
    const d = await r.json().catch(() => ({}));
    const st = (d.status || '').toLowerCase();
    return { paid: st === 'succeeded', failed: ['failed', 'reversed', 'refunded'].includes(st), status: st, raw: d };
  } catch { return null; }
}

// ---- Thibitisha saini ya webhook (HMAC-SHA256 ya "timestamp.rawBody") ----
function verifyWebhook(req, rawBody) {
  if (!WEBHOOK_SECRET) return true; // dev mode (hakuna secret)
  const ts = req.headers['x-teepay-timestamp'];
  const sig = req.headers['x-teepay-signature'];
  if (!ts || !sig) return false;
  // Kataa kama timestamp ina tofauti zaidi ya dakika 5
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(ts)) > 300) return false;
  const expected = 'v1=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${ts}.${rawBody}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch { return false; }
}

// ---- Tuma SMS kwa staff wa DukaLangu (admin, marketing, accountant) ----
async function notifyStaff(supabase, tx) {
  try {
    // Chukua staff wenye namba za simu
    const { data: staff } = await supabase.from('users')
      .select('name,phone,role')
      .in('role', ['admin', 'marketing', 'accountant']);
    if (!staff || !staff.length) return;
    const msg = `MALIPO MAPYA - DukaLangu\n\nMteja: ${tx.business_name || '—'}\nKiasi: TZS ${(tx.amount || 0).toLocaleString()}\nPlan: ${(tx.plan || 'basic')} siku ${tx.days || 30}\nSimu: ${tx.phone || '—'}\n\nMteja amelipa na mfumo umejifungua.`;
    // Tuma SMS kwa kila mmoja mwenye namba
    await Promise.all(staff.filter(s => s.phone).map(s =>
      fetch(`${APP_URL}/api/send-sms`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: s.phone, message: msg }),
      }).catch(() => {})
    ));
  } catch { /* usivunje activation kwa kosa la SMS */ }
}

// ---- Jifungue: washa biashara baada ya malipo kuthibitika ----
async function activateBusiness(supabase, tx) {
  const days = parseInt(tx.days) || 30;
  const exp = new Date(Date.now() + days * 86400000).toISOString();
  await supabase.from('businesses').update({
    token_active: true, token_expiry: exp, plan: tx.plan || 'basic', is_suspended: false,
  }).eq('id', tx.business_id);
  const code = 'TK-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  await supabase.from('tokens').insert({
    code, days, plan: tx.plan || 'basic', used: true,
    used_by: tx.business_id, used_by_name: tx.business_name, used_at: new Date().toISOString(),
  }).then(() => {}, () => {});
  await supabase.from('notifications').insert({
    target_type: 'business', target_id: tx.business_id, type: 'success',
    title: '🎉 Malipo Yamethibitishwa!',
    message: `Malipo yako ya TZS ${(tx.amount || 0).toLocaleString()} yamethibitishwa. Mfumo umefunguliwa kwa siku ${days}.`,
  }).then(() => {}, () => {});
  // Arifa kwa staff wa DukaLangu (SMS)
  await notifyStaff(supabase, tx);
  return { code, days, exp };
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ success: false, error: 'Server haijawekwa (SUPABASE_SERVICE_ROLE_KEY).' });
  }
  const action = (req.query?.action || '').toLowerCase();
  const supabase = db();

  try {
    // ===== 1. INITIATE =====
    if (action === 'initiate' && req.method === 'POST') {
      const body = parseJSON(await readRawBody(req));
      const { business_id, business_name, user_email, phone, amount, plan, days, channel } = body;
      if (!business_id || !amount || !phone) {
        return res.status(400).json({ success: false, error: 'business_id, amount na namba ya simu zinahitajika.' });
      }
      const reference = 'DL-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

      if (!TEEPAY_KEY) return res.status(500).json({ success: false, error: 'TeePay API key haijawekwa kwenye server.' });

      // Anzisha TeePay kwanza
      const gw = await teepayInitiate({ amount, phone, reference, email: user_email, name: business_name, days, plan });
      if (!gw.ok) return res.status(400).json({ success: false, error: gw.error });

      // Hifadhi muamala (pending) — provider_ref = public_reference ya TeePay (kwa webhook + polling)
      const { data: tx, error } = await supabase.from('payment_transactions').insert({
        business_id, business_name: business_name || null, user_email: user_email || null,
        phone: phone || null, amount, plan: plan || 'basic', days: days || 30,
        channel: channel || null, provider: 'teepay',
        provider_ref: gw.publicRef, external_id: gw.teepayId || null, status: 'pending',
      }).select().single();
      if (error) return res.status(400).json({ success: false, error: 'DB: ' + error.message });

      return res.status(200).json({
        success: true, reference: gw.publicRef, transaction_id: tx.id, mode: 'gateway',
        message: '📲 Angalia simu yako — weka PIN kuthibitisha malipo.',
      });
    }

    // ===== 1B. TEST (jaribu malipo bila gateway — inaiga malipo yaliyofaulu) =====
    if (action === 'test' && req.method === 'POST') {
      const body = parseJSON(await readRawBody(req));
      const { business_id, business_name, user_email, phone, amount, plan, days } = body;
      if (!business_id) return res.status(400).json({ success: false, error: 'business_id inahitajika.' });
      const reference = 'TEST-' + Date.now().toString(36).toUpperCase();
      // Tengeneza muamala tayari umelipwa
      const { data: tx, error } = await supabase.from('payment_transactions').insert({
        business_id, business_name: business_name || null, user_email: user_email || null,
        phone: phone || null, amount: amount || 0, plan: plan || 'basic', days: days || 30,
        provider: 'test', provider_ref: reference, status: 'paid', paid_at: new Date().toISOString(),
      }).select().single();
      if (error) return res.status(400).json({ success: false, error: 'DB: ' + error.message });
      // Washa biashara + tuma SMS kwa staff (kama malipo halisi)
      const act = await activateBusiness(supabase, tx);
      return res.status(200).json({ success: true, test: true, reference, message: '✅ JARIBIO: Malipo yameigwa, mfumo umejifungua, SMS zimetumwa kwa staff.', ...act });
    }

    // ===== 2. WEBHOOK (TeePay inathibitisha) =====
    if (action === 'webhook' && req.method === 'POST') {
      const raw = await readRawBody(req);
      if (!verifyWebhook(req, raw)) return res.status(401).json({ success: false, error: 'Webhook si halali.' });
      const payload = parseJSON(raw);
      const data = payload.data || {};
      const ref = data.reference || data.public_reference;
      const evt = (payload.type || payload.event || '').toLowerCase();
      const st = (data.status || '').toLowerCase();
      const isPaid = evt === 'payment.completed' || st === 'completed' || st === 'succeeded';
      const isFailed = evt === 'payment.failed' || ['failed', 'voided', 'expired', 'reversed'].includes(st);
      if (!ref) return res.status(400).json({ success: false, error: 'Hakuna reference.' });

      const { data: tx } = await supabase.from('payment_transactions').select('*').eq('provider_ref', ref).maybeSingle();
      if (!tx) return res.status(200).json({ success: true, message: 'Muamala haujapatikana (imepuuzwa).' });
      if (tx.status === 'paid') return res.status(200).json({ success: true, message: 'Tayari imethibitishwa.' });

      if (isPaid) {
        await supabase.from('payment_transactions').update({ status: 'paid', external_id: data.transaction_id || tx.external_id, paid_at: new Date().toISOString() }).eq('id', tx.id);
        await activateBusiness(supabase, tx);
        return res.status(200).json({ success: true, message: 'Malipo yamethibitishwa, mfumo umefunguliwa.' });
      } else if (isFailed) {
        await supabase.from('payment_transactions').update({ status: 'failed', external_id: data.transaction_id || tx.external_id }).eq('id', tx.id);
        return res.status(200).json({ success: true, message: 'Malipo hayakufaulu.' });
      }
      return res.status(200).json({ success: true, message: 'Imepokewa.' });
    }

    // ===== 3. STATUS (+ polling ya TeePay kama webhook imechelewa) =====
    if (action === 'status') {
      const ref = req.query?.ref;
      if (!ref) return res.status(400).json({ success: false, error: 'ref inahitajika.' });
      const { data: tx } = await supabase.from('payment_transactions').select('*').eq('provider_ref', ref).maybeSingle();
      if (!tx) return res.status(404).json({ success: false, error: 'Haijapatikana.' });

      if (tx.status === 'pending' && TEEPAY_KEY) {
        const gs = await teepayStatus(ref);
        if (gs?.paid) {
          await supabase.from('payment_transactions').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', tx.id);
          await activateBusiness(supabase, tx);
          return res.status(200).json({ success: true, status: 'paid', amount: tx.amount, days: tx.days, activated: true });
        } else if (gs?.failed) {
          await supabase.from('payment_transactions').update({ status: 'failed' }).eq('id', tx.id);
          return res.status(200).json({ success: true, status: 'failed', amount: tx.amount, days: tx.days });
        }
      }
      return res.status(200).json({ success: true, status: tx.status, amount: tx.amount, days: tx.days, paid_at: tx.paid_at });
    }

    return res.status(400).json({ success: false, error: 'Action si sahihi. Tumia initiate | webhook | status.' });
  } catch (err) {
    console.error('[payments]', err?.message);
    return res.status(500).json({ success: false, error: 'Tatizo la mfumo: ' + (err?.message || '') });
  }
}
