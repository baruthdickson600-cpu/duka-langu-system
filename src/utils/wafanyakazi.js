// ============================================================
// DukaLangu — TAARIFA ZA WAFANYAKAZI
//
// Uthibitisho na hesabu za ukamilifu wa wasifu. Hakuna kitu
// kinachozuia kuhifadhi isipokuwa namba ya simu, kwa sababu
// bila simu mfanyakazi hapokei arifa yoyote.
// ============================================================

import { CHEO_LAB, CHEO_ZA_KAZI, cheoCha, cheoLab } from './tiketi.js';

export { CHEO_LAB, CHEO_ZA_KAZI, cheoCha, cheoLab };

export const JINSIA = { ke: 'Mwanamke', me: 'Mwanaume' };
export const jinsiaLab = j => JINSIA[String(j || '').toLowerCase()] || '—';

// ===== Namba ya simu =====
export const safishaSimu = s => String(s || '').replace(/[\s-]/g, '');
export const simuNiSahihi = s => /^0\d{9}$|^255\d{9}$|^\+255\d{9}$/.test(safishaSimu(s));

// ============================================================
// NIDA
//
// HAKUNA uthibitisho mkali kwa makusudi. Umbo rasmi la namba ya
// NIDA halikuthibitika kwenye chanzo cha kuaminika, na kuzuia
// kuhifadhi kwa umbo lisilo sahihi kungemzuia mfanyakazi halisi.
// Tunasafisha tu, na kuonya pale tarakimu si 20.
// ============================================================
export const NIDA_TARAKIMU = 20;
export const safishaNida = s => String(s || '').replace(/[\s-]/g, '');
export const nidaOnyo = (s) => {
  const n = safishaNida(s);
  if (!n) return '';
  if (/\D/.test(n)) return 'NIDA inapaswa kuwa tarakimu pekee.';
  if (n.length !== NIDA_TARAKIMU) return `NIDA huwa tarakimu ${NIDA_TARAKIMU}; umeandika ${n.length}. Hakiki kabla ya kuhifadhi.`;
  return '';
};
// Kwa kuonyesha: 19900101-12345-00001-12
export const fmtNida = (s) => {
  const n = safishaNida(s);
  if (n.length !== NIDA_TARAKIMU) return n || '—';
  return `${n.slice(0, 8)}-${n.slice(8, 13)}-${n.slice(13, 18)}-${n.slice(18)}`;
};

// ===== Tarehe =====
export const umri = (dob, sasa = Date.now()) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const n = new Date(sasa);
  let u = n.getUTCFullYear() - d.getUTCFullYear();
  const m = n.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && n.getUTCDate() < d.getUTCDate())) u--;
  return u;
};

export const dobOnyo = (dob, sasa = Date.now()) => {
  if (!dob) return '';
  const u = umri(dob, sasa);
  if (u === null) return 'Tarehe si sahihi.';
  if (u < 0) return 'Tarehe ya kuzaliwa iko mbeleni.';
  if (u < 18) return `Umri ni miaka ${u} — chini ya 18. Hakiki tarehe.`;
  if (u > 90) return `Umri ni miaka ${u}. Hakiki tarehe.`;
  return '';
};

// ============================================================
// UKAMILIFU WA WASIFU
//
// Simu ina uzito mkubwa kuliko zote: bila yake mfanyakazi
// hapokei arifa, na hilo halionekani popote pengine.
// ============================================================
export const SEHEMU = [
  { k: 'phone',           lab: 'Namba ya simu',     uzito: 3 },
  { k: 'name',            lab: 'Jina kamili',       uzito: 2 },
  { k: 'nida',            lab: 'NIDA',              uzito: 2 },
  { k: 'tarehe_kuzaliwa', lab: 'Tarehe ya kuzaliwa',uzito: 1 },
  { k: 'jinsia',          lab: 'Jinsia',            uzito: 1 },
  { k: 'anwani',          lab: 'Anwani',            uzito: 1 },
  { k: 'cheo_kazi',       lab: 'Cheo cha kazi',     uzito: 1 },
  { k: 'tarehe_kuanza',   lab: 'Tarehe ya kuanza',  uzito: 1 },
  { k: 'ndugu_jina',      lab: 'Ndugu wa karibu',   uzito: 1 },
  { k: 'ndugu_simu',      lab: 'Simu ya ndugu',     uzito: 1 },
];

const ina = (u, k) => {
  const v = u?.[k];
  return v != null && String(v).trim() !== '';
};

export const zilizokosekana = (u) => SEHEMU.filter(s => !ina(u, s.k)).map(s => s.lab);

export const ukamilifu = (u) => {
  const jumla = SEHEMU.reduce((n, s) => n + s.uzito, 0);
  const zilizopo = SEHEMU.reduce((n, s) => n + (ina(u, s.k) ? s.uzito : 0), 0);
  return Math.round((zilizopo / jumla) * 100);
};

export const rangiYaUkamilifu = (p) =>
  p >= 90 ? '#0A6E47' : p >= 60 ? '#F2B705' : '#C2412D';

// Safu zinazohifadhiwa — hakuna nyingine inayopita kwenda database
export const SAFU = ['name', 'phone', 'nida', 'tarehe_kuzaliwa', 'jinsia',
  'anwani', 'cheo_kazi', 'tarehe_kuanza', 'ndugu_jina', 'ndugu_simu', 'maelezo'];

// Andaa safu kwa ajili ya kuhifadhi: tupu inakuwa NULL, si ''
export const andaaKuhifadhi = (f = {}) => {
  const out = {};
  SAFU.forEach(k => {
    let v = f[k];
    if (typeof v === 'string') v = v.trim();
    if (k === 'phone') v = safishaSimu(v);
    if (k === 'nida') v = safishaNida(v);
    out[k] = v === '' || v === undefined ? null : v;
  });
  return out;
};

// Kuhifadhi kunazuiwa na jambo moja tu: simu isiyo sahihi.
export const kosaLaKuhifadhi = (f = {}) => {
  if (!String(f.name || '').trim()) return 'Jina linahitajika.';
  if (!simuNiSahihi(f.phone)) return 'Namba ya simu si sahihi — tumia 0713000000 au 255713000000.';
  if (f.ndugu_simu && !simuNiSahihi(f.ndugu_simu)) return 'Namba ya simu ya ndugu si sahihi.';
  return '';
};
