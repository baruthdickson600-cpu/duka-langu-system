import { createClient } from '@supabase/supabase-js';

// ============================================================
// DukaLangu — Mfumo wa Malipo (Auto-activation) — PROVIDER-AGNOSTIC
// Endpoint moja, actions mbili (ili tusizidi kikomo cha Vercel):
//   POST /api/payments?action=initiate   -> anzisha malipo
//   POST /api/payments?action=webhook    -> gateway inathibitisha -> jifungua
//   GET  /api/payments?action=status&ref= -> angalia hali ya malipo
//
// JINSI YA KUUNGANISHA GATEWAY (ZenoPay/ClickPesa/Selcom/n.k.):
//   1. Weka keys kwenye Vercel env: PAYMENT_PROVIDER, PAYMENT_API_KEY, PAYMENT_WEBHOOK_SECRET
//   2. Jaza sehemu ya `callGateway()` na `verifyWebhook()` kulingana na gateway yako
//   3. Weka webhook URL kwenye dashboard ya gateway: https://<domain>/api/payments?action=webhook
// Bila gateway, `initiate` bado inahifadhi muamala (pending); webhook ndiyo inajifungua.
// ============================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;
const PROVIDER = process.env.PAYMENT_PROVIDER || '';          // mf. 'zenopay'
const API_KEY = process.env.PAYMENT_API_KEY || '';
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || '';

function db() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ---- Gateway adapter (JAZA HAPA kulingana na gateway yako) ----
async function callGateway({ amount, phone, channel, reference, email, name }) {
  // Kama hakuna gateway iliyowekwa, rudisha "manual" (mteja atalipa mwenyewe kisha admin/webhook).
  if (!PROVIDER || !API_KEY) {
    return { ok: true, mode: 'manual', provider_ref: reference, message: 'Gateway haijawekwa — malipo ya mkono.' };
  }

  // ===== MFANO (ZenoPay-style). Badilisha kulingana na gateway yako =====
  // try {
  //   const r = await fetch('https://api.zenopay.co.tz/payments/mobile_money_tanzania', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
  //     body: JSON.stringify({ order_id: reference, buyer_phone: phone, buyer_email: email, buyer_name: name, amount }),
  //   });
  //   const d = await r.json();
  //   if (!r.ok) return { ok: false, error: d.message || 'Gateway error' };
  //   return { ok: true, mode: 'gateway', provider_ref: d.order_id || reference, raw: d };
  // } catch (e) { return { ok: false, error: e.message }; }

  return { ok: true, mode: 'manual', provider_ref: reference };
}

// ---- Thibitisha webhook ni halali (JAZA kulingana na gateway yako) ----
function verifyWebhook(req) {
  // Kama gateway inatuma signature header, ithibitishe hapa:
  // const sig = req.headers['x-webhook-signature'];
  // return sig && sig === expectedHmac(req.body, WEBHOOK_SECRET);
  // Kwa sasa: kama WEBHOOK_SECRET imewekwa, hakiki query/body ina secret hiyo.
  if (!WEBHOOK_SECRET) return true; // dev mode
  const provided = req.query?.secret || req.body?.secret || req.headers['x-webhook-secret'];
  return provided === WEBHOOK_SECRET;
}

// ---- Jifungue: washa biashara baada ya malipo kuthibitika ----
async function activateBusiness(supabase, tx) {
  const days = parseInt(tx.days) || 30;
  const exp = new Date(Date.now() + days * 86400000).toISOString();
  // 1. Washa biashara
  await supabase.from('businesses').update({
    token_active: true, token_expiry: exp, plan: tx.plan || 'basic', is_suspended: false,
  }).eq('id', tx.business_id);
  // 2. Rekodi token (kwa historia)
  const code = 'TK-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  await supabase.from('tokens').insert({
    code, days, plan: tx.plan || 'basic', used: true,
    used_by: tx.business_id, used_by_name: tx.business_name, used_at: new Date().toISOString(),
  }).then(() => {}, () => {});
  // 3. Arifa ndani ya mfumo (mteja ataona mara moja — realtime)
  await supabase.from('notifications').insert({
    target_type: 'business', target_id: tx.business_id, type: 'success',
    title: '🎉 Malipo Yamethibitishwa!',
    message: `Malipo yako ya TZS ${(tx.amount || 0).toLocaleString()} yamethibitishwa. Mfumo umefunguliwa kwa siku ${days}.`,
  }).then(() => {}, () => {});
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
      const { business_id, business_name, user_email, phone, amount, plan, days, channel } = req.body || {};
      if (!business_id || !amount) return res.status(400).json({ success: false, error: 'business_id na amount zinahitajika.' });
      const reference = 'DL-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

      // Hifadhi muamala (pending)
      const { data: tx, error } = await supabase.from('payment_transactions').insert({
        business_id, business_name: business_name || null, user_email: user_email || null,
        phone: phone || null, amount, plan: plan || 'basic', days: days || 30,
        channel: channel || null, provider: PROVIDER || 'manual', provider_ref: reference, status: 'pending',
      }).select().single();
      if (error) return res.status(400).json({ success: false, error: 'DB: ' + error.message });

      // Piga simu gateway (kama ipo)
      const gw = await callGateway({ amount, phone, channel, reference, email: user_email, name: business_name });
      if (!gw.ok) {
        await supabase.from('payment_transactions').update({ status: 'failed' }).eq('id', tx.id);
        return res.status(400).json({ success: false, error: gw.error || 'Imeshindwa kuanzisha malipo.' });
      }
      return res.status(200).json({
        success: true, reference, transaction_id: tx.id, mode: gw.mode,
        message: gw.mode === 'manual'
          ? 'Lipa kwa namba iliyotolewa, kisha subiri uthibitisho.'
          : 'Ombi la malipo limetumwa. Thibitisha kwenye simu yako.',
      });
    }

    // ===== 2. WEBHOOK (gateway inathibitisha pesa imeingia) =====
    if (action === 'webhook' && req.method === 'POST') {
      if (!verifyWebhook(req)) return res.status(401).json({ success: false, error: 'Webhook si halali.' });
      const body = req.body || {};
      // Gateway tofauti zina majina tofauti — tunachukua kinachowezekana:
      const ref = body.order_id || body.reference || body.provider_ref || body.ref;
      const extId = body.transid || body.transaction_id || body.external_id || null;
      const paid = (body.status || body.payment_status || '').toLowerCase();
      const isPaid = ['completed', 'success', 'paid', 'successful'].includes(paid) || body.paid === true;
      if (!ref) return res.status(400).json({ success: false, error: 'Hakuna reference.' });

      const { data: tx } = await supabase.from('payment_transactions').select('*').eq('provider_ref', ref).maybeSingle();
      if (!tx) return res.status(404).json({ success: false, error: 'Muamala haujapatikana.' });
      if (tx.status === 'paid') return res.status(200).json({ success: true, message: 'Tayari imethibitishwa.' }); // idempotent

      if (isPaid) {
        await supabase.from('payment_transactions').update({ status: 'paid', external_id: extId, paid_at: new Date().toISOString() }).eq('id', tx.id);
        const act = await activateBusiness(supabase, tx);
        return res.status(200).json({ success: true, message: 'Malipo yamethibitishwa, mfumo umefunguliwa.', ...act });
      } else {
        await supabase.from('payment_transactions').update({ status: 'failed', external_id: extId }).eq('id', tx.id);
        return res.status(200).json({ success: true, message: 'Malipo hayakufaulu.' });
      }
    }

    // ===== 3. STATUS (mteja/app kuangalia hali) =====
    if (action === 'status') {
      const ref = req.query?.ref || req.body?.ref;
      if (!ref) return res.status(400).json({ success: false, error: 'ref inahitajika.' });
      const { data: tx } = await supabase.from('payment_transactions').select('status,amount,days,paid_at').eq('provider_ref', ref).maybeSingle();
      if (!tx) return res.status(404).json({ success: false, error: 'Haijapatikana.' });
      return res.status(200).json({ success: true, status: tx.status, amount: tx.amount, days: tx.days, paid_at: tx.paid_at });
    }

    return res.status(400).json({ success: false, error: 'Action si sahihi. Tumia initiate | webhook | status.' });
  } catch (err) {
    console.error('[payments]', err?.message);
    return res.status(500).json({ success: false, error: 'Tatizo la mfumo: ' + (err?.message || '') });
  }
}
