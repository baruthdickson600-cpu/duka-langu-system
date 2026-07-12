// ============================================================
// api/send-email.js — Email Sender (Vercel Serverless)
// Real-time: inaitwa moja kwa moja wakati action inatokea
// Provider: nodemailer via SMTP (configurable via env vars)
// ============================================================

import nodemailer from 'nodemailer';

// ============================================================
// TEMPLATE YA BRANDING — DukaLangu
// Email zote zinapitia hapa ili ziwe na muonekano mmoja
// ============================================================
function wrapWithBranding(bodyHTML, subject) {
  const green = '#0B7A3B';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F6F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8;padding:24px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(16,24,40,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#064E2B 0%,${green} 100%);padding:26px 24px;text-align:center;">
            <div style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
              🏪 Duka Langu
            </div>
            <div style="font-size:12.5px;color:rgba(255,255,255,0.85);margin-top:5px;font-weight:500;">
              Smart POS — Simamia Biashara Yako Kidijitali
            </div>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:26px 24px;color:#344054;font-size:14.5px;line-height:1.65;">
            ${bodyHTML}
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 24px 24px;text-align:center;">
            <a href="https://dukalangu.com" style="display:inline-block;padding:13px 32px;background:${green};color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">
              Fungua Mfumo
            </a>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:18px 24px;background:#F9FAFB;border-top:1px solid #F2F4F7;text-align:center;">
            <div style="font-size:12.5px;color:#667085;font-weight:600;margin-bottom:4px;">
              Duka Langu — Together for the better
            </div>
            <div style="font-size:11.5px;color:#98A2B3;">
              📞 +255 617 288 752 &nbsp;•&nbsp; 🌐 dukalangu.com
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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

    // Kama html haina muundo kamili (<html>), iwekee branding ya DukaLangu
    const needsBranding = html && !html.includes('<!DOCTYPE') && !html.includes('<html');
    const finalHTML = needsBranding ? wrapWithBranding(html, subject) : html;

    const info = await transporter.sendMail({
      from:    `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html:    finalHTML || (text ? wrapWithBranding(text.replace(/\n/g, '<br>'), subject) : undefined),
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
