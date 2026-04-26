// Vercel Serverless — Generate & Send OTP via Beem SMS
// OTP stored in-memory (per Vercel instance) — valid for 5 minutes

const otpStore = globalThis.__otpStore || (globalThis.__otpStore = {});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const API_KEY = process.env.BEEM_API_KEY || 'd73c42b7c28a7c3c';
  const SECRET_KEY = process.env.BEEM_SECRET_KEY || 'YzU2NTEwMWY3OGJiNjAxYmZlYWM3Y2UzYTlmNTU5YTEwOTY3MWVmZDcxNmZlMjY4MzYyNTU5MTU0NTIzODUwZQ==';
  const SENDER_ID = process.env.BEEM_SENDER_ID || 'dukalangu';

  const { action, phone, email, code } = req.body;

  // Format phone
  let dest = (phone || '').replace(/\D/g, '');
  if (dest.startsWith('0')) dest = '255' + dest.slice(1);
  if (!dest.startsWith('255')) dest = '255' + dest;

  // ===== SEND OTP =====
  if (action === 'send') {
    if (!dest || dest.length < 12) return res.status(400).json({ error: 'Namba ya simu si sahihi' });

    // Generate 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = email || dest;

    // Store OTP with expiry (5 minutes)
    otpStore[key] = { code: otp, expires: Date.now() + 5 * 60 * 1000, phone: dest };

    // Clean old OTPs
    Object.keys(otpStore).forEach(k => { if (otpStore[k].expires < Date.now()) delete otpStore[k]; });

    const message = `DUKA LANGU\nCode yako: ${otp}\nInaisha dakika 5.\nUsimpe mtu mwingine code hii.`;
    const auth = Buffer.from(`${API_KEY}:${SECRET_KEY}`).toString('base64');

    try {
      const response = await fetch('https://apisms.bfrnd.com/api/send-sms', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_addr: SENDER_ID,
          encoding: 0,
          schedule_time: '',
          message,
          recipients: [{ recipient_id: 1, dest_addr: dest }],
        }),
      });

      const result = await response.json();
      const lastDigits = dest.slice(-4);

      if (!response.ok) {
        return res.status(400).json({ success: false, error: 'SMS haikutumwa. Jaribu tena.', details: result });
      }

      return res.status(200).json({
        success: true,
        message: `Code imetumwa kwa namba inayoishia ${lastDigits}`,
        phone_hint: `***${lastDigits}`,
        expires_in: 300,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ===== VERIFY OTP =====
  if (action === 'verify') {
    if (!code) return res.status(400).json({ success: false, error: 'Ingiza code' });

    const key = email || dest;
    const stored = otpStore[key];

    if (!stored) return res.status(400).json({ success: false, error: 'Code haijapatikana. Tuma upya.' });
    if (Date.now() > stored.expires) {
      delete otpStore[key];
      return res.status(400).json({ success: false, error: 'Code imeisha muda. Tuma mpya.' });
    }
    if (stored.code !== code) return res.status(400).json({ success: false, error: 'Code si sahihi. Jaribu tena.' });

    // Valid — delete OTP
    delete otpStore[key];
    return res.status(200).json({ success: true, message: 'Code sahihi! Karibu.' });
  }

  return res.status(400).json({ error: 'Action: send or verify' });
}
