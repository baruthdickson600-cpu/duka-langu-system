// OTP via Email (default) or SMS (admin) — stores in Supabase
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import https from 'https';

const supabase = createClient(
  'https://snosfxagzglswaotrgzv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub3NmeGFnemdsc3dhb3RyZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDcwMDAsImV4cCI6MjA5MDY4MzAwMH0.qS6lEKGJ6IRganQTcpB1sFtw90XDyK0BMaQKSTVLXKE'
);

// Send SMS via Beem using https module - tries multiple endpoints
function sendBeemSMS(phone, message) {
  const apiKey = process.env.BEEM_API_KEY || 'd73c42b7c28a7c3c';
  const secretKey = process.env.BEEM_SECRET_KEY || 'YzU2NTEwMWY3OGJiNjAxYmZlYWM3Y2UzYTlmNTU5YTEwOTY3MWVmZDcxNmZlMjY4MzYyNTU5MTU0NTIzODUwZQ==';
  const senderId = process.env.BEEM_SENDER_ID || 'dukalangu';
  const auth = Buffer.from(apiKey + ':' + secretKey).toString('base64');
  const body = JSON.stringify({
    source_addr: senderId, encoding: 0, schedule_time: '',
    message, recipients: [{ recipient_id: 1, dest_addr: phone }],
  });

  const endpoints = [
    { host: 'apisms.beem.africa', path: '/v1/send' },
    { host: 'apisms.bfrnd.com', path: '/v1/send' },
    { host: 'apisms.bfrnd.com', path: '/api/send-sms' },
  ];

  return new Promise(async (resolve) => {
    for (const ep of endpoints) {
      try {
        const result = await new Promise((res, rej) => {
          const req = https.request({
            hostname: ep.host, path: ep.path, method: 'POST',
            headers: {
              'Authorization': 'Basic ' + auth,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
              'User-Agent': 'Mozilla/5.0 DukaLangu/1.0',
              'Accept': 'application/json',
            },
          }, (r) => {
            let data = '';
            r.on('data', c => data += c);
            r.on('end', () => {
              try { res({ ok: r.statusCode >= 200 && r.statusCode < 300, status: r.statusCode, data: JSON.parse(data) }); }
              catch (e) { res({ ok: r.statusCode >= 200 && r.statusCode < 300, status: r.statusCode, data: { raw: data } }); }
            });
          });
          req.on('error', rej);
          req.setTimeout(20000, () => { req.destroy(); rej(new Error('Timeout')); });
          req.write(body);
          req.end();
        });
        if (result.ok) return resolve(result);
      } catch (e) { /* try next endpoint */ }
    }
    resolve({ ok: false, error: 'All endpoints failed' });
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GMAIL_USER = process.env.GMAIL_USER || 'pesafly1@gmail.com';
  const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;

  const { action, email, code, isAdmin } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Admin phone (hardcoded)
  const ADMIN_PHONE = '255628986770';

  // ===== SEND OTP =====
  if (action === 'send') {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store in Supabase
    await supabase.from('otp_codes').delete().eq('email', email);
    await supabase.from('otp_codes').insert({ email, code: otp, expires_at: expiresAt });

    // ADMIN: Send via SMS (Beem)
    if (isAdmin) {
      const smsMessage = `DUKA LANGU\nAdmin OTP: ${otp}\nInaisha dakika 5.\nUsimpe mtu code hii.`;
      try {
        const smsResult = await sendBeemSMS(ADMIN_PHONE, smsMessage);
        if (smsResult.ok) {
          return res.status(200).json({
            success: true,
            message: 'Code imetumwa kwa SMS namba inayoishia 6770',
            method: 'sms',
            phone_hint: '***6770',
            expires_in: 300,
          });
        }
        // SMS failed → fall back to email
        console.warn('[OTP] SMS failed, falling back to email:', smsResult.data);
      } catch (e) {
        console.warn('[OTP] SMS error, falling back to email:', e.message);
      }
    }

    // EMAIL (for non-admin OR SMS fallback)
    if (!GMAIL_PASS) return res.status(500).json({ success: false, error: 'GMAIL_APP_PASSWORD not set' });
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } });

    const html = `
    <div style="max-width:400px;margin:20px auto;font-family:Arial;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
      <div style="background:linear-gradient(135deg,#0B7A3B,#065F2E);padding:24px;text-align:center;color:#fff">
        <h1 style="margin:0;font-size:20px">🔐 Duka Langu</h1>
        <p style="margin:4px 0 0;opacity:0.8;font-size:12px">One-Time Password</p>
      </div>
      <div style="padding:28px;text-align:center">
        <p style="color:#64748B;font-size:14px;margin:0 0 20px">Code yako ya kuingia ni:</p>
        <div style="background:#F0FDF4;border:2px dashed #0B7A3B;border-radius:14px;padding:20px;margin:0 auto;max-width:250px">
          <div style="font-size:40px;font-weight:900;letter-spacing:12px;color:#0B7A3B;font-family:monospace">${otp}</div>
        </div>
        <p style="color:#EF4444;font-size:13px;font-weight:600;margin:16px 0 6px">⏳ Inaisha baada ya dakika 5</p>
        <p style="color:#94A3B8;font-size:12px;margin:0">Usimpe mtu mwingine code hii!</p>
      </div>
      <div style="background:#F8FAFC;padding:14px;text-align:center;font-size:11px;color:#94A3B8">
        PesaFly / Duka Langu
      </div>
    </div>`;

    try {
      await transporter.sendMail({
        from: '"Duka Langu OTP" <' + GMAIL_USER + '>',
        to: email,
        subject: '🔐 Code Yako: ' + otp + ' — Duka Langu',
        html,
      });

      const hint = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
      return res.status(200).json({ success: true, message: 'Code imetumwa kwa ' + hint, method: 'email', email_hint: hint, expires_in: 300 });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Email error: ' + err.message });
    }
  }

  // ===== VERIFY OTP =====
  if (action === 'verify') {
    if (!code) return res.status(400).json({ success: false, error: 'Ingiza code' });
    try {
      const { data: otpData } = await supabase.from('otp_codes').select('*').eq('email', email).order('created_at', { ascending: false }).limit(1).single();
      if (!otpData) return res.status(400).json({ success: false, error: 'Code haijapatikana. Tuma upya.' });
      if (new Date() > new Date(otpData.expires_at)) {
        await supabase.from('otp_codes').delete().eq('id', otpData.id);
        return res.status(400).json({ success: false, error: 'Code imeisha muda. Tuma mpya.' });
      }
      if (otpData.code !== code) return res.status(400).json({ success: false, error: 'Code si sahihi.' });
      await supabase.from('otp_codes').delete().eq('id', otpData.id);
      return res.status(200).json({ success: true, message: 'Karibu!' });
    } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
  }

  return res.status(400).json({ error: 'Action: send or verify' });
}
