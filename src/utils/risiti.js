// ============================================================
// DukaLangu — RISITI YA MALIPO YA MFUMO
//
// Hili ndilo chanzo pekee cha ukweli kwa risiti: namba, jina la
// kifurushi, tarehe, na ujumbe wa SMS. Kivinjari na server
// (api/payments.js) vinatumia faili hili hili ili risiti
// inayoonekana skrini na ile inayokuja kwa SMS zisitofautiane.
//
// Hakuna emoji wala alama za Unicode kwenye ujumbe wa SMS:
// herufi moja ya Unicode inabadilisha SMS kuwa UCS-2, na herufi
// 160 zinakuwa 70. SMS moja inakuwa tatu. Jaribio linazuia hilo.
// ============================================================

// Viendelezo (.js) ni LAZIMA: faili hili linatumika pia na
// api/payments.js kwenye Node ya Vercel, ambayo haitafuti faili
// bila kiendelezo kama Vite inavyofanya.
import { PLANS, resolvePlanId } from '../config/plans.js';
import { AINA, ainaYa } from './wakala.js';

// ===== Aina ya risiti =====
export const RISITI = { duka: 'duka', uwakala: 'uwakala' };

// Jina la kifurushi kama litakavyoonekana kwenye risiti.
// Linatumia hyphen ya kawaida (si em dash) kwa sababu risiti
// hii hii inakwenda kwa SMS.
export const kifurushiJina = ({ aina, plan, akaunti } = {}) => {
  if (aina === RISITI.uwakala) {
    return ainaYa({ akaunti_aina: akaunti }) === AINA.uwakala
      ? 'Uwakala pekee'
      : 'Uwakala (nyongeza ya duka)';
  }
  const p = PLANS[resolvePlanId(plan)];
  return 'Duka - ' + p.name;
};

// Maelezo mafupi chini ya jina la kifurushi (skrini pekee)
export const kifurushiMaelezo = ({ aina, plan, akaunti } = {}) => {
  if (aina === RISITI.uwakala) {
    return ainaYa({ akaunti_aina: akaunti }) === AINA.uwakala
      ? 'Usimamizi wa uwakala'
      : 'Uwakala pamoja na duka lako';
  }
  return (PLANS[resolvePlanId(plan)].tagline) || 'Mfumo wa duka';
};

// ============================================================
// TAREHE — saa za Afrika Mashariki (UTC+3) bila kutegemea
// timezone ya kifaa. Simu iliyowekwa London isionyeshe siku
// tofauti na risiti iliyotumwa kwa SMS.
// ============================================================
const MIEZI_FUPI = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];
const MIEZI = ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'];
const pad = n => String(n).padStart(2, '0');

export const eat = (d) => {
  if (!d) return null;
  const t = new Date(d);
  if (isNaN(t.getTime())) return null;
  const x = new Date(t.getTime() + 3 * 3600000);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth(), d: x.getUTCDate(), h: x.getUTCHours(), i: x.getUTCMinutes() };
};

// 24/12/2026 — fupi, kwa SMS
export const tareheFupi = (d) => { const p = eat(d); return p ? `${pad(p.d)}/${pad(p.m + 1)}/${p.y}` : '—'; };
// 24 Des 2026 — kwa kadi za skrini
export const tareheKati = (d) => { const p = eat(d); return p ? `${p.d} ${MIEZI_FUPI[p.m]} ${p.y}` : '—'; };
// 24 Novemba 2026 — kamili
export const tareheNdefu = (d) => { const p = eat(d); return p ? `${p.d} ${MIEZI[p.m]} ${p.y}` : '—'; };
// 24 Novemba 2026, 09:14
export const tareheSaa = (d) => { const p = eat(d); return p ? `${p.d} ${MIEZI[p.m]} ${p.y}, ${pad(p.h)}:${pad(p.i)}` : '—'; };

// Mwisho wa huduma baada ya kuongeza siku
export const mwishoWaHuduma = (kuanzia, siku) => {
  const t = new Date(kuanzia || Date.now());
  const base = isNaN(t.getTime()) ? Date.now() : t.getTime();
  return new Date(base + (Number(siku) || 30) * 86400000).toISOString();
};

// ===== Pesa =====
export const fmtTsh = (n) => 'TZS ' + Math.round(Number(n) || 0).toLocaleString('en-US');

// ============================================================
// NAMBA YA RISITI
// Inatengenezwa na database (trigger), si na kivinjari — namba
// mbili zisizofanana zisitokee pale wateja wawili wanapolipa
// sekunde moja. Hapa tunaithibitisha tu.
// ============================================================
export const RISITI_RX = /^DL-\d{4}-\d{6}$/;
export const niNambaHalali = (no) => RISITI_RX.test(String(no || '').trim().toUpperCase());
export const safishaNamba = (no) => String(no || '').trim().toUpperCase().replace(/\s+/g, '');

// ===== Kiungo cha kuthibitisha =====
export const TOVUTI = 'dukalangu.com';
export const risitiNjia = (no) => '/r/' + safishaNamba(no);
export const risitiUrl = (no, base) => (base ? String(base).replace(/\/+$/, '') : 'https://' + TOVUTI) + risitiNjia(no);
// Toleo fupi kwa SMS (bila https://)
export const risitiUrlFupi = (no) => TOVUTI + risitiNjia(no);

// ============================================================
// GSM-7 — herufi zinazoruhusiwa kwenye SMS ya kawaida.
// Herufi yoyote nje ya hapa inafanya SMS iwe UCS-2: 160 -> 70.
// ============================================================
const GSM = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXT = '^{}\\[~]|€';

export const niGsm7 = (s) => [...String(s || '')].every(c => GSM.includes(c) || GSM_EXT.includes(c));

// Urefu wa SMS: herufi za GSM_EXT zinahesabiwa mara mbili
export const urefuWaSms = (s) => [...String(s || '')].reduce((n, c) => n + (GSM_EXT.includes(c) ? 2 : 1), 0);
export const sehemuZaSms = (s) => {
  const n = urefuWaSms(s);
  if (!niGsm7(s)) return n <= 70 ? 1 : Math.ceil(n / 67);
  return n <= 160 ? 1 : Math.ceil(n / 153);
};

// ============================================================
// UJUMBE WA RISITI (SMS)
//
// Lengo: SMS MOJA. Kila mstari unaongezwa ni pesa ya DukaLangu,
// si ya mteja — hivyo tunaacha jina la biashara (mteja analijua)
// na tunaweka kiungo badala ya maelezo marefu.
// ============================================================
export const ujumbeWaRisiti = ({ no, kiasi, kifurushi, siku, inaisha } = {}) => {
  const n = safishaNamba(no);
  const mistari = [
    'DUKALANGU',
    n ? 'Risiti ' + n : null,
    fmtTsh(kiasi) + ' imepokelewa.',
    kifurushi ? kifurushi + ', siku ' + (Number(siku) || 30) + '.' : null,
    inaisha ? 'Inaisha ' + tareheFupi(inaisha) + '.' : null,
    n ? risitiUrlFupi(n) : null,
    'Asante.',
  ].filter(Boolean);
  return mistari.join('\n');
};

// ============================================================
// Risiti kutoka safu ya database -> umbo moja linalotumika
// kila mahali (skrini, SMS, ukurasa wa kuthibitisha).
// ============================================================
export const risitiKutoka = (row = {}, biz = {}) => {
  const aina = row.aina || (row.provider_ref && String(row.provider_ref).startsWith('WK-') ? RISITI.uwakala : RISITI.duka);
  const kuanzia = row.paid_at || row.created_at;
  return {
    no: safishaNamba(row.risiti_no),
    aina,
    kiasi: Number(row.amount) || 0,
    siku: Number(row.days) || 30,
    kulipwa: kuanzia,
    inaisha: row.inaisha || mwishoWaHuduma(kuanzia, row.days),
    simu: row.phone || biz.phone || '',
    biashara: row.business_name || biz.name || '',
    mahali: [biz.ward, biz.district, biz.region].filter(Boolean).join(', '),
    barua: row.user_email || '',
    njia: row.channel || row.provider || '',
    kumbukumbuMtandao: row.external_id || '',
    kumbukumbuMfumo: row.provider_ref || '',
    kifurushi: kifurushiJina({ aina, plan: row.plan, akaunti: biz.akaunti_aina }),
    maelezo: kifurushiMaelezo({ aina, plan: row.plan, akaunti: biz.akaunti_aina }),
    hali: row.status || 'pending',
  };
};

// Jina rafiki la njia ya malipo
const NJIA = {
  mpesa: 'M-Pesa (Vodacom)', vodacom: 'M-Pesa (Vodacom)',
  tigo: 'Mixx by Yas (Tigo)', yas: 'Mixx by Yas (Tigo)',
  airtel: 'Airtel Money', halopesa: 'HaloPesa', halotel: 'HaloPesa',
  azampesa: 'Azam Pesa', snippe: 'Simu (Mobile Money)', test: 'Jaribio',
};
export const njiaJina = (k) => NJIA[String(k || '').toLowerCase().replace(/[^a-z]/g, '')] || 'Simu (Mobile Money)';
