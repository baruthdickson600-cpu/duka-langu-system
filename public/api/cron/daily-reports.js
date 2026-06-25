// Vercel Cron — Automatic Reports 8:00 AM EAT (5:00 UTC)
// Reports YESTERDAY's data to: Admin + Partners + Shop Owners
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://snosfxagzglswaotrgzv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub3NmeGFnemdsc3dhb3RyZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDcwMDAsImV4cCI6MjA5MDY4MzAwMH0.qS6lEKGJ6IRganQTcpB1sFtw90XDyK0BMaQKSTVLXKE'
);

export default async function handler(req, res) {
  const GMAIL_USER = process.env.GMAIL_USER || 'dukalangusolution@gmail.com';
  const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
  if (!GMAIL_PASS) return res.status(500).json({ error: 'GMAIL_APP_PASSWORD not set' });

  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } });
  const G='#0B7A3B',D='#1E293B',GR='#64748B';
  const fm=n=>`TZS ${(+n||0).toLocaleString()}`;

  // ========================================
  // FIX #1: TANZANIA TIME ZONE (EAT = UTC+3)
  // ========================================
  // Cron runs UTC 05:00 = EAT 08:00 (8:00 AM Tanzania time)
  // "Jana" maana yake siku iliyopita kwa wakati wa Tanzania (sio UTC)
  
  const now = new Date();
  // Get current Tanzania time
  const eatNow = new Date(now.getTime() + 3 * 3600000);
  // "Jana" kwa Tanzania = today (EAT) minus 1 day
  const eatYesterday = new Date(eatNow.getTime() - 86400000);
  // yStr = "2026-06-07" (date string of yesterday in Tanzania)
  const yStr = eatYesterday.toISOString().split('T')[0];
  
  // FIX #2: Sahihi date range kwa "jana" Tanzania (00:00:00 EAT to 23:59:59 EAT)
  // EAT 00:00:00 = UTC 21:00 previous day
  // EAT 23:59:59 = UTC 20:59:59 same day
  const yStartEAT = new Date(yStr + 'T00:00:00+03:00').toISOString(); // EAT midnight start
  const yEndEAT = new Date(yStr + 'T23:59:59.999+03:00').toISOString(); // EAT midnight end
  
  const yLabel = eatYesterday.toLocaleDateString('sw-TZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Africa/Dar_es_Salaam'
  });
  
  // Week and month ranges
  const weekAgoEAT = new Date(eatNow.getTime() - 7 * 86400000).toISOString();
  const monthStartEAT = new Date(eatNow.getFullYear(), eatNow.getMonth(), 1).toISOString();

  console.log('[REPORTS] Tanzania Date Range:');
  console.log('  Yesterday EAT:', yStr);
  console.log('  Range UTC:', yStartEAT, 'to', yEndEAT);
  console.log('  Week ago:', weekAgoEAT);
  console.log('  Month start:', monthStartEAT);

  const results = { shops: 0, admin: false, partners: 0, errors: [], debug: {} };

  try {
    // ========================================
    // FIX #3: PAGINATION - Override default 1000 limit
    // ========================================
    // Tumia .range() kupata records zote (hadi 50,000)
    // Pia tumia server-side filtering kwa sales/expenses
    
    const fetchAll = async (table, options = {}) => {
      const PAGE_SIZE = 1000;
      let allData = [];
      let from = 0;
      let hasMore = true;
      
      while (hasMore && from < 50000) {
        let query = supabase.from(table).select('*').range(from, from + PAGE_SIZE - 1);
        
        // Apply filters if provided
        if (options.gte) query = query.gte(options.gte.col, options.gte.val);
        if (options.lte) query = query.lte(options.lte.col, options.lte.val);
        if (options.order) query = query.order(options.order, { ascending: false });
        
        const { data, error } = await query;
        
        if (error) {
          console.error(`[REPORTS] Error fetching ${table}:`, error.message);
          break;
        }
        
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allData = allData.concat(data);
          from += PAGE_SIZE;
          if (data.length < PAGE_SIZE) hasMore = false;
        }
      }
      
      return allData;
    };
    
    // Fetch all data with pagination
    // For sales/expenses — only fetch last 35 days (cover yesterday + week + month)
    const monthAgoEAT = new Date(eatNow.getTime() - 35 * 86400000).toISOString();
    
    const [biz, sales, products, expenses, customers, payments, partners, promos] = await Promise.all([
      fetchAll('businesses'),
      fetchAll('sales', { gte: { col: 'created_at', val: monthAgoEAT } }),
      fetchAll('products'),
      fetchAll('expenses', { gte: { col: 'created_at', val: monthAgoEAT } }),
      fetchAll('customers'),
      fetchAll('payment_requests'),
      fetchAll('marketing_partners'),
      fetchAll('promo_codes'),
    ]);
    
    const B = biz || [], S = sales || [], P = products || [], E = expenses || [];
    const C = customers || [], PY = payments || [], PT = partners || [], PR = promos || [];
    
    // Debug logging
    results.debug = {
      businesses: B.length,
      sales_last_35_days: S.length,
      products: P.length,
      expenses_last_35_days: E.length,
      customers: C.length,
      yesterday_date: yStr,
      yesterday_range: { from: yStartEAT, to: yEndEAT },
    };
    
    console.log('[REPORTS] Data fetched:', JSON.stringify(results.debug));
    
    // ========================================
    // FIX #4: SAHIHI date filter - using timestamps not startsWith
    // ========================================
    const isYesterday = (dateStr) => {
      if (!dateStr) return false;
      return dateStr >= yStartEAT && dateStr <= yEndEAT;
    };
    
    const isThisWeek = (dateStr) => {
      if (!dateStr) return false;
      return dateStr >= weekAgoEAT;
    };
    
    const isThisMonth = (dateStr) => {
      if (!dateStr) return false;
      return dateStr >= monthStartEAT;
    };

    // HELPER: build stat box
    const sg = (l, v, c) => `<div class="st"><div class="l">${l}</div><div class="v" style="color:${c||D}">${v}</div></div>`;

    // ===== 1. SHOP REPORTS — kwa kila duka =====
    for (const b of B) {
      if (!b.email) continue;
      const bid = b.id;
      const bp = P.filter(p => p.business_id === bid);
      const bs = S.filter(s => s.business_id === bid);
      const be = E.filter(e => e.business_id === bid);
      const bc = C.filter(c => c.business_id === bid);
      if (bp.length === 0 && bs.length === 0) continue;

      // JANA (using proper timestamp filtering)
      const ys = bs.filter(s => isYesterday(s.created_at));
      const yt = ys.reduce((a, s) => a + (+s.total || 0), 0);
      const yp = ys.reduce((a, s) => a + (+s.profit || 0), 0);
      const ye = be.filter(e => isYesterday(e.created_at)).reduce((a, e) => a + (+e.amount || 0), 0);
      
      // Items sold yesterday — detailed list
      const yItems = {};
      ys.forEach(s => {
        (s.items || []).forEach(i => {
          const key = i.name || 'Bidhaa';
          if (!yItems[key]) yItems[key] = { qty: 0, total: 0 };
          yItems[key].qty += (+i.qty || 0) * (+i.fraction || 1);
          yItems[key].total += (+i.qty || 0) * (+i.price || 0) * (+i.fraction || 1);
        });
      });
      const yItemsList = Object.entries(yItems).sort((a, c) => c[1].qty - a[1].qty);

      // WIKI
      const ws = bs.filter(s => isThisWeek(s.created_at));
      const wt = ws.reduce((a, s) => a + (+s.total || 0), 0);
      const wp = ws.reduce((a, s) => a + (+s.profit || 0), 0);
      const we = be.filter(e => isThisWeek(e.created_at)).reduce((a, e) => a + (+e.amount || 0), 0);

      // MWEZI
      const ms = bs.filter(s => isThisMonth(s.created_at));
      const mt = ms.reduce((a, s) => a + (+s.total || 0), 0);
      const mp = ms.reduce((a, s) => a + (+s.profit || 0), 0);
      const me = be.filter(e => isThisMonth(e.created_at)).reduce((a, e) => a + (+e.amount || 0), 0);

      // Bidhaa bora (mwezi)
      const pm = {};
      ms.forEach(s => (s.items || []).forEach(i => {
        pm[i.name] = (pm[i.name] || 0) + (+i.qty || 0) * (+i.fraction || 1);
      }));
      const tp = Object.entries(pm).sort((a, c) => c[1] - a[1]).slice(0, 10);

      // Low stock
      const ls = bp.filter(p => p.quantity > 0 && p.quantity <= (p.min_stock || 5));

      // Madeni
      const db = bc.filter(c => (c.credit_balance || 0) > 0).sort((a, c) => c.credit_balance - a.credit_balance);
      const td = db.reduce((a, c) => a + (+c.credit_balance || 0), 0);

      // Siku zilizobaki
      const se = b.token_active ? b.token_expiry : b.trial_end;
      const dl = se ? Math.max(0, Math.ceil((new Date(se) - now) / 86400000)) : 0;

      const css=`<style>body{margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif}.c{max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)}.hd{background:linear-gradient(135deg,${G},#065F2E);padding:28px 32px;text-align:center;color:#fff}.hd h1{margin:0;font-size:20px}.hd p{margin:6px 0 0;opacity:0.8;font-size:13px}.bd{padding:28px 32px;color:${D};line-height:1.7;font-size:14px}.bd h2{color:${G};font-size:15px;margin:20px 0 8px;border-bottom:2px solid #E2E8F0;padding-bottom:6px}.sg{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.st{flex:1;min-width:100px;background:#F8FAFC;border-radius:10px;padding:10px;text-align:center;border:1px solid #E2E8F0}.st .l{font-size:9px;color:${GR};text-transform:uppercase;letter-spacing:0.5px;font-weight:600}.st .v{font-size:18px;font-weight:800;margin:3px 0}table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px}th{background:${G};color:#fff;padding:7px 8px;text-align:left;font-size:11px}td{padding:7px 8px;border-bottom:1px solid #E2E8F0}tr:nth-child(even){background:#F8FAFC}.al{padding:10px 12px;border-radius:8px;margin:8px 0;font-size:12px}.al-d{background:#FEF2F2;border-left:4px solid #EF4444;color:#B91C1C}.al-w{background:#FFF7ED;border-left:4px solid #F59E0B;color:#92400E}.al-s{background:#F0FDF4;border-left:4px solid #22C55E;color:#15803D}.btn{display:inline-block;padding:12px 24px;background:${G};color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px}.ft{background:#F8FAFC;padding:16px;text-align:center;border-top:1px solid #E2E8F0}.ft p{margin:3px 0;font-size:11px;color:${GR}}.ft a{color:${G};text-decoration:none}hr{border:none;border-top:1px solid #E2E8F0;margin:14px 0}</style>`;

      const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head><body><div class="c"><div class="hd"><h1>📊 RIPOTI YA DUKA — ${b.name}</h1><p>Shughuli za ${yLabel}</p></div><div class="bd">
<h2>📅 JANA (${yLabel})</h2><div class="sg">${sg('Mauzo',fm(yt),G)}${sg('Faida',fm(yp),'#22C55E')}${sg('Matumizi',fm(ye),'#EF4444')}${sg('Halisi',fm(yp-ye),(yp-ye)>=0?'#22C55E':'#EF4444')}</div><p style="color:${GR};font-size:12px;text-align:center">Mauzo ${ys.length} yalifanyika jana</p>

${yItemsList.length>0?`<h2>🛒 Bidhaa Zilizouzwa Jana (${yItemsList.length})</h2><table><tr><th>#</th><th>Bidhaa</th><th>Idadi</th><th>Mapato</th></tr>${yItemsList.map(([n,d],i)=>`<tr><td>${i+1}</td><td><b>${n}</b></td><td style="color:${G};font-weight:700">${d.qty}</td><td style="color:${G};font-weight:700">${fm(d.total)}</td></tr>`).join('')}</table>`:'<div class="al al-w">⚠️ Hakuna bidhaa zilizouzwa jana. Hii inaweza kuwa kwa sababu duka halikufunguliwa, au mauzo hayajaingizwa kwenye mfumo.</div>'}<hr>

<h2>📅 WIKI HII (Siku 7)</h2><div class="sg">${sg('Mauzo',fm(wt),G)}${sg('Faida',fm(wp),'#22C55E')}${sg('Matumizi',fm(we),'#EF4444')}${sg('Halisi',fm(wp-we),(wp-we)>=0?'#22C55E':'#EF4444')}</div>
<h2>📅 MWEZI HUU</h2><div class="sg">${sg('Mauzo',fm(mt),G)}${sg('Faida',fm(mp),'#22C55E')}${sg('Matumizi',fm(me),'#EF4444')}${sg('Halisi',fm(mp-me),(mp-me)>=0?'#22C55E':'#EF4444')}</div><hr>
${tp.length>0?`<h2>🏆 Bidhaa Zinazouzwa Sana (Mwezi)</h2><table><tr><th>#</th><th>Bidhaa</th><th>Idadi</th></tr>${tp.map(([n,q],i)=>`<tr><td>${i+1}</td><td><b>${n}</b></td><td style="color:${G};font-weight:700">${q}</td></tr>`).join('')}</table>`:''}
${ls.length>0?`<h2 style="color:#EF4444">⚠️ Bidhaa Zinazoisha (${ls.length})</h2><table><tr><th>Bidhaa</th><th>Baki</th><th>Min</th></tr>${ls.slice(0,10).map(p=>`<tr><td>📦 ${p.name}</td><td style="color:#EF4444;font-weight:700">${p.quantity}</td><td>${p.min_stock||5}</td></tr>`).join('')}</table><div class="al al-w">⚠️ Agiza haraka!</div>`:'<div class="al al-s">✅ Stock yote iko vizuri!</div>'}<hr>
<h2 style="color:#F59E0B">💳 Madeni (${db.length} wateja)</h2>${db.length>0?`<div class="sg">${sg('Deni Jumla',fm(td),'#EF4444')}${sg('Wateja',db.length)}</div><table><tr><th>Mteja</th><th>Simu</th><th>Deni</th></tr>${db.slice(0,15).map(c=>`<tr><td><b>${c.name}</b></td><td>${c.phone||'-'}</td><td style="color:#EF4444;font-weight:700">${fm(c.credit_balance)}</td></tr>`).join('')}</table>`:'<div class="al al-s">✅ Hakuna deni!</div>'}<hr>
<h2>📋 Mfumo Wako</h2><div class="sg">${sg('Plan',(b.plan||'trial').toUpperCase(),'#8B5CF6')}${sg('Siku',dl,dl<=5?'#EF4444':'#22C55E')}${sg('Bidhaa',bp.length)}${sg('Wateja',bc.length)}</div>
${dl<=5?'<div class="al al-d">⏳ Muda unaisha! Lipa: <b>HALOPESA Lipa Namba 25187616 DUKALANGU</b></div>':''}
<div style="text-align:center;margin:18px 0"><a href="https://dukalangu.com" class="btn">Fungua Mfumo →</a></div></div><div class="ft"><p><b>Duka Langu</b></p><p>📧 dukalangusolution@gmail.com | 📞 0617 288 752 | WhatsApp: +255 628 319 789</p><p style="font-size:10px;color:#94A3B8">Ripoti ya automatic — kila siku saa 8:00 asubuhi</p></div></div></body></html>`;

      try{await transporter.sendMail({from:`"Duka Langu" <${GMAIL_USER}>`,to:b.email,subject:`📊 RIPOTI — ${b.name} — ${yLabel}`,html});results.shops++}catch(e){results.errors.push(b.name+': '+e.message)}
    }

    // ===== 2. ADMIN + PARTNER REPORT =====
    const ac=B.filter(b=>b.token_active&&!b.is_suspended);
    const tr=B.filter(b=>!b.token_active&&!b.is_suspended);
    const su=B.filter(b=>b.is_suspended);
    const ny=B.filter(b=>isYesterday(b.created_at));
    const ex=B.filter(b=>{const e=b.token_active?b.token_expiry:b.trial_end;return e&&Math.ceil((new Date(e)-now)/86400000)<=5&&Math.ceil((new Date(e)-now)/86400000)>0});
    const pd=PY.filter(p=>p.status==='pending');
    const ap=PY.filter(p=>p.status==='approved');
    const rv=ap.reduce((a,p)=>a+(p.amount||0),0);
    const mr=ap.filter(p=>isThisMonth(p.created_at)).reduce((a,p)=>a+(p.amount||0),0);

    const acss=`<style>body{margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif}.c{max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)}.hd{background:linear-gradient(135deg,#0F172A,#1E293B);padding:28px 32px;text-align:center;color:#fff}.hd h1{margin:0;font-size:20px}.hd p{margin:6px 0 0;opacity:0.8;font-size:13px}.bd{padding:28px 32px;color:${D};line-height:1.7;font-size:14px}.bd h2{color:${G};font-size:15px;margin:20px 0 8px;border-bottom:2px solid #E2E8F0;padding-bottom:6px}.sg{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.st{flex:1;min-width:100px;background:#F8FAFC;border-radius:10px;padding:10px;text-align:center;border:1px solid #E2E8F0}.st .l{font-size:9px;color:${GR};text-transform:uppercase;font-weight:600}.st .v{font-size:18px;font-weight:800;margin:3px 0}table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px}th{background:#0F172A;color:#fff;padding:7px 8px;text-align:left;font-size:11px}td{padding:7px 8px;border-bottom:1px solid #E2E8F0}tr:nth-child(even){background:#F8FAFC}.al{padding:10px 12px;border-radius:8px;margin:8px 0;font-size:12px}.al-d{background:#FEF2F2;border-left:4px solid #EF4444;color:#B91C1C}.al-w{background:#FFF7ED;border-left:4px solid #F59E0B;color:#92400E}.al-s{background:#F0FDF4;border-left:4px solid #22C55E;color:#15803D}.btn{display:inline-block;padding:12px 24px;background:${G};color:#fff;text-decoration:none;border-radius:10px;font-weight:700}.ft{background:#F8FAFC;padding:16px;text-align:center;border-top:1px solid #E2E8F0}.ft p{margin:3px 0;font-size:11px;color:${GR}}hr{border:none;border-top:1px solid #E2E8F0;margin:14px 0}</style>`;

    const aHtml=`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${acss}</head><body><div class="c"><div class="hd"><h1>📊 ADMIN — Ripoti ya Kila Siku</h1><p>Shughuli za ${yLabel} • Saa 8:00 Asubuhi</p></div><div class="bd">
<div class="sg">${sg('MADUKA',B.length)}${sg('ACTIVE',ac.length,'#22C55E')}${sg('TRIAL',tr.length,'#F59E0B')}${sg('SUSPENDED',su.length,'#EF4444')}</div>
<div class="sg">${sg('MAPATO JUMLA',fm(rv),G)}${sg('MWEZI HUU',fm(mr),'#3B82F6')}${sg('MAWAKALA',PR.length)}${sg('PENDING',pd.length,'#F59E0B')}</div>
${ny.length>0?'<div class="al al-s">🆕 Wateja wapya jana: <b>'+ny.length+'</b></div>':''}
${pd.length>0?'<div class="al al-d">💰 Malipo <b>'+pd.length+'</b> yanasubiri kuthibitishwa!</div>':''}
${ex.length>0?'<div class="al al-w">⏳ Wateja <b>'+ex.length+'</b> muda unaisha ndani ya siku 5!</div>':''}
${ny.length>0?`<h2 style="color:#22C55E">🆕 Wateja Wapya Jana</h2><table><tr><th>Jina</th><th>Email</th><th>Simu</th></tr>${ny.map(b=>`<tr><td><b>${b.name}</b></td><td>${b.email}</td><td>${b.phone||'-'}</td></tr>`).join('')}</table>`:''}
${ac.length>0?`<h2 style="color:#22C55E">✅ Active (${ac.length})</h2><table><tr><th>Jina</th><th>Email</th><th>Plan</th><th>Siku</th></tr>${ac.slice(0,25).map(b=>{const d=b.token_expiry?Math.ceil((new Date(b.token_expiry)-now)/86400000):0;return`<tr><td><b>${b.name}</b></td><td>${b.email}</td><td style="color:#8B5CF6;font-weight:700">${(b.plan||'basic').toUpperCase()}</td><td style="color:${d<=5?'#EF4444':'#22C55E'};font-weight:700">${d}</td></tr>`}).join('')}</table>`:''}
${tr.length>0?`<h2 style="color:#F59E0B">⏳ Trial (${tr.length})</h2><table><tr><th>Jina</th><th>Email</th><th>Simu</th><th>Siku</th></tr>${tr.slice(0,20).map(b=>{const d=b.trial_end?Math.ceil((new Date(b.trial_end)-now)/86400000):0;return`<tr><td><b>${b.name}</b></td><td>${b.email}</td><td>${b.phone||'-'}</td><td style="color:${d<=2?'#EF4444':'#F59E0B'};font-weight:700">${d}</td></tr>`}).join('')}</table>`:''}
${ex.length>0?`<h2 style="color:#EF4444">⚠️ Muda Unaisha (${ex.length})</h2><table><tr><th>Jina</th><th>Email</th><th>Simu</th><th>Siku</th></tr>${ex.map(b=>{const d=Math.ceil((new Date(b.token_expiry||b.trial_end)-now)/86400000);return`<tr><td><b>${b.name}</b></td><td>${b.email}</td><td>${b.phone||'-'}</td><td style="color:#EF4444;font-weight:900;font-size:16px">${d}</td></tr>`}).join('')}</table>`:''}
${su.length>0?`<h2 style="color:#EF4444">🔒 Wamefungwa (${su.length})</h2><table><tr><th>Jina</th><th>Email</th><th>Simu</th></tr>${su.slice(0,15).map(b=>`<tr><td><b>${b.name}</b></td><td>${b.email}</td><td>${b.phone||'-'}</td></tr>`).join('')}</table>`:''}
<div style="text-align:center;margin:18px 0"><a href="https://dukalangu.com" class="btn">Fungua Mfumo →</a></div></div><div class="ft"><p><b>Duka Langu</b></p><p>📧 dukalangusolution@gmail.com | 📞 0617 288 752</p><p style="font-size:10px;color:#94A3B8">Ripoti ya automatic — kila siku saa 8:00 asubuhi</p></div></div></body></html>`;

    // Send Admin
    try{await transporter.sendMail({from:`"Duka Langu Admin" <${GMAIL_USER}>`,to:GMAIL_USER,subject:`📊 ADMIN — Wateja ${B.length} | Active ${ac.length} | ${yLabel}`,html:aHtml});results.admin=true}catch(e){results.errors.push('Admin: '+e.message)}

    // Send Partners
    for(const p of PT){if(p.email){try{await transporter.sendMail({from:`"Duka Langu" <${GMAIL_USER}>`,to:p.email,subject:`📊 PARTNER — Wateja ${B.length} | Active ${ac.length} | ${yLabel}`,html:aHtml});results.partners++}catch(e){results.errors.push(p.email+': '+e.message)}}}

    return res.status(200).json({
      success: true,
      time: now.toISOString(),
      reportDate: yStr,
      reportLabel: yLabel,
      shops: results.shops,
      admin: results.admin,
      partners: results.partners,
      totalBiz: B.length,
      debug: results.debug,
      errors: results.errors.length ? results.errors : undefined
    });
  }catch(err){return res.status(500).json({error:err.message})}
}
