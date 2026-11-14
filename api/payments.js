import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ============================================================
// DukaLangu — Mfumo wa Malipo (Auto-activation) — SNIPPE
// Endpoint moja, actions kadhaa (ili tusizidi kikomo cha Vercel):
//   POST /api/payments?action=initiate  -> anzisha malipo (USSD push kwa simu)
//   POST /api/payments?action=webhook   -> Snippe inathibitisha -> mfumo unajifungua
//   GET  /api/payments?action=status&ref=-> angalia hali (+ polling ya Snippe)
//
// ENV za Vercel zinazohitajika:
//   SUPABASE_SERVICE_ROLE_KEY   (au VITE_SUPABASE_KEY)
//   VITE_SUPABASE_URL
//   SNIPPE_API_KEY              (secret key ya Snippe — inaanza na snp_live_... / snp_test_...)
//   SNIPPE_WEBHOOK_SECRET       (secret ya uthibitisho wa webhook — HMAC)
//   APP_URL                     (mf. https://dukalangu.com)
//
// Webhook URL ya kuweka kwenye dashboard ya Snippe:
//   https://dukalangu.com/api/payments?action=webhook
// ============================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;
const SNIPPE_KEY = process.env.SNIPPE_API_KEY || process.env.PAYMENT_API_KEY || '';
const WEBHOOK_SECRET = process.env.SNIPPE_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || '';
const APP_URL = process.env.APP_URL || process.env.VITE_APP_URL || 'https://dukalangu.com';
const SNIPPE_BASE = 'https://api.snippe.sh';
const SNIPPE_VERSION = '2026-01-25';

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

// Namba ya simu iwe 255XXXXXXXXX (Snippe inataka 255...)
function toMsisdn(p) {
  let x = String(p || '').replace(/[^\d]/g, '');
  if (x.startsWith('0')) x = '255' + x.slice(1);
  if (x.length === 9) x = '255' + x;
  return x; // 255XXXXXXXXX
}
// Gawanya jina kuwa firstname + lastname
function splitName(name) {
  const parts = String(name || 'DukaLangu Mteja').trim().split(/\s+/);
  return { firstname: parts[0] || 'DukaLangu', lastname: parts.slice(1).join(' ') || 'Mteja' };
}

// ---- Snippe: anzisha malipo (USSD push) ----
async function snippeInitiate({ amount, phone, reference, email, name }) {
  const nm = splitName(name);
  const r = await fetch(`${SNIPPE_BASE}/v1/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SNIPPE_KEY}`,
      'Snippe-Version': SNIPPE_VERSION,
      'Idempotency-Key': reference,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payment_type: 'mobile',
      details: { amount: Math.round(parseFloat(amount) || 0), currency: 'TZS' },
      phone_number: toMsisdn(phone),
      customer: { firstname: nm.firstname, lastname: nm.lastname, email: email || 'malipo@dukalangu.com' },
      webhook_url: `${APP_URL}/api/payments?action=webhook`,
      metadata: { reference },
    }),
  });
  const d = await r.json().catch(() => ({}));
  const data = d.data || d;
  if (!r.ok) return { ok: false, error: data.message || d.message || d.error?.message || 'Snippe: imeshindwa kuanzisha malipo.' };
  // Response: { data: { reference, status } }
  return { ok: true, snippeRef: data.reference || reference, status: data.status };
}

// ---- Snippe: soma hali ya malipo (polling) ----
async function snippeStatus(reference) {
  try {
    const r = await fetch(`${SNIPPE_BASE}/v1/payments/${encodeURIComponent(reference)}`, {
      headers: { 'Authorization': `Bearer ${SNIPPE_KEY}`, 'Snippe-Version': SNIPPE_VERSION },
    });
    const d = await r.json().catch(() => ({}));
    const data = d.data || d;
    const st = (data.status || '').toLowerCase();
    return { paid: ['completed', 'success', 'successful', 'paid'].includes(st), failed: ['failed', 'cancelled', 'reversed'].includes(st), status: st, raw: data };
  } catch { return null; }
}

// ---- Thibitisha saini ya webhook (HMAC-SHA256 ya raw body) ----
function verifyWebhook(req, rawBody) {
  if (!WEBHOOK_SECRET) return true; // dev mode (hakuna secret)
  const sig = req.headers['snippe-signature'] || req.headers['x-snippe-signature'] || req.headers['x-signature'];
  const ts = req.headers['snippe-timestamp'] || req.headers['x-snippe-timestamp'];
  if (!sig) return false;
  // Kataa kama timestamp ina tofauti zaidi ya dakika 5 (kama ipo)
  if (ts) { const now = Math.floor(Date.now() / 1000); if (Math.abs(now - parseInt(ts)) > 300) return false; }
  // Snippe: HMAC-SHA256 juu ya raw body (au "timestamp.body" kama timestamp ipo)
  const payloads = ts ? [`${ts}.${rawBody}`, rawBody] : [rawBody];
  for (const pl of payloads) {
    const hex = crypto.createHmac('sha256', WEBHOOK_SECRET).update(pl).digest('hex');
    const provided = String(sig).replace(/^sha256=/, '').replace(/^v1=/, '');
    try { if (crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(hex))) return true; } catch { /* endelea */ }
  }
  return false;
}

// ---- Tuma SMS + Email kwa staff wa DukaLangu (admin, marketing, accountant) ----
async function notifyStaff(supabase, tx) {
  try {
    const { data: staff } = await supabase.from('users')
      .select('name,phone,email,role')
      .in('role', ['admin', 'marketing', 'accountant']);
    if (!staff || !staff.length) return;

    const amount = (tx.amount || 0).toLocaleString();
    const biz = tx.business_name || '—';
    const plan = (tx.plan || 'basic');
    const days = tx.days || 30;
    const phone = tx.phone || '—';
    const when = new Date().toLocaleString('sw-TZ', { timeZone: 'Africa/Dar_es_Salaam' });

    // ---- SMS ----
    const msg = `MALIPO MAPYA - DukaLangu\n\nMteja: ${biz}\nKiasi: TZS ${amount}\nPlan: ${plan} siku ${days}\nSimu: ${phone}\n\nMteja amelipa na mfumo umejifungua.`;
    const smsJobs = staff.filter(s => s.phone).map(s =>
      fetch(`${APP_URL}/api/send-sms`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: s.phone, message: msg }),
      }).catch(() => {})
    );

    // ---- Email ----
    const subject = `💰 Malipo Mapya — ${biz} (TZS ${amount})`;
    const html = `
      <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#0A6E47,#06502F);color:#fff;padding:22px;border-radius:14px 14px 0 0">
          <div style="font-size:13px;opacity:.85;letter-spacing:.5px">MALIPO MAPYA</div>
          <div style="font-size:26px;font-weight:800;margin-top:4px">TZS ${amount}</div>
        </div>
        <div style="background:#fff;border:1px solid #E6F2EC;border-top:none;border-radius:0 0 14px 14px;padding:22px">
          <table style="width:100%;font-size:14px;color:#17231D;border-collapse:collapse">
            <tr><td style="padding:7px 0;color:#5C6A62">Mteja (Biashara)</td><td style="padding:7px 0;font-weight:700;text-align:right">${biz}</td></tr>
            <tr><td style="padding:7px 0;color:#5C6A62">Plan</td><td style="padding:7px 0;font-weight:700;text-align:right">${plan} — siku ${days}</td></tr>
            <tr><td style="padding:7px 0;color:#5C6A62">Simu ya Mteja</td><td style="padding:7px 0;font-weight:700;text-align:right">${phone}</td></tr>
            <tr><td style="padding:7px 0;color:#5C6A62">Muda</td><td style="padding:7px 0;font-weight:700;text-align:right">${when}</td></tr>
          </table>
          <div style="margin-top:16px;padding:12px 14px;background:#E6F2EC;border-radius:10px;font-size:13px;color:#0A6E47;font-weight:600">
            ✅ Mteja amelipa na mfumo umejifungua wenyewe.
          </div>
        </div>
      </div>`;
    const emailJobs = staff.filter(s => s.email).map(s =>
      fetch(`${APP_URL}/api/send-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: s.email, subject, html }),
      }).catch(() => {})
    );

    await Promise.all([...smsJobs, ...emailJobs]);
  } catch { /* usivunje activation kwa kosa la arifa */ }
}

// ---- Jifungue: washa biashara baada ya malipo kuthibitika ----
async function activateBusiness(supabase, tx) {
  const days = parseInt(tx.days) || 30;
  const exp = new Date(Date.now() + days * 86400000).toISOString();
  await supabase.from('businesses').update({
    token_active: true, token_expiry: exp, plan: tx.plan || 'basic', is_suspended: false,
  }).eq('id', tx.business_id);
  await supabase.from('notifications').insert({
    target_type: 'business', target_id: tx.business_id, type: 'success',
    title: '🎉 Malipo Yamethibitishwa!',
    message: `Malipo yako ya TZS ${(tx.amount || 0).toLocaleString()} yamethibitishwa. Mfumo umefunguliwa kwa siku ${days}.`,
  }).then(() => {}, () => {});
  // Arifa kwa staff wa DukaLangu (SMS)
  await notifyStaff(supabase, tx);
  return { days, exp };
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

      if (!SNIPPE_KEY) return res.status(500).json({ success: false, error: 'Snippe API key haijawekwa kwenye server.' });

      // Anzisha Snippe kwanza (USSD push kwa simu ya mteja)
      const gw = await snippeInitiate({ amount, phone, reference, email: user_email, name: business_name });
      if (!gw.ok) return res.status(400).json({ success: false, error: gw.error });

      // Hifadhi muamala (pending) — provider_ref = reference ya Snippe (kwa webhook + polling)
      const { data: tx, error } = await supabase.from('payment_transactions').insert({
        business_id, business_name: business_name || null, user_email: user_email || null,
        phone: phone || null, amount, plan: plan || 'basic', days: days || 30,
        channel: channel || null, provider: 'snippe',
        provider_ref: gw.snippeRef, external_id: gw.snippeRef || null, status: 'pending',
      }).select().single();
      if (error) return res.status(400).json({ success: false, error: 'DB: ' + error.message });

      return res.status(200).json({
        success: true, reference: gw.snippeRef, transaction_id: tx.id, mode: 'gateway',
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

    // ===== 2. WEBHOOK (Snippe inathibitisha) =====
    if (action === 'webhook' && req.method === 'POST') {
      const raw = await readRawBody(req);
      if (!verifyWebhook(req, raw)) return res.status(401).json({ success: false, error: 'Webhook si halali.' });
      const payload = parseJSON(raw);
      const data = payload.data || {};
      const ref = data.reference || data.public_reference || data.metadata?.reference || payload.reference;
      const evt = (payload.type || payload.event || '').toLowerCase();
      const st = (data.status || '').toLowerCase();
      const isPaid = evt === 'payment.completed' || ['completed', 'succeeded', 'success', 'successful', 'paid'].includes(st);
      const isFailed = evt === 'payment.failed' || ['failed', 'voided', 'expired', 'reversed', 'cancelled'].includes(st);
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

    // ===== 3. STATUS (+ polling ya Snippe kama webhook imechelewa) =====
    if (action === 'status') {
      const ref = req.query?.ref;
      if (!ref) return res.status(400).json({ success: false, error: 'ref inahitajika.' });
      const { data: tx } = await supabase.from('payment_transactions').select('*').eq('provider_ref', ref).maybeSingle();
      if (!tx) return res.status(404).json({ success: false, error: 'Haijapatikana.' });

      if (tx.status === 'pending' && SNIPPE_KEY) {
        const gs = await snippeStatus(ref);
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
