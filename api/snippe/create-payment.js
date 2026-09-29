import { createClient } from '@supabase/supabase-js';

// ============================================================
// SNIPPE — Create Payment
// POST /api/snippe/create-payment
// Inaunda ombi la malipo Snippe, inahifadhi pending, inarudisha maelekezo.
// Secrets ni server-side pekee (hazifiki frontend).
// ============================================================

const SNIPPE_BASE = 'https://api.snippe.sh';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Ramani ya njia -> provider code za Snippe
const PROVIDER_MAP = {
  mpesa: 'mpesa',
  vodacom: 'mpesa',
  airtel: 'airtel',
  tigo: 'mixx',      // Tigo/Yas = Mixx by Yas
  yas: 'mixx',
  mixx: 'mixx',
  halopesa: 'halotel',
  halotel: 'halotel',
};

// Rekebisha namba iwe +255...
function normalizePhone(raw) {
  let p = (raw || '').replace(/\D/g, '');
  if (p.startsWith('0')) p = '255' + p.slice(1);
  if (p.startsWith('255') === false && p.length === 9) p = '255' + p;
  return '+' + p;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const API_KEY = process.env.SNIPPE_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ status: 'error', message: 'Snippe haijawekwa. Wasiliana na admin.' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ status: 'error', message: 'Database haijawekwa.' });
  }

  try {
    const { business_id, business_name, amount, phone, provider, days = 30, plan = 'basic', customer_name, customer_email } = req.body || {};

    // Validation
    if (!business_id) return res.status(400).json({ status: 'error', message: 'business_id inahitajika.' });
    if (!amount || amount < 100) return res.status(400).json({ status: 'error', message: 'Kiasi si sahihi.' });
    if (!phone) return res.status(400).json({ status: 'error', message: 'Namba ya simu inahitajika.' });

    const snippeProvider = PROVIDER_MAP[(provider || '').toLowerCase()] || 'mpesa';
    const normalizedPhone = normalizePhone(phone);

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Kinga: zuia malipo ya pending yaliyorudiwa (idempotency ya biashara)
    const { data: existing } = await supabase
      .from('snippe_payments')
      .select('id, external_reference, created_at')
      .eq('business_id', business_id)
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 3 * 60 * 1000).toISOString()) // dakika 3
      .maybeSingle();

    if (existing) {
      return res.status(200).json({
        status: 'success',
        pending: true,
        reference: existing.external_reference,
        message: 'Una ombi la malipo linalosubiri. Angalia simu yako kuidhinisha.',
      });
    }

    // Reference ya kipekee
    const externalRef = 'DUKA-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const idempotencyKey = externalRef.slice(0, 30);

    // Tuma ombi Snippe
    const snippeBody = {
      amount: { value: Math.round(amount), currency: 'TZS' },
      customer: {
        phone: normalizedPhone,
        name: customer_name || business_name || 'DukaLangu Customer',
        ...(customer_email ? { email: customer_email } : {}),
      },
      channel: { type: 'mobile_money', provider: snippeProvider },
      external_reference: externalRef,
      metadata: { business_id, business_name, days, plan, source: 'dukalangu' },
    };

    const snippeRes = await fetch(`${SNIPPE_BASE}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(snippeBody),
    });

    const snippeData = await snippeRes.json().catch(() => ({}));

    if (!snippeRes.ok) {
      const msg = snippeData?.message || 'Imeshindwa kuanzisha malipo.';
      // Ujumbe wa kirafiki
      let friendly = msg;
      if (snippeRes.status === 401) friendly = 'Uthibitishaji umeshindwa. Wasiliana na admin.';
      else if (snippeRes.status === 429) friendly = 'Maombi mengi. Subiri kidogo kisha jaribu tena.';
      else if (/phone|number/i.test(msg)) friendly = 'Namba ya simu si sahihi.';
      return res.status(snippeRes.status).json({ status: 'error', message: friendly });
    }

    const d = snippeData?.data || snippeData;
    const snippeRef = d?.reference || null;

    // Hifadhi pending
    await supabase.from('snippe_payments').insert({
      business_id,
      business_name: business_name || null,
      amount: Math.round(amount),
      currency: 'TZS',
      provider: snippeProvider,
      phone: normalizedPhone,
      status: 'pending',
      external_reference: externalRef,
      snippe_reference: snippeRef,
      days,
      plan,
      metadata: snippeBody.metadata,
    });

    return res.status(200).json({
      status: 'success',
      reference: externalRef,
      snippe_reference: snippeRef,
      provider: snippeProvider,
      message: 'Ombi limetumwa! Angalia simu yako, weka PIN kuidhinisha malipo.',
    });

  } catch (err) {
    console.error('[snippe create]', err?.message);
    return res.status(500).json({ status: 'error', message: 'Tatizo la mfumo. Jaribu tena.' });
  }
}
