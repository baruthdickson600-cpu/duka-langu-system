// ============================================================
// api/cron/staff-email-report.js
// Ripoti binafsi kwa kila mfanyakazi wa DukaLangu — saa 8:00 asubuhi EAT
// Mhasibu: malipo, mapato | Wakala: wateja wake | Masoko: ukuaji
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const fmt = (n) => 'TZS ' + Math.round(n || 0).toLocaleString();
const green = '#0B7A3B';

// ===== Vipande vya HTML =====
const statCard = (label, value, color = '#101828') => `
  <td style="padding:12px;background:#F9FAFB;border-radius:10px;text-align:center;">
    <div style="font-size:11px;color:#98A2B3;font-weight:600;margin-bottom:4px;">${label}</div>
    <div style="font-size:19px;font-weight:800;color:${color};">${value}</div>
  </td>`;

const section = (title, body) => `
  <div style="margin-bottom:18px;">
    <div style="font-size:14px;font-weight:800;color:#101828;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #F2F4F7;">${title}</div>
    ${body}
  </div>`;

const listRows = (items, right) => items.length
  ? `<table width="100%" cellpadding="0" cellspacing="0">
      ${items.slice(0, 8).map(i => `
        <tr>
          <td style="padding:7px 0;border-bottom:1px solid #F9FAFB;font-size:13px;color:#344054;">${i.label}</td>
          <td style="padding:7px 0;border-bottom:1px solid #F9FAFB;font-size:13px;color:${i.color || '#667085'};font-weight:700;text-align:right;">${i.value}</td>
        </tr>`).join('')}
     </table>
     ${items.length > 8 ? `<div style="font-size:12px;color:#98A2B3;margin-top:8px;">+ ${items.length - 8} zaidi</div>` : ''}`
  : `<div style="font-size:13px;color:#98A2B3;">— Hakuna —</div>`;

function wrapEmail(name, role, bodyHTML) {
  const roleLabel = { accountant: 'Mhasibu', agent: 'Wakala', supervisor: 'Msimamizi', marketing: 'Masoko', admin: 'Msimamizi Mkuu' }[role] || role;
  return `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F4F6F8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8;padding:20px 12px;"><tr><td align="center">
<table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(16,24,40,0.06);">
  <tr><td style="background:linear-gradient(135deg,#064E2B,${green});padding:24px;">
    <div style="font-size:20px;font-weight:900;color:#fff;">DukaLangu Smart POS</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:3px;">Ripoti Yako — ${name}</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:5px;">${roleLabel} • ${new Date().toLocaleDateString('sw', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
  </td></tr>
  <tr><td style="padding:22px;">
    ${bodyHTML}
    <div style="text-align:center;margin-top:20px;">
      <a href="https://dukalangu.com" style="display:inline-block;padding:12px 28px;background:${green};color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Fungua Mfumo</a>
    </div>
  </td></tr>
  <tr><td style="padding:16px 22px;background:#F9FAFB;border-top:1px solid #F2F4F7;text-align:center;">
    <div style="font-size:12px;color:#98A2B3;">DukaLangu Smart POS — Simamia Biashara Yako Kidijitali</div>
  </td></tr>
</table></td></tr></table></body></html>`;
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ success: false, error: 'Supabase haijawekwa.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const baseUrl = `https://${req.headers.host}`;
  const results = { sent: 0, skipped: 0, failed: 0, details: [] };

  try {
    // Settings check
    let cfg = {};
    try {
      const { data: s } = await supabase.from('settings').select('key,value');
      (s || []).forEach(r => { cfg[r.key] = r.value; });
    } catch (e) {}
    if (cfg.staff_reports_enabled === 'false') {
      return res.status(200).json({ success: true, disabled: true });
    }

    const now = new Date();
    const yStart = new Date(now); yStart.setDate(yStart.getDate() - 1); yStart.setHours(0, 0, 0, 0);
    const yEnd = new Date(yStart); yEnd.setHours(23, 59, 59, 999);
    const wStart = new Date(now); wStart.setDate(wStart.getDate() - 7);

    // Data ya pamoja
    const { data: allBiz } = await supabase.from('businesses').select('id,name,phone,email,plan,token_active,token_expiry,trial_end,created_at,referred_by_code');
    const { data: allPay } = await supabase.from('payment_requests').select('*');
    const { data: promos } = await supabase.from('promo_codes').select('*');
    const { data: staff } = await supabase.from('users').select('id,name,email,phone,role').in('role', ['accountant', 'agent', 'supervisor', 'marketing']);

    const businesses = allBiz || [];
    const payments = allPay || [];

    for (const person of staff || []) {
      if (!person.email || !person.email.trim()) { results.skipped++; continue; }

      let body = '';

      // ===== MHASIBU =====
      if (person.role === 'accountant') {
        const pending = payments.filter(p => p.status === 'pending');
        const approvedY = payments.filter(p => p.status === 'approved' && p.approved_at >= yStart.toISOString() && p.approved_at <= yEnd.toISOString());
        const approvedW = payments.filter(p => p.status === 'approved' && p.approved_at >= wStart.toISOString());
        const revenueY = approvedY.reduce((a, p) => a + (p.amount || 0), 0);
        const revenueW = approvedW.reduce((a, p) => a + (p.amount || 0), 0);

        body = `
          ${section('⏳ Malipo Yanayosubiri', `
            <table width="100%"><tr>
              ${statCard('Maombi', pending.length, pending.length > 0 ? '#EA580C' : '#16A34A')}<td width="8"></td>
              ${statCard('Jumla', fmt(pending.reduce((a, p) => a + (p.amount || 0), 0)), '#EA580C')}
            </tr></table>
            ${pending.length > 0 ? `<div style="margin-top:10px;padding:9px 12px;background:#FFF7ED;border-radius:8px;font-size:12.5px;color:#9A3412;">⚠️ Kuna maombi ${pending.length} yanayosubiri uthibitisho wako.</div>` : ''}`)}

          ${section('✅ Ulithibitisha', `
            <table width="100%"><tr>
              ${statCard('Jana', approvedY.length, green)}<td width="8"></td>
              ${statCard('Mapato ya Jana', fmt(revenueY), green)}
            </tr></table>
            <table width="100%" style="margin-top:8px;"><tr>
              ${statCard('Wiki Hii', approvedW.length, '#3B82F6')}<td width="8"></td>
              ${statCard('Mapato ya Wiki', fmt(revenueW), '#3B82F6')}
            </tr></table>`)}

          ${pending.length > 0 ? section('📋 Maombi Yanayosubiri', listRows(
            pending.slice(0, 8).map(p => ({
              label: p.payer_name || p.business_name || 'Mteja',
              value: fmt(p.amount),
              color: '#EA580C',
            })))) : ''}`;
      }

      // ===== WAKALA / MSIMAMIZI =====
      else if (person.role === 'agent' || person.role === 'supervisor') {
        // Pata code ya wakala huyu
        const myPromo = (promos || []).find(p => p.agent_email === person.email);
        const myCode = myPromo?.code;

        // Wateja wake
        const myCustomers = myCode
          ? businesses.filter(b => b.referred_by_code === myCode)
          : [];

        const newY = myCustomers.filter(b => b.created_at >= yStart.toISOString() && b.created_at <= yEnd.toISOString());
        const newW = myCustomers.filter(b => b.created_at >= wStart.toISOString());
        const paying = myCustomers.filter(b => b.token_active && new Date(b.token_expiry || 0) > now);

        // Wanaokaribia kuisha (siku 7)
        const expiring = myCustomers.filter(b => {
          const end = b.token_active ? b.token_expiry : b.trial_end;
          if (!end) return false;
          const d = Math.ceil((new Date(end) - now) / 86400000);
          return d > 0 && d <= 7;
        });

        // Waliomaliza
        const expired = myCustomers.filter(b => {
          const end = b.token_active ? b.token_expiry : b.trial_end;
          return end && new Date(end) < now;
        });

        body = `
          ${section('👥 Wateja Wako', `
            <table width="100%"><tr>
              ${statCard('Jumla', myCustomers.length, green)}<td width="8"></td>
              ${statCard('Wanaolipa', paying.length, '#16A34A')}<td width="8"></td>
              ${statCard('Wapya (wiki)', newW.length, '#3B82F6')}
            </tr></table>
            ${!myCode ? `<div style="margin-top:10px;padding:9px 12px;background:#FFF7ED;border-radius:8px;font-size:12px;color:#9A3412;">⚠️ Huna code ya wakala. Wasiliana na msimamizi.</div>` : ''}`)}

          ${expiring.length > 0 ? section('⏰ Wanaokaribia Kuisha (Siku 7)', listRows(
            expiring.map(b => {
              const end = b.token_active ? b.token_expiry : b.trial_end;
              const d = Math.ceil((new Date(end) - now) / 86400000);
              return { label: b.name, value: `Siku ${d}`, color: d <= 3 ? '#EF4444' : '#EA580C' };
            }))) : ''}

          ${expired.length > 0 ? section('🔴 Waliomaliza — Wafuatilie', listRows(
            expired.map(b => ({ label: b.name, value: b.phone || '—', color: '#EF4444' })))) : ''}

          ${newY.length > 0 ? section('🎉 Wateja Wapya Jana', listRows(
            newY.map(b => ({ label: b.name, value: '✓ Mpya', color: '#16A34A' })))) : ''}`;
      }

      // ===== MASOKO =====
      else if (person.role === 'marketing') {
        const newY = businesses.filter(b => b.created_at >= yStart.toISOString() && b.created_at <= yEnd.toISOString());
        const newW = businesses.filter(b => b.created_at >= wStart.toISOString());
        const paying = businesses.filter(b => b.token_active && new Date(b.token_expiry || 0) > now);
        const trial = businesses.filter(b => !b.token_active);
        const convRate = businesses.length > 0 ? Math.round((paying.length / businesses.length) * 100) : 0;

        body = `
          ${section('📈 Ukuaji', `
            <table width="100%"><tr>
              ${statCard('Wapya Jana', newY.length, green)}<td width="8"></td>
              ${statCard('Wapya Wiki', newW.length, '#3B82F6')}<td width="8"></td>
              ${statCard('Jumla', businesses.length, '#8B5CF6')}
            </tr></table>`)}

          ${section('💡 Ubadilishaji', `
            <table width="100%"><tr>
              ${statCard('Wanaolipa', paying.length, '#16A34A')}<td width="8"></td>
              ${statCard('Majaribio', trial.length, '#EA580C')}<td width="8"></td>
              ${statCard('Kiwango', convRate + '%', convRate >= 50 ? '#16A34A' : '#EA580C')}
            </tr></table>`)}

          ${newY.length > 0 ? section('🎉 Wateja Wapya Jana', listRows(
            newY.map(b => ({ label: b.name, value: b.phone || '—', color: '#16A34A' })))) : ''}`;
      }

      if (!body) { results.skipped++; continue; }

      const html = wrapEmail(person.name || 'Mfanyakazi', person.role, body);
      const subject = `📊 Ripoti Yako — ${new Date().toLocaleDateString('sw', { day: 'numeric', month: 'short' })}`;

      try {
        const r = await fetch(`${baseUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: person.email, subject, html }),
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.success) results.sent++;
        else { results.failed++; results.details.push({ person: person.name, error: d.error }); }
      } catch (e) {
        results.failed++;
        results.details.push({ person: person.name, error: e.message });
      }

      await new Promise(res => setTimeout(res, 250));
    }

    console.log('[CRON staff-report]', JSON.stringify(results));
    return res.status(200).json({ success: true, ...results });

  } catch (err) {
    console.error('[CRON staff-report]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
