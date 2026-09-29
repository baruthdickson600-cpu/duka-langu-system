import { createClient } from '@supabase/supabase-js';

// ============================================================
// SNIPPE — Status Check (polling ya frontend)
// GET /api/snippe/status?reference=DUKA-...
// ============================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  const reference = req.query?.reference;
  if (!reference) return res.status(400).json({ status: 'error', message: 'reference inahitajika' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ status: 'error', message: 'Database haijawekwa' });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data } = await supabase
      .from('snippe_payments')
      .select('status, amount, provider, days, paid_at, failure_reason')
      .eq('external_reference', reference)
      .maybeSingle();

    if (!data) return res.status(404).json({ status: 'error', message: 'Malipo hayajapatikana' });

    return res.status(200).json({
      status: 'success',
      payment_status: data.status,   // pending | completed | failed | ...
      amount: data.amount,
      provider: data.provider,
      days: data.days,
      paid_at: data.paid_at,
      failure_reason: data.failure_reason,
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Tatizo la mfumo' });
  }
}
