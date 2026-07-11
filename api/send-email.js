// ============================================================
// api/send-email.js — Email Sender (Vercel Serverless)
// Real-time: inaitwa moja kwa moja wakati action inatokea
// Provider: nodemailer via SMTP (configurable via env vars)
// ============================================================

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Support MAIL_*, SMTP_*, na GMAIL_* (utangamano wa nyuma)
  const SMTP_HOST = process.env.MAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
  const SMTP_PORT = parseInt(process.env.MAIL_PORT || process.env.SMTP_PORT || '587');
  const SMTP_USER = process.env.MAIL_USER || process.env.SMTP_USER || process.env.GMAIL_USER;
  const SMTP_PASS = process.env.MAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const FROM_EMAIL = process.env.MAIL_FROM || process.env.FROM_EMAIL || SMTP_USER;
  const FROM_NAME  = process.env.FROM_NAME  || 'Duka Langu';

  if (!SMTP_USER || !SMTP_PASS) {
    const missing = [];
    if (!SMTP_USER) missing.push('MAIL_USER');
    if (!SMTP_PASS) missing.push('MAIL_APP_PASSWORD');
    console.error('[Email] Env variables hazipo:', missing.join(', '));
    return res.status(500).json({
      success: false,
      error: 'Huduma ya barua pepe haijawekwa. Wasiliana na msimamizi.',
      missing_env: missing,
    });
  }

  const { to, subject, html, text } = req.body || {};

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({
      success: false,
      error: 'to, subject, na html/text zinahitajika',
    });
  }

  console.log('📧 [Email] Inatuma kwa:', to);

  try {
    const transporter = nodemailer.createTransport({
      host:   SMTP_HOST,
      port:   SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth:   { user: SMTP_USER, pass: SMTP_PASS },
    });

    const info = await transporter.sendMail({
      from:    `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html:    html || undefined,
      text:    text || undefined,
    });

    console.log('✅ [Email] Imetumwa:', info.messageId);
    return res.status(200).json({ success: true, messageId: info.messageId });

  } catch (err) {
    console.error('❌ [Email] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Imeshindwa kutuma email.',
      details: err.message,
    });
  }
}
