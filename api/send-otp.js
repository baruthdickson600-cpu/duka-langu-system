import { createClient } from '@supabase/supabase-js';
import https from 'https';

const supabase = createClient(
  'https://snosfxagzglswaotrgzv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub3NmeGFnemdsc3dhb3RyZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDcwMDAsImV4cCI6MjA5MDY4MzAwMH0.qS6lEKGJ6IRganQTcpB1sFtw90XDyK0BMaQKSTVLXKE'
);

function sendBeemSMS(apiKey, secretKey, senderId, phone, message) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(apiKey + ':' + secretKey).toString('base64');
    const body = JSON.stringify({
      source_addr: senderId,
      encoding: 0,
      schedule_time: '',
      message,
      recipients: [{ recipient_id: 1, dest_addr: phone }],
    });

    const options = {
      hostname: 'apisms.bfrnd.com',
      path: '/api/send-sms',
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

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

  let dest = (phone || '').replace(/[^0-9]/g, '');
  if (dest.startsWith('0')) dest = '255' + dest.slice(1);
  if (dest.length > 9 && !dest.startsWith('255')) dest = '255' + dest;
  const key = email || dest;

  // ===== SEND =====
  if (action === 'send') {
    if (!dest || dest.length < 12) return res.status(400).json({ success: false, error: 'Namba si sahihi: ' + dest });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store in Supabase
    await supabase.from('otp_codes').delete().eq('email', key);
    await supabase.from('otp_codes').insert({ email: key, code: otp, phone: dest, expires_at: expiresAt });

    const message = 'DUKA LANGU\nCode yako: ' + otp + '\nInaisha dakika 5.\nUsimpe mtu code hii.';

    try {
      const result = await sendBeemSMS(API_KEY, SECRET_KEY, SENDER_ID, dest, message);
      const lastDigits = dest.slice(-4);

      if (result.status >= 200 && result.status < 300) {
        return res.status(200).json({ success: true, message: 'Code imetumwa kwa ***' + lastDigits, phone_hint: '***' + lastDigits, expires_in: 300 });
      } else {
        return res.status(400).json({ success: false, error: 'Beem imekataa', beem_status: result.status, beem_response: result.data, phone: dest });
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: 'SMS error: ' + err.message, phone: dest });
    }
  }

  // ===== VERIFY =====
  if (action === 'verify') {
    if (!code) return res.status(400).json({ success: false, error: 'Ingiza code' });
    try {
      const { data: otpData } = await supabase.from('otp_codes').select('*').eq('email', key).order('created_at', { ascending: false }).limit(1).single();
      if (!otpData) return res.status(400).json({ success: false, error: 'Code haijapatikana. Tuma upya.' });
      if (new Date() > new Date(otpData.expires_at)) { await supabase.from('otp_codes').delete().eq('id', otpData.id); return res.status(400).json({ success: false, error: 'Code imeisha muda. Tuma mpya.' }); }
      if (otpData.code !== code) return res.status(400).json({ success: false, error: 'Code si sahihi.' });
      await supabase.from('otp_codes').delete().eq('id', otpData.id);
      return res.status(200).json({ success: true, message: 'Karibu!' });
    } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
  }

  return res.status(400).json({ error: 'Action: send or verify' });
}
