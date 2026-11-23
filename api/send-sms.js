// ============================================================
// api/send-sms.js — General SMS Sender via Beem Africa
// Real-time: inaitwa moja kwa moja wakati action inatokea
// Architecture: stateless, scalable, hakuna cron dependency
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;
const smsDb = () => (SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false } }) : null);

// Kata SMS moja kwenye salio na andika kumbukumbu
async function debitAndLog(sb, { business_id, customer_id, phone, message, kind, sent_by, ok, error }) {
  if (!sb || !business_id) return;
  try {
    if (ok) {
      // Tumia bando la mwezi kwanza (linakwisha), kisha alilonunua (halikwishi)
      const { data: b } = await sb.from('businesses')
        .select('sms_balance, sms_quota_balance').eq('id', business_id).maybeSingle();
      const quota = b?.sms_quota_balance || 0;
      const bought = b?.sms_balance || 0;
      const upd = quota > 0
        ? { sms_quota_balance: quota - 1 }
        : { sms_balance: Math.max(0, bought - 1) };
      await sb.from('businesses').update(upd).eq('id', business_id);
    }
    await sb.from('sms_log').insert({
      business_id, customer_id: customer_id || null, phone, message,
      kind: kind || 'other', status: ok ? 'sent' : 'failed',
      error: error || null, cost: ok ? 1 : 0, sent_by: sent_by || null,
    });
  } catch (e) { console.warn('[SMS] log failed:', e.message); }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const BEEM_API_KEY    = process.env.BEEM_API_KEY;
  const BEEM_SECRET_KEY = process.env.BEEM_SECRET_KEY;
  const BEEM_SENDER_ID  = process.env.BEEM_SENDER_ID || 'INFO';

  if (!BEEM_API_KEY || !BEEM_SECRET_KEY) {
    const missing = [];
    if (!BEEM_API_KEY) missing.push('BEEM_API_KEY');
    if (!BEEM_SECRET_KEY) missing.push('BEEM_SECRET_KEY');
    console.error('[SMS] Env variables hazipo:', missing.join(', '));
    return res.status(500).json({
      success: false,
      error: 'Huduma ya SMS haijawekwa. Wasiliana na msimamizi.',
      missing_env: missing,
    });
  }

  const { phone, message, recipient_id = 1, business_id, customer_id, kind, sent_by } = req.body || {};

  // ---- ARIFA ZA UWAKALA: UDHIBITI WA ADMIN ----
  // Admin anaweza kuzima aina yoyote ya arifa ya uwakala kwa
  // mfumo mzima. Kizuizi kiko HAPA, si kwenye kivinjari, kwa
  // sababu njia zote mbili — app na cron — zinapitia hapa.
  const sbCfg = smsDb();
  if (kind && String(kind).startsWith('wakala_') && sbCfg) {
    try {
      const { data: rows } = await sbCfg.from('settings')
        .select('key,value').in('key', ['wakala_sms_enabled', kind + '_enabled']);
      const soma = k => (rows || []).find(r => r.key === k)?.value;
      const zima = v => v === 'false' || v === false;
      if (zima(soma('wakala_sms_enabled')) || zima(soma(kind + '_enabled'))) {
        return res.status(200).json({
          success: false, skipped: true, code: 'WAKALA_SMS_OFF',
          error: 'Arifa hii imezimwa na msimamizi.',
        });
      }
    } catch (_) { /* settings haipatikani — usizuie arifa */ }
  }

  // ---- BANDO LA SMS ----
  // SMS za mfumo (bila business_id) hazipunguzi bando la duka.
  // Zenye business_id ni za mwenye duka kwenda kwa wateja wake — zinakatwa.
  const sb = smsDb();
  if (business_id && sb) {
    const { data: biz } = await sb.from('businesses')
      .select('sms_balance, sms_quota_balance').eq('id', business_id).maybeSingle();
    const bal = (biz?.sms_balance || 0) + (biz?.sms_quota_balance || 0);
    if (bal <= 0) {
      return res.status(402).json({
        success: false, error: 'Salio la SMS limeisha. Nunua bando ili kuendelea.',
        code: 'NO_SMS_BALANCE', balance: 0,
      });
    }
  }

  if (!phone || !message) {
    return res.status(400).json({
      success: false,
      error: 'phone na message zinahitajika',
    });
  }

  // ── Format phone: 0712345678 → 255712345678 ───────────────
  let dest = String(phone).trim().replace(/[\s\-()]/g, '').replace(/^\+/, '');
  // 0712345678 -> 255712345678
  if (dest.startsWith('0') && dest.length === 10) dest = '255' + dest.slice(1);
  // 712345678 -> 255712345678
  else if (dest.length === 9 && /^[67]/.test(dest)) dest = '255' + dest;
  // Tanzania: 255 + [6/7] + tarakimu 8
  if (!/^255[67]\d{8}$/.test(dest)) {
    return res.status(400).json({
      success: false,
      error: `Namba ya simu si sahihi: ${phone}. Tumia mfumo 0712345678 au 255712345678.`,
      code: 'INVALID_PHONE',
    });
  }

  const credentials = Buffer.from(`${BEEM_API_KEY}:${BEEM_SECRET_KEY}`).toString('base64');

  const payload = {
    source_addr: BEEM_SENDER_ID,
    encoding:    0,
    message:     message,
    recipients:  [{ recipient_id, dest_addr: dest }],
  };

  console.log('📤 [SMS] Inatuma kwa:', dest);

  // Ujumbe rafiki kwa kila Beem error code
  const beemErrorMessage = (status, data) => {
    const code = data?.code;
    const msg = (data?.message || '').toLowerCase();
    if (status === 401 || status === 403) return 'Uthibitisho wa SMS umeshindwa. API Key au Secret si sahihi.';
    if (status === 404) return 'Huduma ya SMS haipatikani kwa sasa.';
    if (status === 429) return 'Umetuma SMS nyingi kwa haraka. Subiri kidogo.';
    if (status >= 500) return 'Mtoa huduma wa SMS hapatikani kwa sasa. Jaribu tena baadaye.';
    // 400-level: chunguza ujumbe
    if (msg.includes('sender') || msg.includes('source')) return 'Sender ID haijaidhinishwa na Beem. Wasiliana na Beem kuisajili.';
    if (msg.includes('recipient') || msg.includes('dest')) return 'Namba ya mpokeaji si sahihi.';
    if (msg.includes('balance') || msg.includes('credit') || msg.includes('insufficient')) return 'Salio la SMS halitoshi. Ongeza salio kwenye akaunti ya Beem.';
    if (msg.includes('auth') || msg.includes('key')) return 'API Key au Secret si sahihi.';
    if (code === 101) return 'Namba ya mpokeaji si sahihi.';
    if (code === 102) return 'Sender ID si sahihi au haijaidhinishwa.';
    if (code === 103) return 'Salio la SMS halitoshi.';
    return data?.message || 'Ombi la SMS limekataliwa. Angalia Sender ID, salio, na namba ya simu.';
  };

  // Fetch yenye timeout
  const fetchWithTimeout = async (url, opts, ms = 15000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { ...opts, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  };

  const MAX_RETRIES = 2;
  let lastErr = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const beemRes = await fetchWithTimeout('https://apisms.beem.africa/v1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`,
        },
        body: JSON.stringify(payload),
      }, 15000);

      const raw = await beemRes.text();
      let data = {};
      try { data = JSON.parse(raw); } catch { data = { raw }; }

      console.log('[SMS] Beem response:', beemRes.status, JSON.stringify(data).slice(0, 300));

      // Mafanikio
      if (beemRes.ok && (data?.code === undefined || data.code === 100)) {
        console.log('[SMS] Imetumwa:', dest);
        await debitAndLog(sb, { business_id, customer_id, phone: dest, message, kind, sent_by, ok: true });
        return res.status(200).json({ success: true, phone: dest, beem: data });
      }

      // Server error (5xx) - jaribu tena
      if (beemRes.status >= 500 && attempt < MAX_RETRIES) {
        lastErr = { status: beemRes.status, data };
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }

      // Client error (4xx) - usijaribu tena, ni tatizo la request
      return res.status(400).json({
        success: false,
        error: beemErrorMessage(beemRes.status, data),
        code: data?.code || beemRes.status,
        provider_status: beemRes.status,
      });

    } catch (err) {
      lastErr = err;
      const isTimeout = err.name === 'AbortError';
      console.error(`[SMS] Attempt ${attempt} failed:`, isTimeout ? 'TIMEOUT' : err.message);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      await debitAndLog(sb, { business_id, customer_id, phone: dest, message, kind, sent_by, ok: false, error: err.message });
      return res.status(503).json({
        success: false,
        error: isTimeout
          ? 'Mtoa huduma wa SMS amechelewa kujibu. Jaribu tena.'
          : 'Imeshindwa kuwasiliana na mtoa huduma wa SMS.',
        code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      });
    }
  }

  return res.status(503).json({
    success: false,
    error: 'Huduma ya SMS haipatikani kwa sasa. Jaribu tena baadaye.',
    code: 'PROVIDER_UNAVAILABLE',
  });
}
