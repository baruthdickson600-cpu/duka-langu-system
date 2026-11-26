// ============================================================
// DukaLangu — HALI YA MTEJA
//
// Chujio moja linalotumika kila mahali: dashboard, orodha ya
// supevaiza, na arifa. Kama kila ukurasa ungehesabu peke yake,
// mteja angeweza kuonekana "analipa" sehemu moja na "ameishiwa"
// nyingine — na ndipo wafanyakazi wanapoacha kuamini mfumo.
// ============================================================

const G1 = '#0A6E47', MUT = '#5C6A62', MANJANO = '#B45309', NYEKUNDU = '#C2412D';

// Siku anazobakiwa nazo. Akiwa analipa tunaangalia token_expiry;
// yupo trial tunaangalia trial_end. Hasi = imeshaisha.
export const siku = (b, sasa = Date.now()) => {
  const mwisho = b?.token_active ? b?.token_expiry : b?.trial_end;
  if (!mwisho) return null;
  const d = Math.ceil((new Date(mwisho) - new Date(sasa)) / 86400000);
  return Number.isFinite(d) ? d : null;
};

// Kikomo cha "anakaribia kuisha" — siku 5 ni muda wa kutosha
// kumfuata mteja kabla hajakatika.
export const KARIBU = 5;

export const haliYa = (b, sasa = Date.now()) => {
  if (b?.is_suspended) return 'ameondoka';
  const d = siku(b, sasa);
  if (b?.token_active) return (d != null && d <= KARIBU) ? 'kulipia' : 'analipa';
  if (d != null && d < 0) return 'kulipia';     // trial imeisha
  return 'trial';
};

export const HALI = {
  kulipia:   { lab: 'Anatakiwa kulipia', rangi: NYEKUNDU, ikoni: '⚠️' },
  trial:     { lab: 'Trial',             rangi: MANJANO,  ikoni: '⏳' },
  analipa:   { lab: 'Analipa',           rangi: G1,       ikoni: '✅' },
  ameondoka: { lab: 'Ameondoka',         rangi: MUT,      ikoni: '💤' },
};

export const hesabuZaWateja = (wateja = [], sasa = Date.now()) => {
  const h = { wote: 0, kulipia: 0, trial: 0, analipa: 0, ameondoka: 0 };
  (wateja || []).forEach(b => { h.wote++; h[haliYa(b, sasa)]++; });
  return h;
};

// Anayetakiwa kulipia kwanza, kisha mwenye siku chache zaidi.
// Asiye na tarehe anaenda mwisho — hatujui lolote kuhusu yeye.
export const pangaKwaDharura = (wateja = [], sasa = Date.now()) =>
  [...(wateja || [])].sort((a, b) => {
    const pa = haliYa(a, sasa) === 'kulipia' ? 0 : 1;
    const pb = haliYa(b, sasa) === 'kulipia' ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const da = siku(a, sasa), db = siku(b, sasa);
    if (da == null && db == null) return 0;
    if (da == null) return 1;
    if (db == null) return -1;
    return da - db;
  });
