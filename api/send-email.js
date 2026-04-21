// Vercel Serverless Function — Send Email via Resend
// Endpoint: POST /api/send-email

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const API_KEY = process.env.RESEND_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not set' });

  const { to, subject, type, data } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'Missing to/subject' });

  // Brand colors & config
  const G = '#0B7A3B', D = '#1E293B', GR = '#64748B';
  const brandName = 'PesaFly / Duka Langu';
  const tagline = 'Together for the better';
  const phone = '0617 288 752';
  const whatsapp = '+255 628 319 789';
  const email = 'pesafly1@gmail.com';

  // Email wrapper template
  const wrap = (title, body) => `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
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
  .comparison{display:flex;align-items:center;gap:4px;font-weight:700}
  .up{color:#22C55E}
  .down{color:#EF4444}
  .footer{background:#F8FAFC;padding:20px 32px;text-align:center;border-top:1px solid #E2E8F0}
  .footer p{margin:4px 0;font-size:12px;color:${GR}}
  .footer a{color:${G};text-decoration:none;font-weight:600}
  .divider{border:none;border-top:1px solid #E2E8F0;margin:16px 0}
</style></head><body>
<div class="container">
  <div class="header">
    <h1>${brandName}</h1>
    <p>${tagline}</p>
  </div>
  <div class="body">
    <h2>${title}</h2>
    ${body}
  </div>
  <div class="footer">
    <p><strong>${brandName}</strong></p>
    <p>📧 <a href="mailto:${email}">${email}</a> | 📞 ${phone}</p>
    <p>WhatsApp: <a href="https://wa.me/255628319789">${whatsapp}</a></p>
    <p style="margin-top:10px;font-size:10px;color:#94A3B8">Hukutuma email hii? Puuza tu.</p>
  </div>
</div></body></html>`;

  // Format money
  const fm = (n) => `TZS ${(+n || 0).toLocaleString()}`;
  const pct = (current, prev) => {
    if (!prev) return '';
    const change = Math.round((current - prev) / prev * 100);
    return `<span class="${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '↑' : '↓'} ${Math.abs(change)}%</span>`;
  };

  let html = '';

  try {
    switch (type) {
      // ===== 1. DAILY REPORT =====
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
          <hr class="divider">
          <p style="text-align:center;color:${GR};font-size:12px">Ripoti hii inatumwa kila siku saa 8:00 usiku</p>
        `);
        break;

      // ===== 2. WEEKLY REPORT =====
      case 'weekly_report':
        html = wrap(`📅 Muhtasari wa Wiki — ${new Date().toLocaleDateString('sw-TZ')}`, `
          <div class="stat-grid">
            <div class="stat"><div class="label">Mauzo</div><div class="value">${fm(data.totalSales)}</div><div class="sub">${pct(data.totalSales, data.prevTotalSales)} vs wiki iliyopita</div></div>
            <div class="stat"><div class="label">Faida</div><div class="value" style="color:#22C55E">${fm(data.totalProfit)}</div><div class="sub">${pct(data.totalProfit, data.prevProfit)}</div></div>
            <div class="stat"><div class="label">Matumizi</div><div class="value" style="color:#EF4444">${fm(data.totalExpenses)}</div></div>
            <div class="stat"><div class="label">Faida Halisi</div><div class="value">${fm(data.netProfit)}</div></div>
          </div>
          ${data.salesChange > 0 ? `<div class="alert alert-success">📈 Mauzo yamekua <strong>${data.salesChange}%</strong> kuliko wiki iliyopita!</div>` :
            data.salesChange < 0 ? `<div class="alert alert-warning">📉 Mauzo yameshuka <strong>${Math.abs(data.salesChange)}%</strong> — angalia sababu.</div>` : ''}
          ${data.topItems?.length ? `<h3 style="font-size:15px;margin:16px 0 8px">🏆 Bidhaa Bora za Wiki</h3>
          <table class="table"><tr><th>Bidhaa</th><th>Idadi</th></tr>
          ${data.topItems.map(([n,q])=>`<tr><td>${n}</td><td><strong>${q}</strong></td></tr>`).join('')}
          </table>` : ''}
          <div style="margin:16px 0"><strong>📊 Takwimu:</strong> Mauzo ${data.salesCount || 0} | Wateja wapya ${data.newCustomers || 0}</div>
          <hr class="divider">
          <p style="text-align:center;color:${GR};font-size:12px">Muhtasari wa kila Jumapili saa 8:00 asubuhi</p>
        `);
        break;

      // ===== 3. MONTHLY REPORT =====
      case 'monthly_report':
        html = wrap(`📊 Ripoti ya Mwezi — ${new Date().toLocaleDateString('sw-TZ', {month:'long', year:'numeric'})}`, `
          <div class="stat-grid">
            <div class="stat"><div class="label">Mauzo Jumla</div><div class="value">${fm(data.totalSales)}</div><div class="sub">${pct(data.totalSales, data.prevSales)} vs mwezi uliopita</div></div>
            <div class="stat"><div class="label">Faida</div><div class="value" style="color:#22C55E">${fm(data.totalProfit)}</div><div class="sub">${pct(data.totalProfit, data.prevProfit)}</div></div>
            <div class="stat"><div class="label">Matumizi</div><div class="value" style="color:#EF4444">${fm(data.totalExpenses)}</div><div class="sub">${pct(data.totalExpenses, data.prevExpenses)}</div></div>
            <div class="stat"><div class="label">Faida Halisi</div><div class="value">${fm(data.netProfit)}</div></div>
          </div>
          <h3 style="font-size:15px;margin:20px 0 10px">📋 Profit & Loss (P&L)</h3>
          <table class="table">
            <tr><td><strong>Mapato (Mauzo)</strong></td><td style="text-align:right"><strong>${fm(data.totalSales)}</strong></td></tr>
            <tr><td>Mauzo mwezi uliopita</td><td style="text-align:right;color:${GR}">${fm(data.prevSales)}</td></tr>
            <tr><td><strong>Matumizi</strong></td><td style="text-align:right;color:#EF4444"><strong>-${fm(data.totalExpenses)}</strong></td></tr>
            <tr><td>Matumizi mwezi uliopita</td><td style="text-align:right;color:${GR}">-${fm(data.prevExpenses)}</td></tr>
            <tr style="background:#F0FDF4"><td><strong style="font-size:16px">FAIDA HALISI</strong></td><td style="text-align:right;font-size:18px;font-weight:900;color:${G}"><strong>${fm(data.netProfit)}</strong></td></tr>
          </table>
          <div class="stat-grid">
            <div class="stat"><div class="label">Mauzo</div><div class="value">${data.salesCount || 0}</div></div>
            <div class="stat"><div class="label">Wateja Wapya</div><div class="value">${data.newCustomers || 0}</div></div>
            <div class="stat"><div class="label">Deni Jumla</div><div class="value" style="color:#EF4444">${fm(data.totalDebt)}</div></div>
            <div class="stat"><div class="label">Thamani Stock</div><div class="value">${fm(data.inventoryValue)}</div></div>
          </div>
          <hr class="divider">
          <p style="text-align:center;color:${GR};font-size:12px">Ripoti ya kila mwezi — tarehe 1</p>
        `);
        break;

      // ===== 4. LOW STOCK ALERT =====
      case 'low_stock':
        html = wrap('📦 Bidhaa Zinaisha!', `
          <div class="alert alert-danger">⚠️ Bidhaa <strong>${data.count}</strong> ziko chini ya kiwango cha minimum. Agiza haraka!</div>
          <table class="table"><tr><th>Bidhaa</th><th>Zimebaki</th><th>Minimum</th></tr>
          ${(data.items||[]).map(i=>`<tr><td>${i.image||'📦'} ${i.name}</td><td style="color:#EF4444;font-weight:700">${i.quantity}</td><td>${i.min_stock||5}</td></tr>`).join('')}
          </table>
          <a href="https://duka-langu-system.vercel.app" class="btn">Angalia Mfumo →</a>
        `);
        break;

      // ===== 5. OVERDUE DEBT =====
      case 'overdue_debt':
        html = wrap('🚨 Deni Limechelewa!', `
          <div class="alert alert-danger">Wateja <strong>${data.count}</strong> wana deni limechelewa! Jumla: <strong>${fm(data.total)}</strong></div>
          <table class="table"><tr><th>Mteja</th><th>Deni</th><th>Siku</th></tr>
          ${(data.customers||[]).map(c=>`<tr><td>${c.name}<br><small style="color:${GR}">${c.phone||''}</small></td><td style="color:#EF4444;font-weight:700">${fm(c.balance)}</td><td>${c.daysOverdue} siku</td></tr>`).join('')}
          </table>
          <p>Wasiliana nao kupitia WhatsApp au simu kukumbusha kulipa.</p>
        `);
        break;

      // ===== 6. PAYMENT RECEIVED =====
      case 'payment_received':
        html = wrap('💰 Malipo Yamepokewa!', `
          <div class="alert alert-success">✅ <strong>${data.customerName}</strong> amelipa deni!</div>
          <div class="stat-grid">
            <div class="stat"><div class="label">Amelipa</div><div class="value" style="color:#22C55E">${fm(data.amount)}</div></div>
            <div class="stat"><div class="label">Deni Baki</div><div class="value" style="color:${(data.remaining||0)>0?'#EF4444':'#22C55E'}">${fm(data.remaining)}</div></div>
          </div>
          <p><strong>Njia:</strong> ${data.method || 'Taslimu'}</p>
          ${data.note ? `<p><strong>Maelezo:</strong> ${data.note}</p>` : ''}
        `);
        break;

      // ===== 7. NEW CUSTOMER =====
      case 'new_customer':
        html = wrap('🆕 Mteja Mpya!', `
          <div class="alert alert-success">Mteja mpya amesajiliwa kwenye mfumo!</div>
          <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin:12px 0">
            <p style="margin:4px 0"><strong>Jina:</strong> ${data.name}</p>
            ${data.email ? `<p style="margin:4px 0"><strong>Email:</strong> ${data.email}</p>` : ''}
            ${data.phone ? `<p style="margin:4px 0"><strong>Simu:</strong> ${data.phone}</p>` : ''}
            <p style="margin:4px 0"><strong>Tarehe:</strong> ${new Date().toLocaleDateString('sw-TZ')}</p>
          </div>
        `);
        break;

      // ===== 8. SUBSCRIPTION EXPIRY =====
      case 'subscription_expiry':
        html = wrap('⏳ Muda Unakaribia Kuisha!', `
          <div class="alert alert-warning">Muda wako wa mfumo utaisha baada ya siku <strong>${data.daysLeft}</strong>!</div>
          <p>Lipa sasa ili kuendelea kutumia mfumo bila kukatizwa.</p>
          <div style="background:#FFF7ED;border-radius:12px;padding:16px;margin:16px 0;text-align:center">
            <div style="font-size:13px;color:#92400E">Lipa kupitia</div>
            <div style="font-size:20px;font-weight:800;color:#B45309;margin:6px 0">SELCOM → 6113 4066</div>
            <div style="font-size:14px;color:#92400E">Jina: PESAFLY</div>
            <div style="font-size:14px;color:#92400E;margin-top:4px">Kiasi: <strong>${fm(data.price || 30000)}</strong></div>
          </div>
          <a href="https://duka-langu-system.vercel.app" class="btn">Lipa Sasa →</a>
        `);
        break;

      // ===== 9. WELCOME EMAIL =====
      case 'welcome':
        html = wrap('🎉 Karibu kwenye Duka Langu!', `
          <p>Habari <strong>${data.name || 'Mteja'}</strong>,</p>
          <p>Asante kwa kujisajili kwenye <strong>Duka Langu — Smart POS</strong>! Mfumo wako uko tayari kutumika.</p>
          <div class="alert alert-success">🎁 Umepata <strong>siku 5 za majaribio BURE!</strong> Tumia mfumo wote bila malipo.</div>
          <h3 style="font-size:15px;margin:20px 0 10px">Jinsi ya Kuanza:</h3>
          <table class="table">
            <tr><td>1️⃣</td><td><strong>Ongeza Bidhaa</strong> — Nenda "Bidhaa" → "Ongeza" → Weka jina, bei, na stock</td></tr>
            <tr><td>2️⃣</td><td><strong>Uza Bidhaa</strong> — Nenda "Mauzo" → Chagua bidhaa → "Kamilisha Mauzo"</td></tr>
            <tr><td>3️⃣</td><td><strong>Angalia Ripoti</strong> — Nenda "Ripoti" → Ona mauzo, faida, na matumizi</td></tr>
            <tr><td>4️⃣</td><td><strong>Ongeza Wafanyakazi</strong> — Nenda "Wafanyakazi" → Wape login yao</td></tr>
          </table>
          <a href="https://duka-langu-system.vercel.app" class="btn">Fungua Mfumo →</a>
          <hr class="divider">
          <p>Unahitaji msaada? Tupigie <strong>${phone}</strong> au WhatsApp <strong>${whatsapp}</strong></p>
        `);
        break;

      // ===== 10. PROMOTIONAL =====
      case 'promotional':
        html = wrap(data.title || '🎉 Offer Maalum!', `
          <div style="text-align:center;padding:20px 0">
            <div style="font-size:40px;margin-bottom:10px">${data.emoji || '🎉'}</div>
            <h2 style="color:${G};font-size:24px;margin:0">${data.title || 'Offer Maalum!'}</h2>
          </div>
          <div style="background:#F0FDF4;border-radius:12px;padding:20px;margin:16px 0;text-align:center;border:2px dashed ${G}">
            <div style="font-size:16px;color:${D};line-height:1.8">${data.message || ''}</div>
          </div>
          ${data.cta ? `<div style="text-align:center"><a href="https://duka-langu-system.vercel.app" class="btn">${data.cta}</a></div>` : ''}
          <hr class="divider">
          <p style="text-align:center;font-size:11px;color:#94A3B8">Hutaki kupokea tena? Jibu email hii na andika "STOP"</p>
        `);
        break;

      // ===== 11. ADMIN PAYMENT ALERT =====
      case 'admin_payment':
        html = wrap('💰 MALIPO MAPYA — Thibitisha!', `
          <div class="alert alert-warning">Mteja amefanya malipo! Thibitisha SASA.</div>
          <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin:16px 0">
            <p style="margin:6px 0"><strong>Biashara:</strong> ${data.businessName}</p>
            <p style="margin:6px 0"><strong>Email:</strong> ${data.email}</p>
            <p style="margin:6px 0"><strong>Transaction ID:</strong> <code style="background:#E2E8F0;padding:2px 8px;border-radius:4px;font-weight:700">${data.transactionId}</code></p>
            <p style="margin:6px 0"><strong>Kiasi:</strong> <span style="font-size:20px;font-weight:900;color:${G}">${fm(data.amount)}</span></p>
            <p style="margin:6px 0"><strong>Njia:</strong> ${data.method || 'SELCOM'}</p>
            <p style="margin:6px 0"><strong>Simu:</strong> ${data.phone || '-'}</p>
          </div>
          <a href="https://duka-langu-system.vercel.app" class="btn">Fungua Mfumo na Thibitisha →</a>
        `);
        break;

      default:
        // Generic email
        html = wrap(subject, `<p>${data?.message || data?.body || ''}</p>`);
    }

    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Duka Langu <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    const result = await response.json();
    if (!response.ok) return res.status(400).json({ error: result.message || 'Send failed', details: result });
    return res.status(200).json({ success: true, id: result.id });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
