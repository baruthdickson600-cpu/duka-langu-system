// ============================================================
// api/cron/wakala-asubuhi.js — Uchambuzi wa asubuhi kwa mmiliki
// Schedule: 0 4 * * * (saa 4 UTC = saa 1 asubuhi EAT)
//
// Tofauti na arifa nyingine za uwakala, hii inakuja KILA SIKU,
// hata kama hakuna tatizo. Ndiyo maana ni uchambuzi, si onyo.
//
// Na ina kazi moja ambayo arifa nyingine haiwezi kuifanya:
// kumwambia mmiliki kuwa siku HAIKUFUNGWA. Arifa ya kufunga siku
// haiwezi kutuma ujumbe wa siku isiyofungwa — haikutokea.
//
// Kinga ya kutorudia: wakala_alerts ina unique index kwa
// (business_id, aina, kitu, day). SMS moja kwa siku moja, hata
// cron ikiendeshwa mara mbili.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY;

const tzs = n => Math.round(Number(n) || 0).toLocaleString('en-US');

// Tarehe ya jana kwa saa za Tanzania (UTC+3)
function jana() {
  const eat = new Date(Date.now() + 3 * 3600000);
  eat.setUTCDate(eat.getUTCDate() - 1);
  return eat.toISOString().slice(0, 10);
}
const tareheFupi = d => {
  const [y, m, dd] = String(d).split('-');
  return `${dd}/${m}`;
};

// SMS inalipiwa kwa kila herufi 160 — LAKINI emoji moja tu
// inabadilisha ujumbe kuwa Unicode, na kikomo kinashuka hadi 70.
// Ujumbe wa herufi 200 wenye emoji ni SMS TATU badala ya MBILI.
// Kwa hiyo hapa hakuna emoji wala herufi zisizo za kawaida.
export function tengenezaUjumbe(biz, u) {
  const kamisheni = Number(u.kamisheni) || 0;
  const gharama   = Number(u.gharama) || 0;
  const faida     = kamisheni - gharama;
  const L = [];

  L.push(`DukaLangu UWAKALA ${tareheFupi(u.day)}`);
  L.push(`Miamala ${u.zaMteja || 0} | Kamisheni ${tzs(kamisheni)}`);
  L.push(`Kuweka ${tzs(u.kuweka)} | Kutoa ${tzs(u.kutoa)}`);

  if (gharama > 0) L.push(`Gharama ${tzs(gharama)} | Faida ${tzs(faida)}`);

  // Float iliyobaki — ndiyo inayomwambia kama atapoteza wateja leo
  const fl = u.float && typeof u.float === 'object' ? Object.entries(u.float) : [];
  if (fl.length) L.push('Float: ' + fl.map(([n, v]) => `${n} ${tzs(v)}`).join(', '));

  if (!u.imefungwa) {
    L.push('ONYO: SIKU HAIKUFUNGWA, pesa haijahesabiwa.');
  } else {
    const vt = Number(u.tofautiTaslimu) || 0, vf = Number(u.tofautiFloat) || 0;
    if (vt || vf) L.push(`ONYO Tofauti: taslimu ${tzs(vt)}, float ${tzs(vf)}`);
    else L.push('Imefungwa, hesabu ziko sawa.');
  }

  // Kiwango cha uthibitisho kinaonyeshwa pale kinaposhuka tu
  const za = Number(u.zaMteja) || 0, th = Number(u.thibitishwa) || 0;
  if (za >= 10 && Math.round((th / za) * 100) < 60)
    L.push(`Majina yaliyothibitishwa ${Math.round((th / za) * 100)}% tu.`);

  if (u.marekebisho > 0) L.push(`Marekebisho ${u.marekebisho}.`);

  return L.join('\n');
}

export default async function handler(req, res) {
  if (process.env.CRON_SECRET &&
      req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ success: false, error: 'Supabase haijawekwa.' });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const baseUrl = `https://${req.headers.host}`;
  const day = jana();
  const out = { day, sent: 0, skipped: 0, failed: 0, details: [] };

  try {
    // Maduka yenye uwakala hai, yaliyolipia, na yaliyowasha arifa hii
    const { data: cfgs, error } = await sb
      .from('wakala_settings')
      .select('business_id, alert_phone, arifa_asubuhi')
      .eq('arifa_asubuhi', true);

    if (error) {
      // Safu haipo -> SQL ya sehemu 8 haijaendeshwa. Si kosa la kuvunja.
      return res.status(200).json({ success: true, skipped: 'arifa_asubuhi haipo bado', day });
    }
    if (!cfgs?.length) return res.status(200).json({ success: true, ...out, note: 'hakuna aliyewasha' });

    const ids = cfgs.map(c => c.business_id);
    const { data: bizi } = await sb
      .from('businesses')
      .select('id, name, phone, wakala_enabled, wakala_paid_until')
      .in('id', ids);

    for (const cfg of cfgs) {
      const biz = (bizi || []).find(b => b.id === cfg.business_id);
      const simu = cfg.alert_phone || biz?.phone;

      if (!biz?.wakala_enabled) { out.skipped++; continue; }
      if (!biz.wakala_paid_until || new Date(biz.wakala_paid_until) < new Date()) { out.skipped++; continue; }
      if (!simu) { out.skipped++; out.details.push({ biz: biz.name, sababu: 'hakuna namba' }); continue; }

      const { data: u, error: ue } = await sb.rpc('dl_wakala_uchambuzi',
        { p_biz: biz.id, p_day: day });
      if (ue || !u) { out.failed++; continue; }

      // Siku tulivu kabisa — hakuna cha kuripoti, wala cha kulipia
      if (!Number(u.idadi) && !Number(u.gharama)) { out.skipped++; continue; }

      // Weka alama KWANZA. Ikikataliwa, SMS ilishatumwa leo.
      const { error: ae } = await sb.from('wakala_alerts').insert({
        business_id: biz.id, aina: 'asubuhi', kitu: day, day,
        ujumbe: 'uchambuzi wa ' + day,
      });
      if (ae) { out.skipped++; continue; }

      const ujumbe = tengenezaUjumbe(biz, u);
      try {
        const r = await fetch(`${baseUrl}/api/send-sms`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: simu, message: ujumbe,
            business_id: biz.id, kind: 'wakala_asubuhi' }),
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.success) { out.sent++; }
        else { out.failed++; out.details.push({ biz: biz.name, error: d.error }); }
      } catch (e) {
        out.failed++; out.details.push({ biz: biz.name, error: e.message });
      }
    }

    return res.status(200).json({ success: true, ...out });
  } catch (e) {
    console.error('[wakala-asubuhi]', e?.message);
    return res.status(500).json({ success: false, error: e?.message });
  }
}
