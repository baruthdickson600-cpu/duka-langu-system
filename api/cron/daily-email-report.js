// ============================================================
// api/cron/daily-email-report.js
// Ripoti moja kamili kwa email kwa kila mteja — kila siku saa 8:00 asubuhi EAT
// Ina: Mauzo ya jana, Stock ndogo, Madeni, Hali ya usajili
// Jumatatu: + muhtasari wa wiki | Tarehe 1: + muhtasari wa mwezi
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const fmt = (n) => 'TZS ' + Math.round(n || 0).toLocaleString();

// ===== HTML ya email =====
const PAY_LABELS = { cash: 'Taslimu', mpesa: 'M-Pesa', airtel: 'Airtel', tigo: 'Tigo/Mixx', halopesa: 'HaloPesa', nmb: 'NMB', crdb: 'CRDB', mix: 'Mchanganyiko', credit: 'Deni' };
const payLabel = (m) => PAY_LABELS[m] || m || 'Taslimu';

function buildEmailHTML(biz, data) {
  const { daily, weekly, monthly, lowStock, debts, subscription, trendPct = 0, prevSales = 0, expenses = 0, netCash = 0, topItems = [], payMap = {} } = data;
  const green = '#0B7A3B';

  // Salamu binafsi kulingana na utendaji
  const hourGreeting = 'Habari za asubuhi';
  let verdict, verdictColor, verdictEmoji;
  if (daily.count === 0) { verdict = 'Jana hakukuwa na mauzo. Leo ni siku mpya — karibu tena!'; verdictColor = '#98A2B3'; verdictEmoji = '🌅'; }
  else if (trendPct >= 10) { verdict = `Hongera! Mauzo yalipanda kwa ${trendPct}% ikilinganishwa na juzi.`; verdictColor = '#16A34A'; verdictEmoji = '📈'; }
  else if (trendPct <= -10) { verdict = `Mauzo yalishuka kwa ${Math.abs(trendPct)}% ikilinganishwa na juzi. Leo tuboreshe!`; verdictColor = '#EA580C'; verdictEmoji = '📉'; }
  else { verdict = 'Jana ilikuwa siku ya kawaida. Endelea vizuri!'; verdictColor = green; verdictEmoji = '📊'; }

  // Ushauri wa siku (actionable)
  const tips = [];
  if (lowStock.length > 0) tips.push(`Agiza bidhaa ${lowStock.length} zinazoisha (mf. ${lowStock.slice(0,2).map(p=>p.name).join(', ')}).`);
  if (debts.overdue > 0) tips.push(`Fuatilia wateja ${debts.overdue} waliochelewa kulipa deni.`);
  if (subscription.days <= 7) tips.push(`Usajili wako unaisha baada ya siku ${subscription.days} — lipa mapema.`);
  if (daily.count > 0 && daily.profit / (daily.sales || 1) < 0.1) tips.push('Faida ya jana ilikuwa ndogo — kagua bei za bidhaa.');
  if (!tips.length) tips.push('Endelea na kazi nzuri! Kila kitu kinaenda sawa.');

  const card = (label, value, color = '#101828') => `
    <td style="padding:12px;background:#F9FAFB;border-radius:10px;text-align:center;">
      <div style="font-size:11px;color:#98A2B3;font-weight:600;margin-bottom:4px;">${label}</div>
      <div style="font-size:18px;font-weight:800;color:${color};">${value}</div>
    </td>`;

  const section = (title, body) => `
    <div style="margin-bottom:18px;">
      <div style="font-size:14px;font-weight:800;color:#101828;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #F2F4F7;">${title}</div>
      ${body}
    </div>`;

  // Stock ndogo
  const stockBody = lowStock.length
    ? `<table width="100%" cellpadding="0" cellspacing="0">
        ${lowStock.slice(0, 8).map(p => `
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #F9FAFB;font-size:13px;color:#344054;">${p.name}</td>
            <td style="padding:7px 0;border-bottom:1px solid #F9FAFB;font-size:13px;color:#EF4444;font-weight:700;text-align:right;">${p.quantity} ${p.unit || ''}</td>
          </tr>`).join('')}
       </table>
       ${lowStock.length > 8 ? `<div style="font-size:12px;color:#98A2B3;margin-top:8px;">+ bidhaa ${lowStock.length - 8} zaidi</div>` : ''}`
    : `<div style="font-size:13px;color:#16A34A;">✓ Bidhaa zote zina stock ya kutosha</div>`;

  // Madeni
  const debtBody = debts.total > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0">
        <tr>${card('Jumla ya Madeni', fmt(debts.total), '#EA580C')}<td width="10"></td>${card('Wateja', debts.count, '#EA580C')}</tr>
       </table>
       ${debts.overdue > 0 ? `<div style="margin-top:10px;padding:9px 12px;background:#FEF3F2;border-radius:8px;font-size:12.5px;color:#B42318;">⚠️ Wateja ${debts.overdue} wamechelewa kulipa</div>` : ''}`
    : `<div style="font-size:13px;color:#16A34A;">✓ Hakuna madeni</div>`;

  // Usajili
  const subColor = subscription.days <= 3 ? '#EF4444' : subscription.days <= 7 ? '#EA580C' : green;
  const subBody = `
    <div style="padding:12px;background:${subscription.days <= 7 ? '#FFF7ED' : '#F0FDF4'};border-radius:10px;">
      <div style="font-size:13px;color:#344054;">
        Plan: <b>${subscription.plan}</b> • Siku zilizobaki: <b style="color:${subColor};">${subscription.days}</b>
      </div>
      ${subscription.days <= 7 ? `<div style="font-size:12.5px;color:#B42318;margin-top:6px;">⚠️ Usajili wako unaisha karibuni. Lipa: HALOPESA 25187616 (DUKALANGU)</div>` : ''}
    </div>`;

  // Top sellers
  const topBody = topItems.length
    ? `<table width="100%" cellpadding="0" cellspacing="0">
        ${topItems.map((it, i) => `
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #F9FAFB;font-size:13px;color:#344054;">${i + 1}. ${it.name}</td>
            <td style="padding:7px 0;border-bottom:1px solid #F9FAFB;font-size:12px;color:#98A2B3;text-align:center;">${Math.round(it.qty)} pcs</td>
            <td style="padding:7px 0;border-bottom:1px solid #F9FAFB;font-size:13px;color:${green};font-weight:700;text-align:right;">${fmt(it.revenue)}</td>
          </tr>`).join('')}
       </table>`
    : `<div style="font-size:13px;color:#98A2B3;">Hakuna mauzo jana</div>`;

  // Njia za malipo
  const payEntries = Object.entries(payMap).sort((a, b) => b[1] - a[1]);
  const payTotal = payEntries.reduce((a, [, v]) => a + v, 0) || 1;
  const payBody = payEntries.length
    ? `<table width="100%" cellpadding="0" cellspacing="0">
        ${payEntries.map(([m, v]) => {
          const pct = Math.round((v / payTotal) * 100);
          return `<tr>
            <td style="padding:5px 0;font-size:12.5px;color:#344054;width:90px;">${payLabel(m)}</td>
            <td style="padding:5px 0;"><div style="background:#F2F4F7;border-radius:4px;height:8px;"><div style="background:${m==='credit'?'#EF4444':green};height:8px;border-radius:4px;width:${pct}%;"></div></div></td>
            <td style="padding:5px 0;font-size:12px;color:#667085;text-align:right;width:80px;">${fmt(v)}</td>
          </tr>`;
        }).join('')}
       </table>`
    : `<div style="font-size:13px;color:#98A2B3;">—</div>`;

  const tipBody = `<ul style="margin:0;padding-left:18px;">${tips.map(t => `<li style="font-size:13px;color:#344054;margin-bottom:5px;line-height:1.5;">${t}</li>`).join('')}</ul>`;

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F4F6F8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8;padding:20px 12px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(16,24,40,0.06);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#064E2B,${green});padding:24px;">
            <div style="font-size:20px;font-weight:900;color:#fff;">DukaLangu Smart POS</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:3px;">Ripoti ya ${biz.name || 'Biashara Yako'}</div>
            <div style="font-size:11.5px;color:rgba(255,255,255,0.65);margin-top:6px;">${new Date().toLocaleDateString('sw', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:22px;">

          <!-- Salamu + Tathmini -->
          <div style="background:${verdictColor}0F;border-left:4px solid ${verdictColor};border-radius:10px;padding:14px 16px;margin-bottom:20px;">
            <div style="font-size:15px;font-weight:800;color:#101828;margin-bottom:4px;">${verdictEmoji} ${hourGreeting}${biz.name ? ', ' + biz.name : ''}!</div>
            <div style="font-size:13px;color:${verdictColor};font-weight:600;">${verdict}</div>
          </div>

          ${section('📊 Mauzo ya Jana', `
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${card('Mauzo', fmt(daily.sales), green)}<td width="8"></td>
                ${card('Faida', fmt(daily.profit), '#16A34A')}<td width="8"></td>
                ${card('Miamala', daily.count, '#3B82F6')}
              </tr>
              <tr><td colspan="5" height="8"></td></tr>
              <tr>
                ${card('Matumizi', fmt(expenses), '#EF4444')}<td width="8"></td>
                ${card('Pesa Halisi', fmt(netCash), green)}<td width="8"></td>
                ${card('Mwenendo', (trendPct >= 0 ? '▲ ' : '▼ ') + Math.abs(trendPct) + '%', trendPct >= 0 ? '#16A34A' : '#EF4444')}
              </tr>
            </table>`)}

          ${daily.count > 0 ? section('🏆 Bidhaa Zilizouzwa Zaidi', topBody) : ''}
          ${daily.count > 0 ? section('💳 Njia za Malipo', payBody) : ''}

          ${weekly ? section('📅 Muhtasari wa Wiki', `
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${card('Mauzo ya Wiki', fmt(weekly.sales), green)}<td width="8"></td>
                ${card('Faida ya Wiki', fmt(weekly.profit), '#16A34A')}
              </tr>
            </table>`) : ''}

          ${monthly ? section('📆 Muhtasari wa Mwezi', `
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${card('Mauzo ya Mwezi', fmt(monthly.sales), green)}<td width="8"></td>
                ${card('Faida ya Mwezi', fmt(monthly.profit), '#16A34A')}
              </tr>
            </table>`) : ''}

          ${section('📦 Bidhaa Zinazoisha', stockBody)}
          ${section('💰 Madeni', debtBody)}
          ${section('🔑 Hali ya Usajili', subBody)}

          <!-- Ushauri wa Siku -->
          <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
            <div style="font-size:14px;font-weight:800;color:#92400E;margin-bottom:8px;">💡 Ushauri wa Leo</div>
            ${tipBody}
          </div>

          <div style="text-align:center;margin-top:22px;">
            <a href="https://dukalangu.com" style="display:inline-block;padding:12px 28px;background:${green};color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Fungua Mfumo</a>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 22px;background:#F9FAFB;border-top:1px solid #F2F4F7;text-align:center;">
            <div style="font-size:12px;color:#98A2B3;">DukaLangu Smart POS — Simamia Biashara Yako Kidijitali</div>
            <div style="font-size:11px;color:#D0D5DD;margin-top:4px;">Msaada: +255 617 288 752</div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ success: false, error: 'Supabase haijawekwa.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const baseUrl = `https://${req.headers.host}`;
  const results = { sent: 0, skipped: 0, failed: 0, details: [] };

  try {
    // Angalia kama ripoti za email zimewashwa
    let cfg = {};
    try {
      const { data: s } = await supabase.from('settings').select('key,value');
      (s || []).forEach(r => { cfg[r.key] = r.value; });
    } catch (e) {}

    if (cfg.email_reports_enabled === 'false') {
      return res.status(200).json({ success: true, disabled: true, message: 'Ripoti za email zimezimwa.' });
    }

    const now = new Date();
    const isMonday = now.getDay() === 1;
    const isFirstOfMonth = now.getDate() === 1;

    // Tarehe: jana, wiki, mwezi
    const yStart = new Date(now); yStart.setDate(yStart.getDate() - 1); yStart.setHours(0, 0, 0, 0);
    const yEnd = new Date(yStart); yEnd.setHours(23, 59, 59, 999);
    const wStart = new Date(now); wStart.setDate(wStart.getDate() - 7);
    const mStart = new Date(now.getFullYear(), now.getMonth() - (isFirstOfMonth ? 1 : 0), 1);

    // Chukua biashara zenye email
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, name, email, phone, plan, token_active, token_expiry, trial_end');

    for (const biz of businesses || []) {
      if (!biz.email || !biz.email.trim()) { results.skipped++; continue; }

      // Mauzo ya jana (na items + njia ya malipo kwa uchambuzi)
      const { data: dSales } = await supabase
        .from('sales').select('total,profit,items,payment_method')
        .eq('business_id', biz.id)
        .gte('created_at', yStart.toISOString())
        .lte('created_at', yEnd.toISOString());

      const daily = {
        sales: (dSales || []).reduce((a, s) => a + (s.total || 0), 0),
        profit: (dSales || []).reduce((a, s) => a + (s.profit || 0), 0),
        count: (dSales || []).length,
      };

      // Siku iliyotangulia jana (kwa ulinganisho wa mwenendo)
      const dbStart = new Date(yStart); dbStart.setDate(dbStart.getDate() - 1);
      const dbEnd = new Date(dbStart); dbEnd.setHours(23, 59, 59, 999);
      const { data: dbSales } = await supabase
        .from('sales').select('total')
        .eq('business_id', biz.id)
        .gte('created_at', dbStart.toISOString())
        .lte('created_at', dbEnd.toISOString());
      const prevSales = (dbSales || []).reduce((a, s) => a + (s.total || 0), 0);
      const trendPct = prevSales > 0 ? Math.round(((daily.sales - prevSales) / prevSales) * 100) : (daily.sales > 0 ? 100 : 0);

      // Matumizi ya jana
      const { data: dExp } = await supabase
        .from('expenses').select('amount')
        .eq('business_id', biz.id)
        .gte('created_at', yStart.toISOString())
        .lte('created_at', yEnd.toISOString());
      const expenses = (dExp || []).reduce((a, e) => a + (e.amount || 0), 0);
      const netCash = Math.max(0, daily.sales - expenses);

      // Bidhaa zilizouzwa zaidi jana (top sellers)
      const itemMap = {};
      (dSales || []).forEach(s => (s.items || []).forEach(it => {
        const key = it.name || 'Bidhaa';
        if (!itemMap[key]) itemMap[key] = { qty: 0, revenue: 0 };
        const q = (it.qty || 0) * (it.fraction || 1);
        itemMap[key].qty += q;
        itemMap[key].revenue += (it.qty || 0) * (it.price || 0) * (it.fraction || 1);
      }));
      const topItems = Object.entries(itemMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      // Njia za malipo (jana)
      const payMap = {};
      (dSales || []).forEach(s => {
        const m = s.payment_method || 'cash';
        payMap[m] = (payMap[m] || 0) + (s.total || 0);
      });

      // Wiki (Jumatatu pekee)
      let weekly = null;
      if (isMonday) {
        const { data: wSales } = await supabase
          .from('sales').select('total,profit')
          .eq('business_id', biz.id)
          .gte('created_at', wStart.toISOString());
        weekly = {
          sales: (wSales || []).reduce((a, s) => a + (s.total || 0), 0),
          profit: (wSales || []).reduce((a, s) => a + (s.profit || 0), 0),
        };
      }

      // Mwezi (tarehe 1 pekee)
      let monthly = null;
      if (isFirstOfMonth) {
        const { data: mSales } = await supabase
          .from('sales').select('total,profit')
          .eq('business_id', biz.id)
          .gte('created_at', mStart.toISOString());
        monthly = {
          sales: (mSales || []).reduce((a, s) => a + (s.total || 0), 0),
          profit: (mSales || []).reduce((a, s) => a + (s.profit || 0), 0),
        };
      }

      // Stock ndogo
      const { data: products } = await supabase
        .from('products').select('name,quantity,unit,low_stock_alert')
        .eq('business_id', biz.id);
      const lowStock = (products || []).filter(p => (p.quantity || 0) <= (p.low_stock_alert || 5));

      // Madeni
      const { data: customers } = await supabase
        .from('customers').select('debt,due_date')
        .eq('business_id', biz.id);
      const withDebt = (customers || []).filter(c => (c.debt || 0) > 0);
      const debts = {
        total: withDebt.reduce((a, c) => a + (c.debt || 0), 0),
        count: withDebt.length,
        overdue: withDebt.filter(c => c.due_date && new Date(c.due_date) < now).length,
      };

      // Usajili
      const end = biz.token_active ? biz.token_expiry : biz.trial_end;
      const subscription = {
        plan: biz.plan ? biz.plan.charAt(0).toUpperCase() + biz.plan.slice(1) : 'Basic',
        days: end ? Math.max(0, Math.ceil((new Date(end) - now) / 86400000)) : 0,
      };

      // Ruka kama hakuna chochote cha maana (hakuna mauzo, stock, madeni)
      if (daily.count === 0 && lowStock.length === 0 && debts.total === 0 && subscription.days > 7) {
        results.skipped++;
        continue;
      }

      // Tuma email
      const html = buildEmailHTML(biz, { daily, weekly, monthly, lowStock, debts, subscription, trendPct, prevSales, expenses, netCash, topItems, payMap });
      const subject = `📊 Ripoti ya ${biz.name || 'Biashara'} — ${new Date().toLocaleDateString('sw', { day: 'numeric', month: 'short' })}`;

      try {
        const r = await fetch(`${baseUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: biz.email, subject, html }),
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.success) results.sent++;
        else { results.failed++; if(results.details.length<3) results.details.push({ biz: biz.name, error: d.error, reason: d.details || d.missing_env }); }
      } catch (e) {
        results.failed++;
        results.details.push({ biz: biz.name, error: e.message });
      }

      await new Promise(res => setTimeout(res, 1200)); // Gmail rate limit
    }

    // ===== RIPOTI ZA WAFANYAKAZI (baada ya wateja) =====
    let staffResults = { sent: 0, skipped: 0, failed: 0 };
    if (cfg.staff_reports_enabled !== 'false') {
      try {
        const sr = await fetch(`${baseUrl}/api/cron/staff-email-report`, { method: 'GET' });
        const sd = await sr.json().catch(() => ({}));
        if (sd.success) staffResults = { sent: sd.sent || 0, skipped: sd.skipped || 0, failed: sd.failed || 0 };
      } catch (e) {
        console.warn('[CRON] Staff report failed:', e.message);
      }
    }

    console.log('[CRON email-report]', JSON.stringify({ customers: results, staff: staffResults }));
    return res.status(200).json({ success: true, customers: results, staff: staffResults });

  } catch (err) {
    console.error('[CRON email-report] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
