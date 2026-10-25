// ============================================================
// api/cron/subscription-reminders.js
// Hutuma SMS ya ukumbusho wa usajili: siku 7, 3, 1, na umeisha
// Kinga ya kutorudia: sms_sent_log inahifadhi kila SMS iliyotumwa
// Inaendeshwa mara moja kwa siku (Vercel cron)
// ============================================================

import { createClient } from '@supabase/supabase-js';

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
      .select('id, name, phone, token_active, token_expiry, trial_end, is_suspended');

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

    console.log('[CRON reminders]', JSON.stringify(results));
    return res.status(200).json({ success: true, ...results });

  } catch (err) {
    console.error('[CRON reminders] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
