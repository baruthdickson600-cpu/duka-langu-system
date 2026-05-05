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
  body{margin:0;padding:0;background:#F8FAFC;font-family:'Inter','Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased}
  .wrapper{padding:24px 12px}
  .container{max-width:640px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(11,122,59,0.08),0 4px 12px rgba(0,0,0,0.04)}
  .header{background:linear-gradient(135deg,${G} 0%,#065F2E 60%,#054526 100%);padding:36px 32px;text-align:center;color:#fff;position:relative}
  .header::before{content:'';position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.06)}
  .header::after{content:'';position:absolute;bottom:-40px;left:-40px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,0.04)}
  .logo{display:inline-block;width:60px;height:60px;background:rgba(255,255,255,0.15);border-radius:18px;margin-bottom:12px;line-height:60px;font-size:28px;backdrop-filter:blur(10px);position:relative}
  .header h1{margin:0;font-size:24px;letter-spacing:0.3px;font-weight:800;position:relative}
  .header p{margin:8px 0 0;opacity:0.85;font-size:13px;letter-spacing:0.5px;position:relative;font-weight:500}
  .body{padding:32px 28px;color:${D};line-height:1.7;font-size:14px}
  .body h2{color:${G};font-size:20px;margin:0 0 18px;font-weight:800;letter-spacing:-0.2px}
  .body h2::after{content:'';display:block;width:50px;height:3px;background:linear-gradient(90deg,${G},#22C55E);border-radius:2px;margin-top:8px}
  .stat-grid{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}
  .stat{flex:1;min-width:130px;background:linear-gradient(135deg,#F8FAFC,#F1F5F9);border-radius:14px;padding:16px 14px;text-align:center;border:1px solid #E2E8F0;transition:transform 0.2s}
  .stat .label{font-size:10px;color:${GR};text-transform:uppercase;letter-spacing:0.8px;font-weight:700;margin-bottom:6px}
  .stat .value{font-size:26px;font-weight:900;margin:2px 0;color:${G};letter-spacing:-0.5px}
  .stat .sub{font-size:10px;color:${GR};font-weight:500}
  .hero-stat{background:linear-gradient(135deg,${G},#065F2E);color:#fff;border-radius:18px;padding:24px;margin:18px 0;text-align:center;box-shadow:0 8px 25px rgba(11,122,59,0.25)}
  .hero-stat .label{font-size:11px;opacity:0.85;text-transform:uppercase;letter-spacing:1.2px;font-weight:700;margin-bottom:6px}
  .hero-stat .value{font-size:36px;font-weight:900;letter-spacing:-1px}
  .hero-stat .sub{font-size:12px;opacity:0.85;margin-top:4px}
  .alert{padding:14px 18px;border-radius:12px;margin:12px 0;font-size:13px;display:flex;gap:10px;align-items:flex-start}
  .alert-danger{background:linear-gradient(135deg,#FEF2F2,#FEE2E2);border-left:4px solid #EF4444;color:#B91C1C}
  .alert-warning{background:linear-gradient(135deg,#FFF7ED,#FFEDD5);border-left:4px solid #F59E0B;color:#92400E}
  .alert-success{background:linear-gradient(135deg,#F0FDF4,#DCFCE7);border-left:4px solid #22C55E;color:#15803D}
  .alert-info{background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border-left:4px solid #3B82F6;color:#1E40AF}
  .alert-icon{font-size:18px;flex-shrink:0}
  .btn{display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${G},#065F2E);color:#fff;text-decoration:none;border-radius:12px;font-weight:800;font-size:14px;margin:18px 0;box-shadow:0 6px 18px rgba(11,122,59,0.25);letter-spacing:0.3px}
  .btn:hover{box-shadow:0 8px 22px rgba(11,122,59,0.35)}
  .table{width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0}
  .table th{background:linear-gradient(135deg,${G},#065F2E);color:#fff;padding:12px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700}
  .table td{padding:12px 14px;border-bottom:1px solid #F1F5F9}
  .table tr:nth-child(even){background:#FAFBFC}
  .table tr:last-child td{border-bottom:none}
  .table tr:hover{background:#F0FDF4}
  .up{color:#22C55E;font-weight:700}.down{color:#EF4444;font-weight:700}
  .section-title{font-size:15px;margin:24px 0 10px;font-weight:800;display:flex;align-items:center;gap:8px;color:${D}}
  .footer{background:linear-gradient(180deg,#F8FAFC,#F1F5F9);padding:24px 32px;text-align:center;border-top:1px solid #E2E8F0}
  .footer p{margin:4px 0;font-size:12px;color:${GR}}
  .footer a{color:${G};text-decoration:none;font-weight:700}
  .footer .brand{font-size:14px;font-weight:800;color:${G};margin-bottom:8px}
  .footer .contacts{display:inline-flex;gap:14px;margin:8px 0;flex-wrap:wrap;justify-content:center}
  .divider{border:none;border-top:1px dashed #CBD5E1;margin:18px 0}
  .badge{display:inline-block;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px}
  .badge-green{background:#DCFCE7;color:#15803D}
  .badge-yellow{background:#FEF3C7;color:#92400E}
  .badge-red{background:#FEE2E2;color:#B91C1C}
  .badge-purple{background:#EDE9FE;color:#5B21B6}
  @media(max-width:600px){
    .body{padding:24px 18px}
    .header{padding:28px 20px}
    .stat{min-width:100%}
    .table{font-size:11px}
    .table th,.table td{padding:8px 10px}
  }
</style></head><body>
<div class="wrapper">
<div class="container">
  <div class="header">
    <div class="logo">📊</div>
    <h1>${brandName}</h1>
    <p>${tagline}</p>
  </div>
  <div class="body"><h2>${title}</h2>${body}</div>
  <div class="footer">
    <div class="brand">${brandName}</div>
    <div class="contacts">
      <span>📧 <a href="mailto:${email}">${email}</a></span>
      <span>📞 ${phone}</span>
    </div>
    <p>💬 WhatsApp: <a href="https://wa.me/255628319789">${whatsapp}</a></p>
    <p style="margin-top:12px;font-size:10px;color:#94A3B8">© 2026 PesaFly Technologies • Tanzania 🇹🇿</p>
  </div>
</div>
</div></body></html>`;

  const fm = (n) => `TZS ${(+n || 0).toLocaleString()}`;
  const pct = (c, p) => { if (!p) return ''; const ch = Math.round((c - p) / p * 100); return `<span class="${ch >= 0 ? 'up' : 'down'}">${ch >= 0 ? '↑' : '↓'} ${Math.abs(ch)}%</span>`; };

  let html = '';

  try {
    switch (type) {
      case 'admin_daily_report':
        html = wrap(`📊 Ripoti ya Asubuhi — ${data.date || new Date().toLocaleDateString('sw-TZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}`, `
          <!-- HERO REVENUE -->
          <div class="hero-stat">
            <div class="label">💰 MAPATO JUMLA</div>
            <div class="value">${fm(data.totalRevenue)}</div>
            <div class="sub">Mwezi huu: ${fm(data.monthRevenue)}</div>
          </div>

          <!-- 4 KEY STATS -->
          <div class="stat-grid">
            <div class="stat"><div class="label">Maduka</div><div class="value">${data.totalBiz||0}</div><div class="sub">jumla</div></div>
            <div class="stat"><div class="label">Active</div><div class="value" style="color:#22C55E">${data.activeBiz||0}</div><div class="sub">wanaolipa</div></div>
            <div class="stat"><div class="label">Trial</div><div class="value" style="color:#F59E0B">${data.trialBiz||0}</div><div class="sub">wanajaribu</div></div>
            <div class="stat"><div class="label">Suspended</div><div class="value" style="color:#EF4444">${data.suspendedBiz||0}</div><div class="sub">wamefungwa</div></div>
          </div>

          <div class="stat-grid">
            <div class="stat"><div class="label">Conversion</div><div class="value" style="color:#8B5CF6">${data.convRate||0}%</div><div class="sub">trial → paid</div></div>
            <div class="stat"><div class="label">Mawakala</div><div class="value">${data.agentCount||0}</div><div class="sub">washirika</div></div>
            <div class="stat"><div class="label">Wapya Leo</div><div class="value" style="color:#22C55E">${data.newToday||0}</div><div class="sub">wateja</div></div>
            <div class="stat"><div class="label">Pending</div><div class="value" style="color:#F59E0B">${data.pendingPayments||0}</div><div class="sub">malipo</div></div>
          </div>

          ${data.newToday>0?`<div class="alert alert-success"><span class="alert-icon">🆕</span><div><strong>Wateja Wapya:</strong> ${data.newToday} wamejiunga leo!</div></div>`:''}
          ${data.pendingPayments>0?`<div class="alert alert-danger"><span class="alert-icon">💰</span><div><strong>Malipo Yanasubiri:</strong> ${data.pendingPayments} yanahitaji uthibitisho. <a href="https://duka-langu-system.vercel.app" style="color:#B91C1C;font-weight:700;text-decoration:underline">Thibitisha sasa →</a></div></div>`:''}
          ${data.expiringSoon>0?`<div class="alert alert-warning"><span class="alert-icon">⏳</span><div><strong>Muda Unaisha:</strong> Wateja ${data.expiringSoon} muda unaisha ndani ya siku 5. Kumbushe walipe!</div></div>`:''}

          <!-- NEW CUSTOMERS TODAY -->
          ${(data.newCustomers||[]).length>0?`
          <div class="section-title"><span style="color:#22C55E">🆕</span> Wateja Wapya wa Leo</div>
          <table class="table"><tr><th>Jina</th><th>Email</th><th>Simu</th></tr>
          ${data.newCustomers.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.email}</td><td>${c.phone||'-'}</td></tr>`).join('')}</table>`:''}

          <!-- ACTIVE CUSTOMERS -->
          ${(data.activeList||[]).length>0?`
          <div class="section-title"><span class="badge badge-green">Active</span> Wateja Wanaolipa (${data.activeBiz})</div>
          <table class="table"><tr><th>Jina</th><th>Email</th><th>Simu</th><th>Plan</th><th>Siku</th></tr>
          ${data.activeList.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.email}</td><td>${c.phone}</td><td><span class="badge badge-purple">${c.plan}</span></td><td style="color:${c.daysLeft<=5?'#EF4444':'#22C55E'};font-weight:800">${c.daysLeft}</td></tr>`).join('')}</table>`:''}

          <!-- TRIAL -->
          ${(data.trialList||[]).length>0?`
          <div class="section-title"><span class="badge badge-yellow">Trial</span> Wanaojaribu (${data.trialBiz})</div>
          <table class="table"><tr><th>Jina</th><th>Email</th><th>Simu</th><th>Siku Zimebaki</th></tr>
          ${data.trialList.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.email}</td><td>${c.phone}</td><td style="color:${c.daysLeft<=2?'#EF4444':'#F59E0B'};font-weight:800">${c.daysLeft} siku</td></tr>`).join('')}</table>`:''}

          <!-- EXPIRING -->
          ${(data.expiringList||[]).length>0?`
          <div class="section-title"><span class="badge badge-red">⚠️ Muda</span> Wanaoisha Muda (Siku 5)</div>
          <table class="table"><tr><th>Jina</th><th>Email</th><th>Simu</th><th>Siku</th></tr>
          ${data.expiringList.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.email}</td><td>${c.phone}</td><td style="color:#EF4444;font-weight:900;font-size:18px">${c.daysLeft}</td></tr>`).join('')}</table>`:''}

          <!-- SUSPENDED -->
          ${(data.suspendedList||[]).length>0?`
          <div class="section-title"><span class="badge badge-red">🔒</span> Wamefungwa (${data.suspendedBiz})</div>
          <table class="table"><tr><th>Jina</th><th>Email</th><th>Simu</th></tr>
          ${data.suspendedList.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.email}</td><td>${c.phone}</td></tr>`).join('')}</table>`:''}

          <div style="text-align:center;margin-top:24px">
            <a href="https://duka-langu-system.vercel.app" class="btn">📊 Fungua Mfumo</a>
          </div>
          <hr class="divider">
          <p style="text-align:center;color:${GR};font-size:12px;line-height:1.6">📅 Ripoti ya kila siku — saa 2:00 asubuhi<br><strong>${data.totalBiz}</strong> wateja • <strong>${data.activeBiz}</strong> active • <strong>${fm(data.totalRevenue)}</strong> mapato</p>`);
        break;

      case 'daily_report':
        html = wrap(`📊 Ripoti ya Asubuhi — ${data.date || new Date().toLocaleDateString('sw-TZ')}`, `
          ${data.totalBiz !== undefined ? `
          <h3 style="font-size:15px;margin:0 0 12px;color:#1E40AF">📋 Hali ya Wateja</h3>
          <div class="stat-grid">
            <div class="stat"><div class="label">Jumla</div><div class="value">${data.totalBiz || 0}</div><div class="sub">maduka yote</div></div>
            <div class="stat"><div class="label">Active</div><div class="value" style="color:#22C55E">${data.activeBiz || 0}</div><div class="sub">wanaolipa</div></div>
            <div class="stat"><div class="label">Trial</div><div class="value" style="color:#F59E0B">${data.trialBiz || 0}</div><div class="sub">wanajaribu</div></div>
            <div class="stat"><div class="label">Suspended</div><div class="value" style="color:#EF4444">${data.suspendedBiz || 0}</div><div class="sub">wamefungwa</div></div>
          </div>
          ${data.newToday > 0 ? `<div class="alert alert-success">🆕 Wateja wapya <strong>${data.newToday}</strong> leo!</div>` : ''}
          ${data.expiringSoon > 0 ? `<div class="alert alert-warning">⏳ Wateja <strong>${data.expiringSoon}</strong> muda unaisha ndani ya siku 5</div>` : ''}
          ${data.pendingPayments > 0 ? `<div class="alert alert-danger">💰 Malipo <strong>${data.pendingPayments}</strong> yanasubiri kuthibitishwa!</div>` : ''}
          ${data.newCustomers && data.newCustomers.length > 0 ? `
          <h3 style="font-size:15px;margin:20px 0 8px">🆕 Wateja Wapya wa Leo</h3>
          <table class="table"><tr><th>Jina</th><th>Email</th><th>Simu</th></tr>
          ${data.newCustomers.map(c => `<tr><td><strong>${c.name}</strong></td><td>${c.email}</td><td>${c.phone||'-'}</td></tr>`).join('')}
          </table>` : ''}
          <hr class="divider">` : ''}
          ${data.salesCount > 0 ? `
          <h3 style="font-size:15px;margin:0 0 12px">💰 Mauzo ya Leo</h3>
          <div class="stat-grid">
            <div class="stat"><div class="label">Mauzo</div><div class="value">${fm(data.totalSales)}</div><div class="sub">${data.salesCount || 0} mauzo</div></div>
            <div class="stat"><div class="label">Faida</div><div class="value" style="color:#22C55E">${fm(data.totalProfit)}</div></div>
            <div class="stat"><div class="label">Matumizi</div><div class="value" style="color:#EF4444">${fm(data.totalExpenses)}</div></div>
          </div>` : ''}
          ${data.topItems && Object.keys(data.topItems).length > 0 ? `<h3 style="font-size:15px;margin:16px 0 8px">🏆 Bidhaa Bora</h3>
          <table class="table"><tr><th>Bidhaa</th><th>Idadi</th></tr>
          ${Object.entries(data.topItems).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,q])=>`<tr><td>${n}</td><td><strong>${q}</strong></td></tr>`).join('')}
          </table>` : ''}
          ${data.lowStock > 0 ? `<div class="alert alert-warning">⚠️ Bidhaa <strong>${data.lowStock}</strong> zinaisha — agiza haraka!</div>` : ''}
          <a href="https://duka-langu-system.vercel.app" class="btn">Fungua Mfumo →</a>
          <hr class="divider"><p style="text-align:center;color:${GR};font-size:12px">Ripoti ya kila siku — PesaFly / Duka Langu</p>`);
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
            <div style="font-size:14px;color:#92400E">Jina: PESAFLY | Kiasi: <strong>${fm(data.price || 15000)}</strong></div>
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

      case 'full_shop_report':
        html = wrap(`📊 RIPOTI KAMILI — ${data.shopName || 'Duka'} — ${data.date || new Date().toLocaleDateString('sw-TZ')}`, `
          <div class="alert alert-info" style="text-align:center;font-size:14px">
            <strong>🏪 ${data.shopName || 'Duka'}</strong> — Ripoti ya kila siku saa 10 usiku
          </div>

          <!-- DAILY -->
          <h3 style="font-size:15px;margin:20px 0 8px;color:${G}">📅 MAUZO YA LEO</h3>
          <div class="stat-grid">
            <div class="stat"><div class="label">Mauzo</div><div class="value">${fm(data.daySales)}</div><div class="sub">${data.dayCount||0} mauzo</div></div>
            <div class="stat"><div class="label">Faida</div><div class="value" style="color:#22C55E">${fm(data.dayProfit)}</div></div>
            <div class="stat"><div class="label">Matumizi</div><div class="value" style="color:#EF4444">${fm(data.dayExpenses)}</div></div>
            <div class="stat"><div class="label">Faida Halisi</div><div class="value" style="color:${(data.dayNet||0)>=0?'#22C55E':'#EF4444'}">${fm(data.dayNet)}</div></div>
          </div>

          <!-- WEEKLY -->
          <h3 style="font-size:15px;margin:20px 0 8px;color:#3B82F6">📅 MAUZO YA WIKI (Siku 7)</h3>
          <div class="stat-grid">
            <div class="stat"><div class="label">Mauzo</div><div class="value">${fm(data.weekSales)}</div><div class="sub">${data.weekCount||0} mauzo</div></div>
            <div class="stat"><div class="label">Faida</div><div class="value" style="color:#22C55E">${fm(data.weekProfit)}</div></div>
            <div class="stat"><div class="label">Matumizi</div><div class="value" style="color:#EF4444">${fm(data.weekExpenses)}</div></div>
            <div class="stat"><div class="label">Faida Halisi</div><div class="value" style="color:${(data.weekNet||0)>=0?'#22C55E':'#EF4444'}">${fm(data.weekNet)}</div></div>
          </div>

          <!-- MONTHLY -->
          <h3 style="font-size:15px;margin:20px 0 8px;color:#8B5CF6">📅 MAUZO YA MWEZI HUU</h3>
          <div class="stat-grid">
            <div class="stat"><div class="label">Mauzo</div><div class="value">${fm(data.monthSales)}</div><div class="sub">${data.monthCount||0} mauzo</div></div>
            <div class="stat"><div class="label">Faida</div><div class="value" style="color:#22C55E">${fm(data.monthProfit)}</div></div>
            <div class="stat"><div class="label">Matumizi</div><div class="value" style="color:#EF4444">${fm(data.monthExpenses)}</div></div>
            <div class="stat"><div class="label">Faida Halisi</div><div class="value" style="color:${(data.monthNet||0)>=0?'#22C55E':'#EF4444'}">${fm(data.monthNet)}</div></div>
          </div>

          <hr class="divider">

          <!-- TOP PRODUCTS -->
          ${(data.topProducts||[]).length>0 ? `
          <h3 style="font-size:15px;margin:16px 0 8px">🏆 Bidhaa Zinazouzwa Sana (Mwezi Huu)</h3>
          <table class="table"><tr><th>#</th><th>Bidhaa</th><th>Idadi Iliyouzwa</th></tr>
          ${data.topProducts.map((p,i)=>`<tr><td>${i+1}</td><td><strong>${p.name}</strong></td><td style="color:${G};font-weight:700">${p.qty}</td></tr>`).join('')}
          </table>` : ''}

          <!-- LOW STOCK -->
          ${data.lowStockCount>0 ? `
          <h3 style="font-size:15px;margin:16px 0 8px;color:#EF4444">⚠️ Bidhaa Zinazoisha (${data.lowStockCount})</h3>
          <table class="table"><tr><th>Bidhaa</th><th>Zimebaki</th><th>Minimum</th></tr>
          ${(data.lowStock||[]).map(p=>`<tr><td>📦 ${p.name}</td><td style="color:#EF4444;font-weight:700">${p.quantity}</td><td>${p.min_stock}</td></tr>`).join('')}
          </table>
          <div class="alert alert-warning">⚠️ Agiza bidhaa hizi HARAKA kabla hazijaisha!</div>` : '<div class="alert alert-success">✅ Stock yote iko vizuri!</div>'}

          <hr class="divider">

          <!-- DEBTS -->
          <h3 style="font-size:15px;margin:16px 0 8px;color:#F59E0B">💳 Orodha ya Madeni (${data.debtCount||0} wateja)</h3>
          ${data.debtCount>0 ? `
          <div class="stat-grid">
            <div class="stat"><div class="label">Deni Jumla</div><div class="value" style="color:#EF4444">${fm(data.totalDebt)}</div></div>
            <div class="stat"><div class="label">Wateja</div><div class="value">${data.debtCount}</div><div class="sub">wana deni</div></div>
          </div>
          <table class="table"><tr><th>Mteja</th><th>Simu</th><th>Deni</th><th>Siku</th></tr>
          ${(data.debts||[]).map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.phone}</td><td style="color:#EF4444;font-weight:700">${fm(c.balance)}</td><td>${c.daysOverdue>0?`<span style="color:#EF4444">${c.daysOverdue}d</span>`:'Leo'}</td></tr>`).join('')}
          </table>` : '<div class="alert alert-success">✅ Hakuna deni — wateja wote wamelipa!</div>'}

          <hr class="divider">

          <!-- SUBSCRIPTION -->
          <h3 style="font-size:15px;margin:16px 0 8px">📋 Mfumo</h3>
          <div class="stat-grid">
            <div class="stat"><div class="label">Plan</div><div class="value" style="color:#8B5CF6">${data.plan||'TRIAL'}</div></div>
            <div class="stat"><div class="label">Siku Zimebaki</div><div class="value" style="color:${(data.daysLeft||0)<=5?'#EF4444':'#22C55E'}">${data.daysLeft||0}</div></div>
          </div>
          ${(data.daysLeft||0)<=5 ? `<div class="alert alert-danger">⏳ Muda wako unakaribia kuisha! Lipa sasa: <strong>SELCOM → 6113 4066 — PESAFLY</strong></div>` : ''}

          <div style="text-align:center;margin-top:20px">
            <a href="https://duka-langu-system.vercel.app" class="btn">Fungua Mfumo →</a>
          </div>
          <hr class="divider">
          <p style="text-align:center;color:${GR};font-size:12px">Ripoti hii inatumwa kila siku saa 10 usiku — PesaFly / Duka Langu</p>`);
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
