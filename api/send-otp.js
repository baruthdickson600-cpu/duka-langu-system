// OTP via Beem SMS — stores OTP in Supabase (not memory)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://snosfxagzglswaotrgzv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub3NmeGFnemdsc3dhb3RyZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDcwMDAsImV4cCI6MjA5MDY4MzAwMH0.qS6lEKGJ6IRganQTcpB1sFtw90XDyK0BMaQKSTVLXKE'
);

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

  // Format phone number
  let dest = (phone || '').replace(/[^0-9]/g, '');
  if (dest.startsWith('0')) dest = '255' + dest.slice(1);
  if (dest.length > 9 && !dest.startsWith('255')) dest = '255' + dest;

  const key = email || dest;

  // ===== SEND OTP =====
  if (action === 'send') {
    if (!dest || dest.length < 12) {
      return res.status(400).json({ success: false, error: 'Namba ya simu si sahihi: ' + dest });
    }

    // Generate 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store OTP in Supabase
    try {
      // Delete old OTPs for this user
      await supabase.from('otp_codes').delete().eq('email', key);
      // Insert new OTP
      await supabase.from('otp_codes').insert({ email: key, code: otp, phone: dest, expires_at: expiresAt });
    } catch (e) {
      console.error('OTP store error:', e);
    }

    // Send SMS via Beem
    const message = `DUKA LANGU\nCode yako: ${otp}\nInaisha dakika 5.\nUsimpe mtu code hii.`;
    const auth = Buffer.from(API_KEY + ':' + SECRET_KEY).toString('base64');

    try {
      const response = await fetch('https://apisms.bfrnd.com/api/send-sms', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + auth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_addr: SENDER_ID,
          encoding: 0,
          schedule_time: '',
          message: message,
          recipients: [{ recipient_id: 1, dest_addr: dest }],
        }),
      });

      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch(e) { result = { raw: text }; }

      const lastDigits = dest.slice(-4);

      if (!response.ok) {
        return res.status(400).json({
          success: false,
          error: 'SMS haikutumwa',
          beem_status: response.status,
          beem_response: result,
          phone_sent: dest,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Code imetumwa kwa namba inayoishia ' + lastDigits,
        phone_hint: '***' + lastDigits,
        expires_in: 300,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Beem error: ' + err.message });
    }
  }

  // ===== VERIFY OTP =====
  if (action === 'verify') {
    if (!code) return res.status(400).json({ success: false, error: 'Ingiza code' });

    try {
      // Get OTP from Supabase
      const { data: otpData } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', key)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!otpData) {
        return res.status(400).json({ success: false, error: 'Code haijapatikana. Tuma upya.' });
      }

      // Check expiry
      if (new Date() > new Date(otpData.expires_at)) {
        await supabase.from('otp_codes').delete().eq('id', otpData.id);
        return res.status(400).json({ success: false, error: 'Code imeisha muda. Tuma mpya.' });
      }

      // Check code
      if (otpData.code !== code) {
        return res.status(400).json({ success: false, error: 'Code si sahihi. Jaribu tena.' });
      }

      // Valid — delete OTP
      await supabase.from('otp_codes').delete().eq('id', otpData.id);
      return res.status(200).json({ success: true, message: 'Code sahihi! Karibu.' });

    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(400).json({ error: 'Action: send or verify' });
}
