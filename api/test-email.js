import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const GMAIL_USER = process.env.MAIL_USER || process.env.GMAIL_USER || 'pesafly1@gmail.com';
  const GMAIL_PASS = process.env.MAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD;

  if (!GMAIL_PASS) return res.status(500).json({
    success: false,
    error: 'GMAIL_APP_PASSWORD haijawekwa!',
    fix: 'Nenda Vercel → Settings → Environment Variables → Ongeza GMAIL_APP_PASSWORD',
    steps: [
      '1. Fungua myaccount.google.com/security',
      '2. Washa 2-Step Verification (kama haujawasha)',
      '3. Nenda myaccount.google.com/apppasswords',
      '4. Chagua "Mail" na "Other" → andika "Duka Langu"',
      '5. Copy password ya herufi 16 (mf: abcd efgh ijkl mnop)',
      '6. Nenda Vercel → Settings → Environment Variables',
      '7. Ongeza: GMAIL_APP_PASSWORD = abcdefghijklmnop (bila nafasi)',
      '8. Redeploy mfumo'
    ]
  });

  const to = req.query.to || req.body?.to || GMAIL_USER;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    const info = await transporter.sendMail({
      from: `"Duka Langu" <${GMAIL_USER}>`,
      to,
      subject: '✅ TEST — Duka Langu Email Inafanya Kazi!',
      html: `
        <div style="max-width:500px;margin:20px auto;font-family:Arial;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
          <div style="background:linear-gradient(135deg,#0B7A3B,#065F2E);padding:24px;text-align:center;color:#fff">
            <h1 style="margin:0;font-size:20px">PesaFly / Duka Langu</h1>
            <p style="margin:4px 0 0;opacity:0.8;font-size:12px">Email System Test</p>
          </div>
          <div style="padding:24px;text-align:center">
            <div style="font-size:48px;margin-bottom:12px">✅</div>
            <h2 style="color:#0B7A3B;margin:0 0 8px">Email Inafanya Kazi!</h2>
            <p style="color:#64748B;font-size:14px">Mfumo wa email umefanikiwa. Email zinatumwa kupitia Gmail.</p>
            <p style="color:#64748B;font-size:12px;margin-top:16px">Sent to: <strong>${to}</strong></p>
            <p style="color:#94A3B8;font-size:11px">Time: ${new Date().toLocaleString()}</p>
            <div style="background:#F0FDF4;border-radius:10px;padding:12px;margin-top:16px;font-size:12px;color:#15803D">
              <strong>Email types:</strong> Welcome, Daily Report, Weekly Report, Monthly Report, Low Stock, Overdue Debt, Payment Received, Subscription Expiry, New Customer, Admin Payment Alert, Promotional
            </div>
          </div>
          <div style="background:#F8FAFC;padding:14px;text-align:center;font-size:11px;color:#94A3B8">
            © 2026 PesaFly / Duka Langu
          </div>
        </div>`,
    });

    return res.status(200).json({
      success: true,
      id: info.messageId,
      sent_to: to,
      message: `Email imetumwa kwa ${to}! Angalia inbox (na spam folder).`,
      method: 'Gmail SMTP'
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      hint: err.code === 'EAUTH' ? 'App Password si sahihi. Tengeneza mpya: myaccount.google.com/apppasswords' :
            err.code === 'ESOCKET' ? 'Tatizo la mtandao. Jaribu tena.' :
            'Angalia Gmail settings na App Password'
    });
  }
}
