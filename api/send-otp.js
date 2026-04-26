// OTP via Gmail Email — stores in Supabase
import nodemailer from 'nodemailer';
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

  const GMAIL_USER = process.env.GMAIL_USER || 'pesafly1@gmail.com';
  const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
  if (!GMAIL_PASS) return res.status(500).json({ error: 'GMAIL_APP_PASSWORD not set' });

  const { action, email, code } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // ===== SEND OTP =====
  if (action === 'send') {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store in Supabase
    await supabase.from('otp_codes').delete().eq('email', email);
    await supabase.from('otp_codes').insert({ email, code: otp, expires_at: expiresAt });

    // Send via Gmail
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
        <div style="background:#FEF2F2;border-radius:8px;padding:10px;margin-top:16px;font-size:11px;color:#B91C1C">
          ⚠️ Kama hukuomba code hii, puuza email hii. Mtu anaweza kujaribu kuingia kwenye akaunti yako.
        </div>
      </div>
      <div style="background:#F8FAFC;padding:14px;text-align:center;font-size:11px;color:#94A3B8">
        PesaFly / Duka Langu — Together for the better
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
      return res.status(200).json({ success: true, message: 'Code imetumwa kwa ' + hint, email_hint: hint, expires_in: 300 });
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
      if (new Date() > new Date(otpData.expires_at)) { await supabase.from('otp_codes').delete().eq('id', otpData.id); return res.status(400).json({ success: false, error: 'Code imeisha muda. Tuma mpya.' }); }
      if (otpData.code !== code) return res.status(400).json({ success: false, error: 'Code si sahihi.' });
      await supabase.from('otp_codes').delete().eq('id', otpData.id);
      return res.status(200).json({ success: true, message: 'Karibu!' });
    } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
  }

  return res.status(400).json({ error: 'Action: send or verify' });
}
