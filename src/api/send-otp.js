// OTP via SMS (Beem) with Email fallback — Duka Langu
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import https from 'https';

const supabase = createClient(
  'https://snosfxagzglswaotrgzv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub3NmeGFnemdsc3dhb3RyZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDcwMDAsImV4cCI6MjA5MDY4MzAwMH0.qS6lEKGJ6IRganQTcpB1sFtw90XDyK0BMaQKSTVLXKE'
);

// ===== Beem SMS — na retry =====
function sendBeemSMS(phone, message, attempt = 1) {
  const apiKey    = process.env.BEEM_API_KEY    || 'd73c42b7c28a7c3c';
  const secretKey = process.env.BEEM_SECRET_KEY || 'YzU2NTEwMWY3OGJiNjAxYmZlYWM3Y2UzYTlmNTU5YTEwOTY3MWVmZDcxNmZlMjY4MzYyNTU5MTU0NTIzODUwZQ==';
  const senderId  = process.env.BEEM_SENDER_ID  || 'INFO';
  const auth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
  const body = JSON.stringify({
    source_addr: senderId,
    encoding: 0,
    schedule_time: '',
    message,
    recipients: [{ recipient_id: 1, dest_addr: phone }],
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'apisms.beem.africa',
      path: '/v1/send',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Accept': 'application/json',
      },
    }, (r) => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const ok = r.statusCode >= 200 && r.statusCode < 300;
          console.log(`[Beem SMS][attempt ${attempt}] status=${r.statusCode}`, parsed);
          resolve({ ok, status: r.statusCode, data: parsed });
        } catch (e) {
          resolve({ ok: false, status: r.statusCode, data: { raw: data } });
        }
      });
    });
    req.on('error', (e) => {
      console.warn(`[Beem SMS][attempt ${attempt}] Error:`, e.message);
      resolve({ ok: false, error: e.message });
    });
    // Timeout ya sekunde 12 (mara ya kwanza) au 15 (retry)
    req.setTimeout(attempt === 1 ? 12000 : 15000, () => {
      req.destroy();
      resolve({ ok: false, error: 'Timeout' });
    });
    req.write(body);
    req.end();
  });
}

// SMS na retry moja kama imeshindwa
async function sendSMSWithRetry(phone, message) {
  const r1 = await sendBeemSMS(phone, message, 1);
  if (r1.ok) return r1;
  console.warn('[Beem SMS] Attempt 1 failed, retrying in 2s...');
  await new Promise(res => setTimeout(res, 2000));
  const r2 = await sendBeemSMS(phone, message, 2);
  return r2;
}

// Format nambari ya simu → 255XXXXXXXXX
function formatPhone(phone) {
  if (!phone) return null;
  let p = phone.replace(/[^0-9]/g, '');
  if (p.startsWith('0')) p = '255' + p.slice(1);
  if (!p.startsWith('255')) p = '255' + p;
  return p.length >= 12 ? p : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GMAIL_USER = process.env.GMAIL_USER || 'dukalangusalesmanagement@gmail.com';
  const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
  const ADMIN_PHONE = formatPhone(process.env.ADMIN_PHONE || '255628986770');

  const { action, email, code, isAdmin, phone } = req.body;
  if (!email) return res.status(400).json({ error: 'Email inahitajika' });

  const userPhone = formatPhone(phone);

  // ===== TUMA OTP =====
  if (action === 'send') {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // dakika 10

    // Hifadhi kwenye Supabase
    await supabase.from('otp_codes').delete().eq('email', email);
    const { error: dbErr } = await supabase.from('otp_codes').insert({
      email, code: otp, phone: userPhone, expires_at: expiresAt,
    });
    if (dbErr) console.warn('[OTP DB error]', dbErr.message);

    const smsPhone = isAdmin ? ADMIN_PHONE : userPhone;
    const smsMessage = `DUKA LANGU\nCode yako: ${otp}\nInaisha dakika 10.\nUsimpe mtu code hii.`;

    // Jaribu SMS kwanza
    if (smsPhone) {
      try {
        const smsResult = await sendSMSWithRetry(smsPhone, smsMessage);
        if (smsResult.ok) {
          return res.status(200).json({
            success: true,
            message: `Code imetumwa kwa simu ***${smsPhone.slice(-4)}`,
            method: 'sms',
            phone_hint: `***${smsPhone.slice(-4)}`,
            expires_in: 600,
          });
        }
        console.warn('[OTP] SMS imeshindwa kabisa, naenda email:', smsResult);
      } catch (e) {
        console.warn('[OTP] SMS exception:', e.message);
      }
    }

    // EMAIL FALLBACK
    if (!GMAIL_PASS) {
      console.error('[OTP] GMAIL_APP_PASSWORD haijawekwa!');
      return res.status(500).json({ success: false, error: 'Tatizo la mfumo wa kutuma code. Wasiliana na msaada.' });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
        pool: true,
        maxConnections: 3,
      });

      const hint = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

      await transporter.sendMail({
        from: `"Duka Langu Security" <${GMAIL_USER}>`,
        to: email,
        subject: `🔐 Code Yako: ${otp} — Duka Langu`,
        html: `
        <div style="max-width:420px;margin:20px auto;font-family:Arial,sans-serif;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
          <div style="background:linear-gradient(135deg,#0B7A3B,#065F2E);padding:24px;text-align:center;color:#fff">
            <div style="font-size:32px;margin-bottom:8px">🔐</div>
            <h1 style="margin:0;font-size:20px;font-weight:900">Duka Langu</h1>
            <p style="margin:4px 0 0;opacity:0.8;font-size:12px">Uthibitisho wa Kuingia</p>
          </div>
          <div style="padding:32px;text-align:center">
            <p style="color:#64748B;font-size:15px;margin:0 0 20px">Code yako ya kuingia ni:</p>
            <div style="background:#F0FDF4;border:2px dashed #0B7A3B;border-radius:14px;padding:24px;margin:0 auto;max-width:260px">
              <div style="font-size:44px;font-weight:900;letter-spacing:14px;color:#0B7A3B;font-family:monospace">${otp}</div>
            </div>
            <p style="color:#EF4444;font-size:13px;font-weight:700;margin:20px 0 6px">⏳ Inaisha baada ya dakika 10</p>
            <p style="color:#94A3B8;font-size:12px;margin:0">🔒 Usimpe mtu mwingine code hii!</p>
          </div>
          <div style="background:#F8FAFC;padding:14px;text-align:center;font-size:11px;color:#94A3B8;border-top:1px solid #E2E8F0">
            © 2026 PesaFly Technologies — Duka Langu<br>
            Kama hukuomba code hii, puuza email hii.
          </div>
        </div>`,
      });

      return res.status(200).json({
        success: true,
        message: `Code imetumwa kwa email ${hint}. Angalia inbox na spam folder.`,
        method: 'email',
        email_hint: hint,
        expires_in: 600,
      });
    } catch (err) {
      console.error('[OTP Email error]', err.message);
      return res.status(500).json({ success: false, error: `Tatizo la kutuma code: ${err.message}` });
    }
  }

  // ===== THIBITISHA OTP =====
  if (action === 'verify') {
    if (!code) return res.status(400).json({ success: false, error: 'Ingiza code yako' });
    try {
      const { data: otpData, error } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !otpData) return res.status(400).json({ success: false, error: 'Code haijapatikana. Tuma upya.' });

      if (new Date() > new Date(otpData.expires_at)) {
        await supabase.from('otp_codes').delete().eq('id', otpData.id);
        return res.status(400).json({ success: false, error: 'Code imeisha muda. Omba nyingine.' });
      }

      if (otpData.code.trim() !== code.trim()) {
        return res.status(400).json({ success: false, error: 'Code si sahihi. Jaribu tena.' });
      }

      await supabase.from('otp_codes').delete().eq('id', otpData.id);
      return res.status(200).json({ success: true, message: 'Karibu!' });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(400).json({ error: 'action inahitajika: send au verify' });
}
