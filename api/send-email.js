// Vercel Serverless — Send Email via Gmail SMTP (Nodemailer)
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GMAIL_USER = process.env.GMAIL_USER || 'pesafly1@gmail.com';
  const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
  if (!GMAIL_PASS) return res.status(500).json({ error: 'GMAIL_APP_PASSWORD not set. Go to Vercel → Settings → Environment Variables.' });

  const { to, subject, type, data } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'Missing to/subject' });

  // Brand
  const G = '#0B7A3B', D = '#1E293B', GR = '#64748B';
  const brandName = 'PesaFly / Duka Langu';
  const tagline = 'Together for the better';
  const phone = '0617 288 752';
  const whatsapp = '+255 628 319 789';
  const email = 'pesafly1@gmail.com';

  const wrap = (title, body) => `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif}
  .container{max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
  .header{background:linear-gradient(135deg,${G},#065F2E);padding:28px 32px;text-align:center;color:#fff}
  .header h1{margin:0;font-size:22px;letter-spacing:0.5px}
  .header p{margin:6px 0 0;opacity:0.8;font-size:13px;font-style:italic}
  .body{padding:28px 32px;color:${D};line-height:1.7;font-size:14px}
  .body h2{color:${G};font-size:18px;margin:0 0 16px;border-bottom:2px solid #E2E8F0;padding-bottom:8px}
  .stat-grid{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0}
  .stat{flex:1;min-width:120px;background:#F8FAFC;border-radius:12px;padding:14px;text-align:center;border:1px solid #E2E8F0}
  .stat .label{font-size:11px;color:${GR};text-transform:uppercase;letter-spacing:0.5px;font-weight:600}
  .stat .value{font-size:22px;font-weight:800;margin:4px 0;color:${G}}
  .stat .sub{font-size:11px;color:${GR}}
  .alert{padding:14px 16px;border-radius:10px;margin:12px 0;font-size:13px}
  .alert-danger{background:#FEF2F2;border-left:4px solid #EF4444;color:#B91C1C}
  .alert-warning{background:#FFF7ED;border-left:4px solid #F59E0B;color:#92400E}
  .alert-success{background:#F0FDF4;border-left:4px solid #22C55E;color:#15803D}
  .alert-info{background:#EFF6FF;border-left:4px solid #3B82F6;color:#1E40AF}
  .btn{display:inline-block;padding:12px 28px;background:${G};color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;margin:16px 0}
  .table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
  .table th{background:${G};color:#fff;padding:10px 12px;text-align:left;font-size:12px}
  .table td{padding:10px 12px;border-bottom:1px solid #E2E8F0}
  .table tr:nth-child(even){background:#F8FAFC}
  .up{color:#22C55E}.down{color:#EF4444}
  .footer{background:#F8FAFC;padding:20px 32px;text-align:center;border-top:1px solid #E2E8F0}
  .footer p{margin:4px 0;font-size:12px;color:${GR}}
  .footer a{color:${G};text-decoration:none;font-weight:600}
  .divider{border:none;border-top:1px solid #E2E8F0;margin:16px 0}
</style></head><body>
<div class="container">
  <div class="header"><h1>${brandName}</h1><p>${tagline}</p></div>
  <div class="body"><h2>${title}</h2>${body}</div>
  <div class="footer">
    <p><strong>${brandName}</strong></p>
    <p>📧 <a href="mailto:${email}">${email}</a> | 📞 ${phone}</p>
    <p>WhatsApp: <a href="https://wa.me/255628319789">${whatsapp}</a></p>
    <p style="margin-top:10px;font-size:10px;color:#94A3B8">© 2026 PesaFly Technologies</p>
  </div>
</div></body></html>`;

  const fm = (n) => `TZS ${(+n || 0).toLocaleString()}`;
  const pct = (c, p) => { if (!p) return ''; const ch = Math.round((c - p) / p * 100); return `<span class="${ch >= 0 ? 'up' : 'down'}">${ch >= 0 ? '↑' : '↓'} ${Math.abs(ch)}%</span>`; };

  let html = '';

  try {
    switch (type) {
      case 'daily_report':
        html = wrap(`📊 Ripoti ya Leo — ${data.date || new Date().toLocaleDateString('sw-TZ')}`, `
          <div class="stat-grid">
            <div class="stat"><div class="label">Mauzo</div><div class="value">${fm(data.totalSales)}</div><div class="sub">${data.salesCount || 0} mauzo</div></div>
            <div class="stat"><div class="label">Faida</div><div class="value" style="color:#22C55E">${fm(data.totalProfit)}</div></div>
            <div class="stat"><div class="label">Matumizi</div><div class="value" style="color:#EF4444">${fm(data.totalExpenses)}</div></div>
            <div class="stat"><div class="label">Faida Halisi</div><div class="value">${fm(data.totalProfit - data.totalExpenses)}</div></div>
          </div>
          ${data.topItems ? `<h3 style="font-size:15px;margin:16px 0 8px">🏆 Bidhaa Bora</h3>
          <table class="table"><tr><th>Bidhaa</th><th>Idadi</th></tr>
          ${Object.entries(data.topItems).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,q])=>`<tr><td>${n}</td><td><strong>${q}</strong></td></tr>`).join('')}
          </table>` : ''}
          ${data.lowStock > 0 ? `<div class="alert alert-warning">⚠️ Bidhaa <strong>${data.lowStock}</strong> zinaisha — agiza haraka!</div>` : ''}
          <a href="https://duka-langu-system.vercel.app" class="btn">Fungua Mfumo →</a>
          <hr class="divider"><p style="text-align:center;color:${GR};font-size:12px">Ripoti ya kila siku — saa 8 usiku</p>`);
        break;

      case 'weekly_report':
        html = wrap(`📅 Muhtasari wa Wiki`, `
          <div class="stat-grid">
            <div class="stat"><div class="label">Mauzo</div><div class="value">${fm(data.totalSales)}</div><div class="sub">${pct(data.totalSales, data.prevTotalSales)} vs wiki iliyopita</div></div>
            <div class="stat"><div class="label">Faida</div><div class="value" style="color:#22C55E">${fm(data.totalProfit)}</div><div class="sub">${pct(data.totalProfit, data.prevProfit)}</div></div>
            <div class="stat"><div class="label">Matumizi</div><div class="value" style="color:#EF4444">${fm(data.totalExpenses)}</div></div>
          </div>
          <a href="https://duka-langu-system.vercel.app" class="btn">Angalia Ripoti Kamili →</a>`);
        break;

      case 'monthly_report':
        html = wrap(`📊 Ripoti ya Mwezi`, `
          <div class="stat-grid">
            <div class="stat"><div class="label">Mauzo</div><div class="value">${fm(data.totalSales)}</div></div>
            <div class="stat"><div class="label">Faida</div><div class="value" style="color:#22C55E">${fm(data.totalProfit)}</div></div>
            <div class="stat"><div class="label">Matumizi</div><div class="value" style="color:#EF4444">${fm(data.totalExpenses)}</div></div>
            <div class="stat"><div class="label">Faida Halisi</div><div class="value">${fm(data.netProfit)}</div></div>
          </div>
          <h3 style="font-size:15px;margin:20px 0 10px">📋 P&L Summary</h3>
          <table class="table">
            <tr><td><strong>Mapato</strong></td><td style="text-align:right"><strong>${fm(data.totalSales)}</strong></td></tr>
            <tr><td><strong>Matumizi</strong></td><td style="text-align:right;color:#EF4444">-${fm(data.totalExpenses)}</td></tr>
            <tr style="background:#F0FDF4"><td><strong style="font-size:16px">FAIDA HALISI</strong></td><td style="text-align:right;font-size:18px;font-weight:900;color:${G}">${fm(data.netProfit)}</td></tr>
          </table>
          <a href="https://duka-langu-system.vercel.app" class="btn">Angalia Mfumo →</a>`);
        break;

      case 'low_stock':
        html = wrap('📦 Bidhaa Zinaisha!', `
          <div class="alert alert-danger">⚠️ Bidhaa <strong>${data.count}</strong> ziko chini ya kiwango! Agiza haraka!</div>
          <table class="table"><tr><th>Bidhaa</th><th>Zimebaki</th><th>Minimum</th></tr>
          ${(data.items||[]).map(i=>`<tr><td>📦 ${i.name}</td><td style="color:#EF4444;font-weight:700">${i.quantity}</td><td>${i.min_stock||5}</td></tr>`).join('')}
          </table>
          <a href="https://duka-langu-system.vercel.app" class="btn">Angalia Mfumo →</a>`);
        break;

      case 'overdue_debt':
        html = wrap('🚨 Deni Limechelewa!', `
          <div class="alert alert-danger">Wateja <strong>${data.count}</strong> wana deni limechelewa! Jumla: <strong>${fm(data.total)}</strong></div>
          <table class="table"><tr><th>Mteja</th><th>Simu</th><th>Deni</th><th>Siku</th></tr>
          ${(data.customers||[]).map(c=>`<tr><td>${c.name}</td><td>${c.phone||'-'}</td><td style="color:#EF4444;font-weight:700">${fm(c.balance)}</td><td>${c.daysOverdue}d</td></tr>`).join('')}
          </table>`);
        break;

      case 'payment_received':
        html = wrap('💰 Malipo Yamepokewa!', `
          <div class="alert alert-success">✅ <strong>${data.customerName}</strong> amelipa!</div>
          <div class="stat-grid">
            <div class="stat"><div class="label">Amelipa</div><div class="value" style="color:#22C55E">${fm(data.amount)}</div></div>
            <div class="stat"><div class="label">Deni Baki</div><div class="value" style="color:${(data.remaining||0)>0?'#EF4444':'#22C55E'}">${fm(data.remaining)}</div></div>
          </div>
          <p><strong>Njia:</strong> ${data.method || 'Taslimu'}</p>`);
        break;

      case 'new_customer':
        html = wrap('🆕 Mteja Mpya Amesajiliwa!', `
          <div class="alert alert-success">🎉 Mteja mpya amejisajili kwenye mfumo!</div>
          <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin:12px 0">
            <p style="margin:6px 0">👤 <strong>Jina:</strong> ${data.name}</p>
            ${data.email ? `<p style="margin:6px 0">📧 <strong>Email:</strong> ${data.email}</p>` : ''}
            ${data.phone ? `<p style="margin:6px 0">📱 <strong>Simu:</strong> ${data.phone}</p>` : ''}
            <p style="margin:6px 0">📅 <strong>Tarehe:</strong> ${new Date().toLocaleDateString('sw-TZ')}</p>
          </div>
          <a href="https://duka-langu-system.vercel.app" class="btn">Angalia kwenye Mfumo →</a>`);
        break;

      case 'subscription_expiry':
        html = wrap('⏳ Muda Unakaribia Kuisha!', `
          <div class="alert alert-warning">Muda wako wa mfumo utaisha baada ya siku <strong>${data.daysLeft}</strong>!</div>
          <p>Lipa sasa ili kuendelea kutumia mfumo.</p>
          <div style="background:#FFF7ED;border-radius:12px;padding:16px;margin:16px 0;text-align:center">
            <div style="font-size:13px;color:#92400E">Lipa kupitia</div>
            <div style="font-size:22px;font-weight:800;color:#B45309;margin:6px 0">SELCOM → 6113 4066</div>
            <div style="font-size:14px;color:#92400E">Jina: PESAFLY | Kiasi: <strong>${fm(data.price || 30000)}</strong></div>
          </div>
          <a href="https://duka-langu-system.vercel.app" class="btn">Lipa Sasa →</a>`);
        break;

      case 'welcome':
        html = wrap('🎉 Karibu kwenye Duka Langu!', `
          <p>Habari <strong>${data.name || 'Mteja'}</strong>,</p>
          <p>Asante kwa kujisajili kwenye <strong>Duka Langu — Smart POS</strong>! Mfumo wako uko tayari.</p>
          <div class="alert alert-success">🎁 Umepata <strong>siku 5 za majaribio BURE!</strong></div>
          <h3 style="font-size:15px;margin:20px 0 10px">Jinsi ya Kuanza:</h3>
          <table class="table">
            <tr><td>1️⃣</td><td><strong>Ongeza Bidhaa</strong> — Nenda "Bidhaa" → "Ongeza"</td></tr>
            <tr><td>2️⃣</td><td><strong>Uza</strong> — Nenda "Mauzo" → Chagua bidhaa → "Kamilisha"</td></tr>
            <tr><td>3️⃣</td><td><strong>Ripoti</strong> — Nenda "Ripoti" → Ona faida yako</td></tr>
            <tr><td>4️⃣</td><td><strong>Wafanyakazi</strong> — Wape login yao</td></tr>
          </table>
          <a href="https://duka-langu-system.vercel.app" class="btn">Fungua Mfumo →</a>
          <hr class="divider">
          <p>Msaada? Pigia <strong>${phone}</strong> au WhatsApp <strong>${whatsapp}</strong></p>`);
        break;

      case 'admin_payment':
        html = wrap('💰 MALIPO MAPYA — Thibitisha!', `
          <div class="alert alert-warning">⚡ Mteja amefanya malipo! Thibitisha SASA.</div>
          <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin:16px 0">
            <p style="margin:6px 0">🏪 <strong>Biashara:</strong> ${data.businessName}</p>
            <p style="margin:6px 0">📧 <strong>Email:</strong> ${data.email}</p>
            <p style="margin:6px 0">🔢 <strong>Transaction ID:</strong> <code style="background:#E2E8F0;padding:3px 10px;border-radius:6px;font-weight:800;font-size:16px">${data.transactionId}</code></p>
            <p style="margin:6px 0">💰 <strong>Kiasi:</strong> <span style="font-size:22px;font-weight:900;color:${G}">${fm(data.amount)}</span></p>
            <p style="margin:6px 0">📱 <strong>Njia:</strong> ${data.method || 'SELCOM'}</p>
            <p style="margin:6px 0">📞 <strong>Simu:</strong> ${data.phone || '-'}</p>
          </div>
          <a href="https://duka-langu-system.vercel.app" class="btn" style="font-size:16px;padding:14px 32px">🔓 Fungua Mfumo na Thibitisha →</a>`);
        break;

      case 'promotional':
        html = wrap(data.title || '🎉 Offer Maalum!', `
          <div style="text-align:center;padding:20px 0">
            <div style="font-size:40px;margin-bottom:10px">${data.emoji || '🎉'}</div>
            <h2 style="color:${G};font-size:24px;margin:0">${data.title || 'Offer Maalum!'}</h2>
          </div>
          <div style="background:#F0FDF4;border-radius:12px;padding:20px;margin:16px 0;text-align:center;border:2px dashed ${G}">
            <div style="font-size:16px;color:${D};line-height:1.8">${data.message || ''}</div>
          </div>
          ${data.cta ? `<div style="text-align:center"><a href="https://duka-langu-system.vercel.app" class="btn">${data.cta}</a></div>` : ''}`);
        break;

      default:
        html = wrap(subject, `<p>${data?.message || data?.body || ''}</p>`);
    }

    // Create Gmail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"Duka Langu" <${GMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      html,
    });

    return res.status(200).json({ success: true, id: info.messageId, to });

  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: err.message, hint: err.code === 'EAUTH' ? 'Gmail App Password si sahihi. Tengeneza mpya kwenye myaccount.google.com/apppasswords' : '' });
  }
}
