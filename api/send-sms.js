// ============================================================
// api/send-sms.js — General SMS Sender via Beem Africa
// Real-time: inaitwa moja kwa moja wakati action inatokea
// Architecture: stateless, scalable, hakuna cron dependency
// ============================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const BEEM_API_KEY    = process.env.BEEM_API_KEY;
  const BEEM_SECRET_KEY = process.env.BEEM_SECRET_KEY;
  const BEEM_SENDER_ID  = process.env.BEEM_SENDER_ID || 'INFO';

  if (!BEEM_API_KEY || !BEEM_SECRET_KEY) {
    console.error('❌ [SMS] Beem env variables hazipo');
    return res.status(500).json({
      success: false,
      error: 'SMS service haijawekwa vizuri.',
    });
  }

  const { phone, message, recipient_id = 1 } = req.body || {};

  if (!phone || !message) {
    return res.status(400).json({
      success: false,
      error: 'phone na message zinahitajika',
    });
  }

  // ── Format phone: 0712345678 → 255712345678 ───────────────
  let dest = String(phone).trim().replace(/\s+/g, '').replace(/^\+/, '');
  if (dest.startsWith('0') && dest.length === 10) {
    dest = '255' + dest.slice(1);
  }
  if (!/^255[67]\d{8}$/.test(dest)) {
    return res.status(400).json({
      success: false,
      error: `Nambari si sahihi: ${phone}`,
    });
  }

  const credentials = Buffer.from(`${BEEM_API_KEY}:${BEEM_SECRET_KEY}`).toString('base64');

  const payload = {
    source_addr: BEEM_SENDER_ID,
    encoding:    0,
    message:     message,
    recipients:  [{ recipient_id, dest_addr: dest }],
  };

  console.log('📤 [SMS] Inatuma kwa:', dest);

  try {
    const beemRes  = await fetch('https://apisms.beem.africa/v1/send', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify(payload),
    });

    const raw  = await beemRes.text();
    let   data = {};
    try { data = JSON.parse(raw); } catch { data = { raw }; }

    console.log('📩 [SMS] Beem response:', beemRes.status, data);

    if (!beemRes.ok) {
      return res.status(502).json({ success: false, error: `Beem error: ${beemRes.status}`, details: data });
    }
    if (data?.code !== undefined && data.code !== 100) {
      return res.status(502).json({ success: false, error: `Beem code: ${data.code}`, details: data });
    }

    console.log('✅ [SMS] Imetumwa kwa:', dest);
    return res.status(200).json({ success: true, phone: dest, beem: data });

  } catch (err) {
    console.error('❌ [SMS] Network error:', err.message);
    return res.status(500).json({ success: false, error: 'Imeshindwa kuwasiliana na Beem.', details: err.message });
  }
}
