// ============================================================
// api/cron/subscription-reminders.js
// Hutuma SMS ya ukumbusho wa usajili: siku 7, 3, 1, na umeisha
// Kinga ya kutorudia: sms_sent_log inahifadhi kila SMS iliyotumwa
// Inaendeshwa mara moja kwa siku (Vercel cron)
// ============================================================

import { createClient } from '@supabase/supabase-js';
import {
  smsAfya, smsWasiolipa, orodhaYaWasiolipa, anapokea, imechelewa,
  wapokeajiWa, watejaWake,
} from '../../src/utils/tiketi.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Ujumbe kwa kila hatua
const buildMessage = (type, name, days) => {
  const sig = '\n\nDukaLangu Smart POS\nSimamia Biashara Yako Kidijitali.';
  if (type === 'expired') {
    return `Habari ${name},\n\nUsajili wako wa DukaLangu Smart POS umeisha.\n\nTafadhali fanya malipo ili mfumo ufunguliwe na uendelee kutumia huduma zote.\n\nLipa: HALOPESA 25187616 (DUKALANGU)${sig}`;
  }
  return `Habari ${name},\n\nUsajili wako wa DukaLangu Smart POS unaisha baada ya siku ${days}.\n\nTafadhali fanya malipo mapema ili huduma zisikatike.\n\nLipa: HALOPESA 25187616 (DUKALANGU)${sig}`;
};

// Tuma SMS kupitia endpoint iliyopo (haitavunji Beem integration)
async function sendSMS(baseUrl, phone, message) {
  try {
    const r = await fetch(`${baseUrl}/api/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
    });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok && d.success, error: d.error };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ============================================================
// ARIFA ZA WAFANYAKAZI — mgawanyo wa kazi
//
// Zinapanda juu ya cron hii badala ya kuwa function yake,
// kwa sababu kikomo cha Vercel ni 12 na tupo 11.
//
// Kila kitu hapa ni cha HIARI: kikishindikana, ukumbusho wa
// wateja bado unatoka kama kawaida.
// ============================================================
// Arifa moja ya aina moja kwa siku moja, kwa kila namba.
// Cron ikiendeshwa mara mbili, SMS hairudiwi.
async function tayariImetumwa(supabase, aina, simu, kitu, today) {
  try {
    const { data } = await supabase.from('arifa_kazi_log')
      .select('id').eq('aina', aina).eq('simu', simu)
      .eq('kitu', kitu || '').eq('day', today).maybeSingle();
    return !!data;
  } catch { return false; }
}

async function andikaArifa(supabase, aina, simu, kitu, ujumbe) {
  try {
    await supabase.from('arifa_kazi_log').insert({ aina, simu, kitu: kitu || '', ujumbe: String(ujumbe).slice(0, 400) });
  } catch { /* jedwali halipo */ }
}

// Hesabu za afya ya mfumo. Kila swali limefungwa peke yake:
// jedwali moja likikosekana, lingine bado linahesabiwa.
async function hesabuAfya(supabase, baseUrl, biashara, wasiolipaIdadi, today) {
  const h = {
    makaziHai: (biashara || []).filter(b => b.token_active && !b.is_suspended).length,
    wasiolipa: wasiolipaIdadi,
  };

  try {
    const { data } = await supabase.from('support_tickets')
      .select('id,status,priority,created_at,first_response_at').neq('status', 'closed');
    const t = data || [];
    h.tiketiWazi = t.length;
    h.tiketiDharura = t.filter(x => x.priority === 'urgent').length;
    h.tiketiZimechelewa = t.filter(x => imechelewa(x)).length;
  } catch { /* jedwali halipo */ }

  // Malipo yaliyoanzishwa lakini hayajakamilika zaidi ya saa moja —
  // hapa ndipo mteja anapolipa lakini mfumo haufunguki.
  try {
    const saaMoja = new Date(Date.now() - 3600000).toISOString();
    const { data } = await supabase.from('payment_transactions')
      .select('id').eq('status', 'pending').lt('created_at', saaMoja)
      .gt('created_at', new Date(Date.now() - 3 * 86400000).toISOString());
    h.malipoYamekwama = (data || []).length;
  } catch { /* jedwali halipo */ }

  try {
    const { data } = await supabase.from('sms_logs')
      .select('id').eq('status', 'failed').gte('created_at', today + 'T00:00:00');
    h.smsZimeshindwa = (data || []).length;
  } catch { /* jedwali halipo */ }

  // Salio la Beem: likiisha, risiti na arifa zote zinakufa kimya kimya
  try {
    const r = await fetch(`${baseUrl}/api/sms-balance`);
    const d = await r.json().catch(() => ({}));
    const s = d?.balance ?? d?.credit_balance ?? d?.data?.credit_balance;
    if (s != null && !isNaN(Number(s))) h.salioSms = Number(s);
  } catch { /* si lazima */ }

  return h;
}

export async function arifaZaKazi(supabase, baseUrl, cfg, biashara, today) {
  const out = { afya: 0, wasiolipa: 0, skipped: 0, failed: 0 };
  if (cfg.arifa_kazi_enabled === 'false') return { ...out, disabled: true };

  // Wapokeaji ni wafanyakazi walioko kwenye `users`. Cheo chao
  // ndicho kinachoamua arifa — hakuna orodha nyingine ya kutunza.
  let watu = [];
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) return { ...out, hakuna_watu: true };
    watu = data || [];
  } catch { return { ...out, hakuna_watu: true }; }
  if (!watu.length) return { ...out, hakuna_watu: true };

  const wasio = orodhaYaWasiolipa(biashara || []);

  // ---- 1. Afya ya mfumo (msimamizi) ----
  if (cfg.arifa_afya_enabled !== 'false') {
    const wapokeaji = wapokeajiWa(watu, 'afya');
    if (wapokeaji.length) {
      const h = await hesabuAfya(supabase, baseUrl, biashara, wasio.length, today);
      const ujumbe = smsAfya(h);
      for (const m of wapokeaji) {
        if (await tayariImetumwa(supabase, 'afya', m.phone, null, today)) { out.skipped++; continue; }
        const r = await sendSMS(baseUrl, m.phone, ujumbe);
        if (r.ok) { out.afya++; await andikaArifa(supabase, 'afya', m.phone, null, ujumbe); }
        else out.failed++;
        await new Promise(x => setTimeout(x, 250));
      }
    }
  }

  // ---- 2. Wateja wasiolipa (masoko na wakala) ----
  if (cfg.arifa_wasiolipa_enabled !== 'false') {
    for (const m of wapokeajiWa(watu, 'wasiolipa')) {
      // Wakala anaona wateja WAKE pekee. Bila promo code, hakuna.
      const wangu = watejaWake(m, wasio);
      const ujumbe = smsWasiolipa({ idadi: wangu.length, orodha: wangu });
      if (!ujumbe) continue;   // hakuna wa kufuatilia — hakuna SMS ya bure
      if (await tayariImetumwa(supabase, 'wasiolipa', m.phone, null, today)) { out.skipped++; continue; }
      const r = await sendSMS(baseUrl, m.phone, ujumbe);
      if (r.ok) { out.wasiolipa++; await andikaArifa(supabase, 'wasiolipa', m.phone, null, ujumbe); }
      else out.failed++;
      await new Promise(x => setTimeout(x, 250));
    }
  }

  return out;
}

export default async function handler(req, res) {
  // Ruhusu Vercel cron pekee (au manual kwa GET)
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ success: false, error: 'Supabase haijawekwa.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const baseUrl = `https://${req.headers.host}`;
  const today = new Date().toISOString().slice(0, 10);

  const results = { sent: 0, skipped: 0, failed: 0, disabled: 0, details: [] };

  try {
    // Soma settings - heshimu ON/OFF toggles kutoka SMS Center
    const cfg = {};
    try {
      const { data: settingsRows } = await supabase.from('settings').select('key,value');
      (settingsRows || []).forEach(r => { cfg[r.key] = r.value; });
    } catch (e) { /* tumia defaults */ }

    // Kama SMS za otomatiki zimezimwa kabisa
    if (cfg.auto_sms_enabled === 'false') {
      console.log('[CRON reminders] SMS za otomatiki zimezimwa na msimamizi.');
      return res.status(200).json({ success: true, disabled: true, message: 'SMS za otomatiki zimezimwa.' });
    }

    const isEnabled = (type) => {
      if (type === 'reminder_7') return cfg.auto_reminder_7 !== 'false';
      if (type === 'reminder_3') return cfg.auto_reminder_3 !== 'false';
      if (type === 'reminder_1') return cfg.auto_reminder_1 !== 'false';
      if (type === 'expired') return cfg.auto_expired !== 'false';
      return true;
    };

    const footer = cfg.sms_footer || '';
    // Chukua biashara zote zenye simu
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, name, phone, token_active, token_expiry, trial_end, is_suspended, promo_code');

    if (error) throw error;

    for (const biz of businesses || []) {
      if (!biz.phone || !biz.phone.trim()) continue;

      const end = biz.token_active ? biz.token_expiry : biz.trial_end;
      if (!end) continue;

      const daysLeft = Math.ceil((new Date(end) - new Date()) / 86400000);

      // Amua aina ya ujumbe
      let type = null;
      if (daysLeft === 7) type = 'reminder_7';
      else if (daysLeft === 3) type = 'reminder_3';
      else if (daysLeft === 1) type = 'reminder_1';
      else if (daysLeft <= 0 && daysLeft > -2) type = 'expired'; // siku ya kwanza tu baada ya kuisha

      if (!type) continue;

      // Heshimu ON/OFF toggle ya aina hii
      if (!isEnabled(type)) { results.disabled++; continue; }

      // KINGA YA KUTORUDIA: angalia kama SMS hii tayari imetumwa
      const { data: existing } = await supabase
        .from('sms_sent_log')
        .select('id')
        .eq('business_id', biz.id)
        .eq('sms_type', type)
        .eq('sent_date', today)
        .maybeSingle();

      if (existing) {
        results.skipped++;
        continue;
      }

      // Tuma SMS
      let msg = buildMessage(type === 'expired' ? 'expired' : 'reminder', biz.name || 'Mteja', daysLeft);
      if (footer) msg = msg.replace(/\n\nDukaLangu Smart POS[\s\S]*$/, `\n\n${footer}`);
      const r = await sendSMS(baseUrl, biz.phone, msg);

      // Hifadhi kwenye kinga ya kutorudia
      await supabase.from('sms_sent_log').insert({
        business_id: biz.id,
        sms_type: type,
        sent_date: today,
        phone: biz.phone,
        status: r.ok ? 'sent' : 'failed',
      });

      // Hifadhi kwenye historia
      await supabase.from('sms_logs').insert({
        recipient: biz.phone,
        message: msg.slice(0, 500),
        status: r.ok ? 'sent' : 'failed',
      }).then(() => {}, () => {}); // silent

      if (r.ok) results.sent++;
      else { results.failed++; results.details.push({ biz: biz.name, error: r.error }); }

      // Subiri kidogo (rate limit)
      await new Promise(res => setTimeout(res, 300));
    }

    // Arifa za wafanyakazi. Zinaendeshwa baada ya za wateja ili
    // tatizo lolote hapa lisizuie ukumbusho wa mteja kutoka.
    let kazi = null;
    try {
      kazi = await arifaZaKazi(supabase, baseUrl, cfg, businesses || [], today);
    } catch (e) {
      console.warn('[CRON arifa za kazi]', e.message);
      kazi = { error: e.message };
    }

    console.log('[CRON reminders]', JSON.stringify({ ...results, kazi }));
    return res.status(200).json({ success: true, ...results, kazi });

  } catch (err) {
    console.error('[CRON reminders] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
