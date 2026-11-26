// ============================================================
// DukaLangu — TIKETI NA MGAWANYO WA ARIFA
//
// Chanzo kimoja cha ukweli: hali, vitengo, vipaumbele, na kila
// ujumbe wa SMS unaohusu tiketi au arifa za wafanyakazi.
//
// Kivinjari na cron (api/cron/subscription-reminders.js)
// vinatumia faili hili hili, kwa hiyo ujumbe unaotumwa na mfumo
// na ule unaoonekana skrini hauwezi kutofautiana.
//
// Viendelezo (.js) ni LAZIMA kwenye import za ndani: faili hili
// linatumika pia na Node ya Vercel, ambayo haitafuti faili bila
// kiendelezo kama Vite inavyofanya.
// ============================================================

import { niGsm7, urefuWaSms, sehemuZaSms, fmtTsh, tareheFupi, TOVUTI } from './risiti.js';

export { niGsm7, urefuWaSms, sehemuZaSms };

// ===== Hali ya tiketi =====
export const HALI = {
  open:    { lab: 'Wazi',            rangi: '#C2412D', mteja: 'Imepokelewa' },
  assigned:{ lab: 'Imepokelewa',     rangi: '#F2B705', mteja: 'Inashughulikiwa' },
  working: { lab: 'Inafanyiwa kazi', rangi: '#3B82F6', mteja: 'Inafanyiwa kazi' },
  replied: { lab: 'Imejibiwa',       rangi: '#8B5CF6', mteja: 'Umejibiwa' },
  closed:  { lab: 'Imefungwa',       rangi: '#0A6E47', mteja: 'Imekamilika' },
};
export const HALI_ZOTE = Object.keys(HALI);
export const haliLab   = h => HALI[h]?.lab   || 'Wazi';
export const haliRangi = h => HALI[h]?.rangi || '#9AA5A0';
export const haliMteja = h => HALI[h]?.mteja || 'Imepokelewa';
export const niWazi    = h => h !== 'closed';

// ===== Vitengo — kinaamua nani anashughulikia =====
export const KITENGO = {
  kiufundi: { lab: 'Tatizo la kiufundi', ikoni: '🛠️', kwa: 'ufundi',  maelezo: 'Mfumo haufanyi kazi vizuri' },
  malipo:   { lab: 'Malipo',             ikoni: '💳', kwa: 'masoko',  maelezo: 'Malipo, risiti, usajili' },
  mafunzo:  { lab: 'Nahitaji msaada',    ikoni: '🎓', kwa: 'masoko',  maelezo: 'Sijui kutumia kipengele' },
  ombi:     { lab: 'Ombi la kipengele',  ikoni: '💡', kwa: 'masoko',  maelezo: 'Napendekeza kitu kiongezwe' },
  nyingine: { lab: 'Nyingine',           ikoni: '📝', kwa: 'masoko',  maelezo: '' },
};
export const VITENGO_ZOTE = Object.keys(KITENGO);
export const kitengoLab = k => KITENGO[k]?.lab || 'Nyingine';
export const kitengoKwa = k => KITENGO[k]?.kwa || 'masoko';

// ===== Kipaumbele =====
export const KIPAUMBELE = {
  low:    { lab: 'Si ya haraka', rangi: '#9AA5A0', saa: 72 },
  normal: { lab: 'Kawaida',      rangi: '#3B82F6', saa: 24 },
  urgent: { lab: 'Ya dharura',   rangi: '#C2412D', saa: 4  },
};
export const kipaumbeleLab   = p => KIPAUMBELE[p]?.lab   || 'Kawaida';
export const kipaumbeleRangi = p => KIPAUMBELE[p]?.rangi || '#3B82F6';
export const kipaumbeleSaa   = p => KIPAUMBELE[p]?.saa   ?? 24;
export const niDharura       = p => p === 'urgent';

// ===== Namba ya tiketi =====
export const TIKETI_RX = /^TK-\d{4}-\d{6}$/;
export const safishaTiketi = no => String(no || '').trim().toUpperCase().replace(/\s+/g, '');
export const niTiketiHalali = no => TIKETI_RX.test(safishaTiketi(no));

// ============================================================
// MUDA ULIOPITA — "saa 3", "siku 2". Bila library.
// ============================================================
export const tanguLini = (iso, sasa = Date.now()) => {
  const t = new Date(iso).getTime();
  if (!iso || isNaN(t)) return '—';
  const d = Math.max(0, sasa - t);
  const dk = Math.floor(d / 60000);
  if (dk < 1) return 'sasa hivi';
  if (dk < 60) return `dakika ${dk}`;
  const saa = Math.floor(dk / 60);
  if (saa < 24) return `saa ${saa}`;
  const siku = Math.floor(saa / 24);
  if (siku < 7) return `siku ${siku}`;
  const wiki = Math.floor(siku / 7);
  if (wiki < 5) return `wiki ${wiki}`;
  return `miezi ${Math.floor(siku / 30)}`;
};

// Tiketi imechelewa kujibiwa kulingana na kipaumbele chake?
export const imechelewa = (t, sasa = Date.now()) => {
  if (!t || t.status === 'closed') return false;
  if (t.first_response_at) return false;
  const kuanzia = new Date(t.created_at).getTime();
  if (isNaN(kuanzia)) return false;
  return (sasa - kuanzia) > kipaumbeleSaa(t.priority) * 3600000;
};

// ============================================================
// UJUMBE WA SMS
//
// Zote ni GSM-7 na SMS MOJA. Arifa hizi ni gharama ya DukaLangu,
// si bando la mteja — kila mstari wa ziada ni pesa yetu.
// Jaribio linazuia emoji na urefu kupita kiasi.
// ============================================================

// Dhamana ya SMS MOJA.
//
// Kuhesabu herufi kwa mkono kunashindwa pale jina la duka
// linapokuwa refu kuliko ulivyotegemea. Badala yake tunaondoa
// mistari ya hiari kutoka mwisho hadi ujumbe utoshe. `muhimu`
// ni idadi ya mistari ya mwanzo isiyoguswa kamwe.
const smsMoja = (mistari, muhimu = 2) => {
  const l = mistari.filter(Boolean).map(String);
  while (l.length > muhimu && sehemuZaSms(l.join('\n')) > 1) l.pop();
  return l.join('\n');
};

// 1. Kwa MTEJA — tiketi imepokelewa
export const smsTiketiMpya = ({ no, kitengo } = {}) => smsMoja([
  'DUKALANGU',
  'Tumepokea ombi lako.',
  'Tiketi: ' + safishaTiketi(no),
  kitengo ? 'Aina: ' + kitengoLab(kitengo) : null,
  'Tutakujibu haraka.',
  'Msaada: 0617288752',
], 3);

// 2. Kwa MTEJA — tiketi inafanyiwa kazi / imejibiwa / imefungwa
export const smsTiketiHali = ({ no, status, jina } = {}) => {
  const n = safishaTiketi(no);
  // Tiketi ikifungwa, mteja anastahili zaidi ya "imekamilika":
  // anataka kujua tatizo lake LIMETATULIWA, na kwamba mlango
  // uko wazi likijirudia.
  if (status === 'closed') {
    return smsMoja([
      'DUKALANGU',
      'Tatizo lako limetatuliwa.',
      'Tiketi ' + n,
      'Likijirudia, tujulishe tena.',
      'Asante kwa subira yako.',
      'Msaada: 0617288752',
    ], 3);
  }
  const mstari = {
    assigned: 'Tiketi ' + n + ' imepokelewa' + (jina ? ' na ' + jina : '') + '.',
    working:  'Tiketi ' + n + ' inafanyiwa kazi sasa.',
    replied:  'Tiketi ' + n + ' imejibiwa. Ingia mfumoni kusoma jibu.',
  }[status] || ('Tiketi ' + n + ' imebadilika hali.');
  return smsMoja(['DUKALANGU', mstari, TOVUTI], 2);
};

// 3. Kwa MASOKO / WAKALA — tiketi mpya ya kufuatilia
export const smsTiketiKazi = ({ no, biashara, kitengo, priority, simu } = {}) => smsMoja([
  niDharura(priority) ? 'DUKALANGU - DHARURA' : 'DUKALANGU - TIKETI MPYA',
  safishaTiketi(no) + ' | ' + kitengoLab(kitengo),
  biashara ? 'Mteja: ' + String(biashara).slice(0, 26) : null,
  simu ? 'Simu: ' + simu : null,
  'Ingia mfumoni kuifanyia kazi.',
], 2);

// 4. Kwa ADMIN — afya ya mfumo kila siku
// `h` ni hesabu; tunaonyesha tu vilivyo na tatizo ili SMS ibaki moja.
export const smsAfya = (h = {}) => {
  const n = x => Number(x) || 0;
  const matatizo = [
    n(h.tiketiWazi)     && 'Tiketi wazi: ' + n(h.tiketiWazi),
    n(h.tiketiDharura)  && 'DHARURA: ' + n(h.tiketiDharura),
    n(h.tiketiZimechelewa) && 'Zimechelewa: ' + n(h.tiketiZimechelewa),
    n(h.malipoYamekwama)&& 'Malipo yaliyokwama: ' + n(h.malipoYamekwama),
    n(h.smsZimeshindwa) && 'SMS zilizoshindwa: ' + n(h.smsZimeshindwa),
    n(h.wasiolipa)      && 'Wasiolipa: ' + n(h.wasiolipa),
  ].filter(Boolean);

  const salio = h.salioSms != null
    ? 'Salio SMS: ' + Math.round(n(h.salioSms)).toLocaleString('en-US')
    : null;

  if (!matatizo.length) {
    return smsMoja(['DUKALANGU - AFYA YA MFUMO', 'Hakuna tatizo. Kila kitu sawa.',
      'Maduka hai: ' + n(h.makaziHai), salio], 2);
  }
  return smsMoja(['DUKALANGU - AFYA YA MFUMO', ...matatizo.slice(0, 4),
    'Maduka hai: ' + n(h.makaziHai), salio], 2);
};

// 5. Kwa MASOKO / WAKALA — wateja wasiolipa wa kufuatilia
// Majina matatu tu: yaliyobaki yako mfumoni. SMS moja ndiyo lengo.
export const smsWasiolipa = ({ idadi, orodha = [], jumla } = {}) => {
  const n = Number(idadi) || orodha.length;
  if (!n) return null;
  const majina = orodha.slice(0, 3).map(x => {
    const jina = String(x.jina || x.name || '').trim().slice(0, 16);
    const siku = x.siku != null ? ' (' + x.siku + ')' : '';
    return '- ' + jina + siku;
  });
  // Mpangilio huu ndio unaoamua kinachoondolewa SMS ikizidi:
  // kwanza maelezo, kisha thamani, mwisho kabisa majina.
  return smsMoja([
    'DUKALANGU - WAFUATILIE',
    'Wateja ' + n + ' hawajalipa:',
    ...majina,
    n > 3 ? 'na wengine ' + (n - 3) + '.' : null,
    jumla ? 'Thamani: ' + fmtTsh(jumla) : null,
    'Orodha kamili iko mfumoni.',
  ], 3);
};

// ============================================================
// MGAWANYO — nani anapokea arifa gani
//
// Hakuna orodha ya kuandika wala mtu wa kuongeza. Wafanyakazi
// tayari wako kwenye `users` na kila mmoja ana cheo chake —
// cheo hicho ndicho kinachoamua arifa anazozipata, kama ilivyo
// kwa arifa za malipo. Mtu akiajiriwa au kuondoka, hakuna
// mahali pengine pa kwenda kubadilisha.
// ============================================================
export const AINA_ARIFA = {
  afya:           { lab: 'Afya ya mfumo',    maelezo: 'Kila siku: tiketi, malipo yaliyokwama, SMS zilizoshindwa' },
  wasiolipa:      { lab: 'Wateja wasiolipa', maelezo: 'Kila siku: orodha ya wanaotakiwa kufuatiliwa' },
  tiketi:         { lab: 'Tiketi mpya',      maelezo: 'Papo hapo mteja anapotuma tiketi' },
  tiketi_dharura: { lab: 'Tiketi za dharura',maelezo: 'Papo hapo, za dharura pekee' },
};
export const AINA_ZOTE = Object.keys(AINA_ARIFA);
export const ainaLab = a => AINA_ARIFA[a]?.lab || a;

// Cheo -> arifa anazozipata
export const ARIFA_ZA_CHEO = {
  admin:      ['afya', 'tiketi', 'tiketi_dharura'],
  marketing:  ['wasiolipa', 'tiketi'],
  supervisor: ['wasiolipa', 'tiketi'],
  agent:      ['wasiolipa', 'tiketi'],
  accountant: [],
};
export const CHEO_LAB = {
  admin: 'Msimamizi', marketing: 'Afisa Masoko',
  supervisor: 'Supervisor', agent: 'Wakala', accountant: 'Mhasibu',
};
export const CHEO_ZA_KAZI = Object.keys(ARIFA_ZA_CHEO);
export const cheoCha = u => String(u?.role || '').trim().toLowerCase();
export const cheoLab = c => CHEO_LAB[String(c || '').toLowerCase()] || c;
// Wakala anaona wateja WAKE pekee — kwa promo code yake
export const niWakala = u => ['agent', 'supervisor'].includes(cheoCha(u));

export const arifaZake = u => ARIFA_ZA_CHEO[cheoCha(u)] || [];
export const anapokea = (u, aina) => {
  if (!u || u.is_active === false || !u.phone) return false;
  return arifaZake(u).includes(aina);
};

// Wafanyakazi wanaopaswa kupata arifa hii
export const wapokeajiWa = (users = [], aina) => (users || []).filter(u => anapokea(u, aina));

// Wapokeaji wa tiketi fulani: wote wanaopata 'tiketi', pamoja na
// wakala WAKE pekee. Wakala wa duka lingine hapokei.
export const wapokeajiWaTiketi = (users = [], tiketi = {}) => {
  const dharura = niDharura(tiketi.priority);
  return (users || []).filter(u => {
    const ok = anapokea(u, 'tiketi') || (dharura && anapokea(u, 'tiketi_dharura'));
    if (!ok) return false;
    if (niWakala(u)) return !!u.promo_code && u.promo_code === tiketi.promo_code;
    return true;
  });
};

// Wateja wa mfanyakazi: masoko na admin wanaona wote, wakala wake.
export const watejaWake = (u, biashara = []) =>
  niWakala(u) ? (biashara || []).filter(b => b.promo_code && b.promo_code === u.promo_code) : (biashara || []);

// ============================================================
// Wateja wasiolipa — chujio moja linalotumika kila mahali
// ============================================================
export const siraZaMteja = (b, sasa = Date.now()) => {
  const mwisho = b?.token_active ? b?.token_expiry : (b?.trial_end || b?.token_expiry);
  if (!mwisho) return null;
  const t = new Date(mwisho).getTime();
  if (isNaN(t)) return null;
  return Math.ceil((t - sasa) / 86400000);
};

// Anayehitaji kufuatiliwa: amekwisha, au anaisha ndani ya siku 3.
export const anahitajiKufuatiliwa = (b, sasa = Date.now()) => {
  if (!b || b.is_suspended) return false;
  const s = siraZaMteja(b, sasa);
  return s !== null && s <= 3;
};

export const orodhaYaWasiolipa = (biashara = [], sasa = Date.now()) =>
  biashara
    .filter(b => anahitajiKufuatiliwa(b, sasa))
    .map(b => ({ id: b.id, jina: b.name || b.email || 'Bila jina', simu: b.phone || '', siku: siraZaMteja(b, sasa), promo_code: b.promo_code || '' }))
    .sort((a, b) => a.siku - b.siku);

export { fmtTsh, tareheFupi };
