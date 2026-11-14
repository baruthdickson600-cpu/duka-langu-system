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

// ============================================================
// SNIPPE PAYOUTS — kutoa pesa (withdrawal) kwenda M-Pesa/Tigo/benki
// ============================================================

// Salio la akaunti ya Snippe
async function snippeBalance() {
  try {
    const r = await fetch(`${SNIPPE_BASE}/v1/balance`, {
      headers: { 'Authorization': `Bearer ${SNIPPE_KEY}`, 'Snippe-Version': SNIPPE_VERSION },
    });
    const d = await r.json().catch(() => ({}));
    const data = d.data || d;
    // Jaribu kupata kiasi (minor au major)
    const bal = data.available_minor != null ? Number(data.available_minor) / 100
      : data.available != null ? Number(data.available)
      : data.balance != null ? Number(data.balance) : 0;
    return { ok: r.ok, balance: bal, raw: data };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Ada ya kutoa (fee)
async function snippeFee(amount) {
  try {
    const r = await fetch(`${SNIPPE_BASE}/v1/payouts/fee?amount=${Math.round(amount)}`, {
      headers: { 'Authorization': `Bearer ${SNIPPE_KEY}`, 'Snippe-Version': SNIPPE_VERSION },
    });
    const d = await r.json().catch(() => ({}));
    const data = d.data || d;
    const fee = data.fee_minor != null ? Number(data.fee_minor) / 100 : Number(data.fee || 0);
    return { ok: r.ok, fee, raw: data };
  } catch { return { ok: false, fee: 0 }; }
}

// Tuma pesa (payout)
async function snippeSendPayout({ amount, method, channel, recipientNumber, recipientName, bankCode, reference }) {
  const body = method === 'bank'
    ? { payout_type: 'bank', details: { amount: Math.round(amount), currency: 'TZS' }, bank_code: bankCode, account_number: recipientNumber, account_name: recipientName }
    : { payout_type: 'mobile', details: { amount: Math.round(amount), currency: 'TZS' }, phone_number: toMsisdn(recipientNumber), channel, recipient_name: recipientName };
  const r = await fetch(`${SNIPPE_BASE}/v1/payouts/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SNIPPE_KEY}`,
      'Snippe-Version': SNIPPE_VERSION,
      'Idempotency-Key': reference,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  const data = d.data || d;
  if (!r.ok) return { ok: false, error: data.message || d.message || 'Snippe: imeshindwa kutoa pesa.' };
  return { ok: true, snippeRef: data.reference || reference, status: data.status };
}

// ---- Arifa kwa waidhinishaji (Admin + Marketing) kuhusu ombi la kutoa pesa ----
async function notifyApprovers(supabase, po) {
  try {
    const { data: staff } = await supabase.from('users')
      .select('name,phone,email,role').in('role', ['admin', 'marketing']);
    if (!staff || !staff.length) return;
    const amount = (po.amount || 0).toLocaleString();
    const by = po.requested_by || 'Mhasibu';
    const reason = po.reason || '—';
    const to = po.recipient_name || po.recipient_number || '—';

    const msg = `OMBI LA KUTOA PESA - DukaLangu\n\nKiasi: TZS ${amount}\nKwenda: ${to}\nSababu: ${reason}\nAmeomba: ${by}\n\nTafadhali ingia mfumoni uidhinishe/ukatae. Pesa haitatoka bila idhini yako na mwenzako.`;
    const smsJobs = staff.filter(s => s.phone).map(s =>
      fetch(`${APP_URL}/api/send-sms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: s.phone, message: msg }) }).catch(() => {}));

    const subject = `🔔 Ombi la Kutoa Pesa — TZS ${amount} (linahitaji idhini)`;
    const html = `
      <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#C2412D,#9B3322);color:#fff;padding:22px;border-radius:14px 14px 0 0">
          <div style="font-size:13px;opacity:.9;letter-spacing:.5px">OMBI LA KUTOA PESA — LINAHITAJI IDHINI</div>
          <div style="font-size:26px;font-weight:800;margin-top:4px">TZS ${amount}</div>
        </div>
        <div style="background:#fff;border:1px solid #F0D9D4;border-top:none;border-radius:0 0 14px 14px;padding:22px">
          <table style="width:100%;font-size:14px;color:#17231D;border-collapse:collapse">
            <tr><td style="padding:7px 0;color:#5C6A62">Kwenda</td><td style="padding:7px 0;font-weight:700;text-align:right">${to}</td></tr>
            <tr><td style="padding:7px 0;color:#5C6A62">Sababu</td><td style="padding:7px 0;font-weight:700;text-align:right">${reason}</td></tr>
            <tr><td style="padding:7px 0;color:#5C6A62">Ameomba</td><td style="padding:7px 0;font-weight:700;text-align:right">${by}</td></tr>
          </table>
          <div style="margin-top:16px;padding:12px 14px;background:#FBECE9;border-radius:10px;font-size:13px;color:#C2412D;font-weight:600">
            ⚠️ Pesa haitatoka mpaka Admin NA Marketing waidhinishe. Ingia mfumoni uidhinishe au ukatae.
          </div>
        </div>
      </div>`;
    const emailJobs = staff.filter(s => s.email).map(s =>
      fetch(`${APP_URL}/api/send-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: s.email, subject, html }) }).catch(() => {}));

    // Arifa ndani ya mfumo
    await supabase.from('notifications').insert({
      target_type: 'role', target_id: 'approvers', type: 'warning',
      title: '🔔 Ombi Jipya la Kutoa Pesa',
      message: `Ombi la TZS ${amount} kwenda ${to} linasubiri idhini yako. Ameomba: ${by}.`,
    }).then(() => {}, () => {});

    await Promise.all([...smsJobs, ...emailJobs]);
  } catch { /* usivunje ombi kwa kosa la arifa */ }
}

// ---- Tekeleza payout kupitia Snippe (idhini zote mbili zikiisha) ----
async function executePayout(supabase, po) {
  const reference = po.provider_ref || ('PO-' + Date.now().toString(36).toUpperCase());
  const gw = await snippeSendPayout({
    amount: po.amount, method: po.method, channel: po.channel,
    recipientNumber: po.recipient_number, recipientName: po.recipient_name,
    bankCode: po.bank_code, reference,
  });
  await supabase.from('payouts').update({
    status: gw.ok ? (gw.status || 'pending') : 'failed',
    provider_ref: gw.ok ? gw.snippeRef : reference,
  }).eq('id', po.id);

  // Arifa mhasibu
  await supabase.from('notifications').insert({
    target_type: 'role', target_id: 'accountant', type: gw.ok ? 'success' : 'error',
    title: gw.ok ? '✅ Pesa Imetumwa' : '❌ Kutoa Pesa Kumeshindwa',
    message: gw.ok
      ? `Ombi lako la TZS ${(po.amount || 0).toLocaleString()} limeidhinishwa na pesa imetumwa.`
      : `Ombi la TZS ${(po.amount || 0).toLocaleString()} limeshindwa kutumwa: ${gw.error || 'hitilafu'}.`,
  }).then(() => {}, () => {});

  return gw;
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

      // Kama ni event ya PAYOUT (kutoa pesa), sasisha jedwali la payouts
      if (evt.startsWith('payout')) {
        const { data: po } = await supabase.from('payouts').select('*').eq('provider_ref', ref).maybeSingle();
        if (po && po.status !== 'completed') {
          const newSt = evt === 'payout.completed' || isPaid ? 'completed' : (isFailed ? 'failed' : po.status);
          await supabase.from('payouts').update({ status: newSt, external_id: data.transaction_id || po.external_id, completed_at: newSt === 'completed' ? new Date().toISOString() : null }).eq('id', po.id);
        }
        return res.status(200).json({ success: true, message: 'Payout imepokewa.' });
      }

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

    // ===== 4. PAYOUT: SALIO (balance) =====
    if (action === 'payout_balance') {
      if (!SNIPPE_KEY) return res.status(500).json({ success: false, error: 'Snippe API key haijawekwa.' });
      const b = await snippeBalance();
      return res.status(b.ok ? 200 : 400).json({ success: b.ok, balance: b.balance || 0, error: b.error });
    }

    // ===== 5. PAYOUT: ADA (fee) =====
    if (action === 'payout_fee') {
      const amount = parseFloat(req.query?.amount || '0');
      if (!amount) return res.status(400).json({ success: false, error: 'amount inahitajika.' });
      const f = await snippeFee(amount);
      return res.status(200).json({ success: true, fee: f.fee || 0 });
    }

    // ===== 6. PAYOUT: ANZISHA OMBI (request) — mhasibu, hakuna pesa inayotoka bado =====
    if (action === 'payout_request' && req.method === 'POST') {
      const body = parseJSON(await readRawBody(req));
      const { amount, method = 'mobile', channel, recipient_number, recipient_name, bank_code, reason, requested_by, requested_by_id } = body;
      if (!amount || amount <= 0) return res.status(400).json({ success: false, error: 'Weka kiasi sahihi.' });
      if (!recipient_number) return res.status(400).json({ success: false, error: 'Weka namba ya kupokea.' });
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'Andika sababu ya matumizi.' });

      const reference = 'PO-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
      const feeRes = await snippeFee(amount);

      const { data: po, error } = await supabase.from('payouts').insert({
        amount, fee: feeRes.fee || 0, method, channel: channel || null,
        recipient_name: recipient_name || null, recipient_number, bank_code: bank_code || null,
        reason: reason.trim(), provider: 'snippe', provider_ref: reference,
        status: 'pending_approval', admin_approved: false, marketing_approved: false,
        requested_by: requested_by || null, requested_by_id: requested_by_id || null,
      }).select().single();
      if (error) return res.status(400).json({ success: false, error: 'DB: ' + error.message });

      // Arifa Admin + Marketing waidhinishe
      await notifyApprovers(supabase, po);

      return res.status(200).json({ success: true, payout_id: po.id, fee: feeRes.fee || 0, message: '✅ Ombi limetumwa kwa Admin na Marketing kwa idhini.' });
    }

    // ===== 7. PAYOUT: IDHINISHA (approve) — Admin au Marketing =====
    if (action === 'payout_approve' && req.method === 'POST') {
      const body = parseJSON(await readRawBody(req));
      const { payout_id, role, approver_name } = body;
      if (!payout_id) return res.status(400).json({ success: false, error: 'payout_id inahitajika.' });
      if (!['admin', 'marketing'].includes(role)) return res.status(403).json({ success: false, error: 'Ni Admin au Marketing pekee wanaweza kuidhinisha.' });

      const { data: po, error: ge } = await supabase.from('payouts').select('*').eq('id', payout_id).single();
      if (ge || !po) return res.status(404).json({ success: false, error: 'Ombi halikupatikana.' });
      if (po.status !== 'pending_approval' && po.status !== 'approved')
        return res.status(400).json({ success: false, error: 'Ombi hili haliwezi kuidhinishwa (hali: ' + po.status + ').' });

      const now = new Date().toISOString();
      const upd = {};
      if (role === 'admin') { upd.admin_approved = true; upd.admin_approved_by = approver_name || 'Admin'; upd.admin_approved_at = now; }
      if (role === 'marketing') { upd.marketing_approved = true; upd.marketing_approved_by = approver_name || 'Marketing'; upd.marketing_approved_at = now; }

      const adminOk = role === 'admin' ? true : po.admin_approved;
      const mktOk = role === 'marketing' ? true : po.marketing_approved;
      const bothApproved = adminOk && mktOk;
      upd.status = bothApproved ? 'approved' : 'pending_approval';

      const { data: updated, error: ue } = await supabase.from('payouts').update(upd).eq('id', payout_id).select().single();
      if (ue) return res.status(400).json({ success: false, error: 'DB: ' + ue.message });

      // Idhini zote mbili zikiisha → tuma pesa otomatiki
      if (bothApproved) {
        if (!SNIPPE_KEY) return res.status(500).json({ success: false, error: 'Snippe API key haijawekwa; idhini imehifadhiwa lakini pesa haijatoka.' });
        const gw = await executePayout(supabase, updated);
        if (!gw.ok) return res.status(200).json({ success: true, approved: true, dispatched: false, error: gw.error, message: '⚠️ Idhini zote zimekamilika lakini kutuma pesa kumeshindwa: ' + (gw.error || '') });
        return res.status(200).json({ success: true, approved: true, dispatched: true, message: '✅ Idhini zote zimekamilika — pesa imetumwa.' });
      }
      const waiting = role === 'admin' ? 'Marketing' : 'Admin';
      return res.status(200).json({ success: true, approved: true, dispatched: false, message: `✅ Umeidhinisha. Sasa inasubiri idhini ya ${waiting}.` });
    }

    // ===== 8. PAYOUT: KATAA (reject) — Admin au Marketing =====
    if (action === 'payout_reject' && req.method === 'POST') {
      const body = parseJSON(await readRawBody(req));
      const { payout_id, role, approver_name, reason } = body;
      if (!payout_id) return res.status(400).json({ success: false, error: 'payout_id inahitajika.' });
      if (!['admin', 'marketing'].includes(role)) return res.status(403).json({ success: false, error: 'Ni Admin au Marketing pekee wanaoweza kukataa.' });
      const { data: updated, error } = await supabase.from('payouts').update({
        status: 'rejected', rejected_by: approver_name || role, rejected_reason: reason || null,
      }).eq('id', payout_id).select().single();
      if (error) return res.status(400).json({ success: false, error: 'DB: ' + error.message });
      await supabase.from('notifications').insert({
        target_type: 'role', target_id: 'accountant', type: 'error',
        title: '❌ Ombi la Kutoa Pesa Limekataliwa',
        message: `Ombi lako la TZS ${(updated.amount || 0).toLocaleString()} limekataliwa na ${approver_name || role}.${reason ? ' Sababu: ' + reason : ''}`,
      }).then(() => {}, () => {});
      return res.status(200).json({ success: true, message: 'Ombi limekataliwa.' });
    }

    // ===== 9. PAYOUT: ORODHA (list) =====
    if (action === 'payout_list') {
      const status = req.query?.status;
      let q = supabase.from('payouts').select('*').order('created_at', { ascending: false }).limit(50);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) return res.status(400).json({ success: false, error: 'DB: ' + error.message });
      return res.status(200).json({ success: true, payouts: data || [] });
    }

    return res.status(400).json({ success: false, error: 'Action si sahihi. Tumia initiate | webhook | status | payout_balance | payout_fee | payout_request | payout_approve | payout_reject | payout_list.' });
  } catch (err) {
    console.error('[payments]', err?.message);
    return res.status(500).json({ success: false, error: 'Tatizo la mfumo: ' + (err?.message || '') });
  }
}
