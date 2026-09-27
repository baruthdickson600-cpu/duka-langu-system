import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ============================================================
// SNIPPE — Webhook (Production-grade)
// POST /api/snippe/webhook
// - Verify signature (HMAC-SHA256 ya "{timestamp}.{rawBody}")
// - Kataa replay (>5 min)
// - Kinga ya duplicate (event_id)
// - Activation ya kiotomatiki: businesses.token_active + token_expiry
// - Hakuna token generation
// ============================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Vercel: tunahitaji raw body kwa signature. Zima body parser.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(a || '', 'utf8');
  const bb = Buffer.from(b || '', 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SIGNING_KEY = process.env.SNIPPE_WEBHOOK_SECRET || process.env.SNIPPE_SIGNING_KEY;
  const rawBody = await readRawBody(req);

  const signature = req.headers['x-webhook-signature'] || '';
  const timestamp = req.headers['x-webhook-timestamp'] || '';

  const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  // ===== 1. Verify signature =====
  let signatureValid = false;
  if (SIGNING_KEY && signature && timestamp) {
    const payload = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac('sha256', SIGNING_KEY).update(payload).digest('hex');
    signatureValid = timingSafeEqual(expected, signature);

    // Replay protection: kataa zaidi ya dakika 5
    const ts = parseInt(timestamp, 10);
    const tsMs = ts > 1e12 ? ts : ts * 1000; // sekunde au millisekunde
    if (Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
      signatureValid = false;
    }
  }

  // Parse body
  let event = {};
  try { event = JSON.parse(rawBody); } catch (e) {}
  const eventId = event?.id || null;
  const eventType = event?.type || null;

  // Log kila ombi (audit)
  if (supabase) {
    await supabase.from('snippe_webhook_logs').insert({
      event_id: eventId,
      event_type: eventType,
      signature_valid: signatureValid,
      raw_body: rawBody.slice(0, 4000),
      processed: false,
    }).then(() => {}, () => {});
  }

  // Kataa signature batili (isipokuwa kama SIGNING_KEY haijawekwa - dev mode)
  if (SIGNING_KEY && !signatureValid) {
    console.warn('[snippe webhook] signature batili', eventId);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // ===== 2. Duplicate protection =====
    if (eventId) {
      const { data: dup } = await supabase
        .from('snippe_payments')
        .select('id')
        .eq('event_id', eventId)
        .maybeSingle();
      if (dup) {
        return res.status(200).json({ received: true, duplicate: true });
      }
    }

    const data = event?.data || {};
    const externalRef = data?.external_reference;
    const snippeRef = data?.reference;

    // Tafuta malipo yetu
    let { data: payment } = await supabase
      .from('snippe_payments')
      .select('*')
      .eq('external_reference', externalRef)
      .maybeSingle();

    if (!payment && snippeRef) {
      const r = await supabase.from('snippe_payments').select('*').eq('snippe_reference', snippeRef).maybeSingle();
      payment = r.data;
    }

    if (!payment) {
      // Hatuna rekodi - kubali lakini usifanye kitu
      return res.status(200).json({ received: true, unknown: true });
    }

    // ===== 3. Shughulikia kwa aina ya event =====
    if (eventType === 'payment.completed') {
      // Pata biashara
      const bizId = payment.business_id || data?.metadata?.business_id;
      const days = payment.days || parseInt(data?.metadata?.days) || 30;

      const { data: biz } = await supabase.from('businesses').select('*').eq('id', bizId).maybeSingle();

      // Ongeza siku (base = max(sasa, expiry ya sasa))
      const now = new Date();
      const currentEnd = biz?.token_active && biz?.token_expiry ? new Date(biz.token_expiry)
        : biz?.trial_end ? new Date(biz.trial_end) : now;
      const base = currentEnd > now ? currentEnd : now;
      const newEnd = new Date(base.getTime() + days * 86400000).toISOString();

      // ===== ACTIVATION YA KIOTOMATIKI (hakuna token) =====
      await supabase.from('businesses').update({
        token_active: true,
        token_expiry: newEnd,
        plan: payment.plan || biz?.plan || 'basic',
        is_suspended: false,
      }).eq('id', bizId);

      // Sasisha payment -> completed
      await supabase.from('snippe_payments').update({
        status: 'completed',
        event_id: eventId,
        paid_at: data?.completed_at || now.toISOString(),
      }).eq('id', payment.id);

      // Rekodi kwenye payment_requests (kwa Ripoti ya Mapato)
      const payReq = {
        business_id: bizId,
        amount: payment.amount,
        status: 'approved',
        transaction_id: snippeRef || externalRef,
        approved_at: now.toISOString(),
        payer_name: biz?.name || payment.business_name,
        payer_phone: payment.phone,
        payment_method: (payment.provider || 'snippe').toUpperCase(),
        days_given: days,
        revenue_type: 'sale',
        source: 'snippe',
        notes: `Snippe: ${payment.provider} • ${externalRef}`,
      };
      let { error: prErr } = await supabase.from('payment_requests').insert(payReq);
      let t = 0;
      while (prErr && prErr.message?.includes('column') && t < 8) {
        const m = prErr.message.match(/column "?([a-z_]+)"?/i);
        if (m && m[1] && payReq[m[1]] !== undefined) { delete payReq[m[1]]; t++; ({ error: prErr } = await supabase.from('payment_requests').insert(payReq)); }
        else break;
      }

      // Arifa kwa mteja
      await supabase.from('notifications').insert({
        target_type: 'business', target_id: bizId, type: 'success',
        title: '🎉 Malipo Yamekamilika!',
        message: `Malipo yako ya TZS ${payment.amount.toLocaleString()} yamepokelewa. Mfumo umefunguliwa hadi ${new Date(newEnd).toLocaleDateString('sw-TZ')}. Siku ${days} zimeongezwa.`,
      }).then(() => {}, () => {});

      // Weka log processed
      if (eventId) await supabase.from('snippe_webhook_logs').update({ processed: true }).eq('event_id', eventId);

      return res.status(200).json({ received: true, activated: true });
    }

    else if (eventType === 'payment.failed' || eventType === 'payment.voided' || eventType === 'payment.expired') {
      const st = eventType.split('.')[1];
      await supabase.from('snippe_payments').update({
        status: st,
        event_id: eventId,
        failure_reason: data?.failure_reason || null,
      }).eq('id', payment.id);

      await supabase.from('notifications').insert({
        target_type: 'business', target_id: payment.business_id, type: 'warning',
        title: '❌ Malipo Hayakukamilika',
        message: `Malipo yako hayakukamilika (${data?.failure_reason || st}). Tafadhali jaribu tena.`,
      }).then(() => {}, () => {});

      return res.status(200).json({ received: true, status: st });
    }

    return res.status(200).json({ received: true, ignored: eventType });

  } catch (err) {
    console.error('[snippe webhook]', err?.message);
    return res.status(500).json({ error: 'Processing error' });
  }
}
