// ============================================================
// DukaLangu — UWAKALA (kutuma na kutoa pesa)
//
// Wakala ana vitu viwili vinavyobadilika KINYUME:
//   TASLIMU — pesa moja kasheni, kwa shughuli zote za uwakala
//   FLOAT   — pesa ya kielektroniki, KILA LAINI ina yake
//
// Mteja akiweka pesa: taslimu inaingia, float inatoka.
// Akitoa: taslimu inatoka, float inaingia.
//
// KAMISHENI haigusi taslimu wala float papo hapo. Mitandao
// inailipa baadaye (wiki au mwezi), kwa hiyo inahesabiwa kama
// MAPATO YALIYOPATIKANA, si pesa iliyoingia. Ukiichanganya na
// taslimu, upatanisho wote unakuwa wa uongo.
//
// MSINGI WA KINGA: wakala anaweza kuandika chochote hapa, lakini
// hawezi kubadilisha salio la M-Pesa. Kwa hiyo kila hesabu
// inalenga kitu kimoja — kulinganisha inayotarajiwa na HALISI.
// ============================================================

const num = v => {
  const n = +v;
  return Number.isFinite(n) ? n : 0;
};

// Aina za miamala. `line` = inahitaji laini ya float.
export const TX = {
  deposit:    { label: 'Kuweka',          line: true,  cash: +1, float: -1, earns: true },
  withdraw:   { label: 'Kutoa',           line: true,  cash: -1, float: +1, earns: true },
  float_buy:  { label: 'Kununua float',   line: true,  cash: -1, float: +1, earns: false },
  float_sell: { label: 'Kuuza float',     line: true,  cash: +1, float: -1, earns: false },
  cash_in:    { label: 'Kuingiza mtaji',  line: false, cash: +1, float:  0, earns: false },
  cash_out:   { label: 'Kutoa pesa',      line: false, cash: -1, float:  0, earns: false },
};

export const txLabel = type => TX[type]?.label || type || '—';
export const needsLine = type => !!TX[type]?.line;
export const isKnownType = type => Object.prototype.hasOwnProperty.call(TX, type);

// Mabadiliko ya muamala mmoja.
// Marejesho (`reverses`) ni kinyume cha muamala wa awali.
export const txDeltas = tx => {
  const def = TX[tx?.type];
  if (!def) return { cash: 0, float: 0, commission: 0 };
  const sign  = tx?.reverses ? -1 : 1;
  const amt   = num(tx?.amount);
  const comm  = def.earns ? num(tx?.commission) : 0;
  return {
    cash:       sign * def.cash  * amt,
    float:      sign * def.float * amt,
    commission: sign * comm,
  };
};

// ===== UHAKIKI =====
// Muamala usiokubalika hauingii. Kila kosa linaelezwa kwa Kiswahili.
export const validateTx = (tx, { lines = [] } = {}) => {
  const e = [];
  if (!isKnownType(tx?.type)) e.push('Aina ya muamala haijulikani.');
  const amt = num(tx?.amount);
  if (amt <= 0) e.push('Weka kiasi sahihi kinachozidi sifuri.');
  if (num(tx?.commission) < 0) e.push('Kamisheni haiwezi kuwa chini ya sifuri.');
  if (needsLine(tx?.type)) {
    if (!tx?.line_id) e.push('Chagua laini.');
    else if (lines.length && !lines.some(l => String(l.id) === String(tx.line_id)))
      e.push('Laini hiyo haipo.');
  }
  // Kamisheni kubwa kuliko muamala wenyewe ni dalili ya kosa la kuandika
  if (TX[tx?.type]?.earns && num(tx?.commission) > amt)
    e.push('Kamisheni haiwezi kuzidi kiasi cha muamala.');
  return { ok: e.length === 0, errors: e };
};

// ===== SALIO =====
export const floatAfter = (opening, txs, lineId) =>
  (txs || []).filter(t => t && String(t.line_id ?? '') === String(lineId ?? ''))
    .reduce((a, t) => a + txDeltas(t).float, num(opening));

export const cashAfter = (opening, txs) =>
  (txs || []).filter(Boolean).reduce((a, t) => a + txDeltas(t).cash, num(opening));

export const commissionTotal = txs =>
  (txs || []).filter(Boolean).reduce((a, t) => a + txDeltas(t).commission, 0);

// ===== UPATANISHO =====
// `counted` ni kile wakala alichohesabu mwenyewe — *150*00# kwa float,
// mkono kwa taslimu. Hiki ndicho kinachokamata upotevu.
//
// MUHIMU: mfumo haumwonyeshi `expected` kabla hajaandika `counted`.
// Akiona jibu kwanza ataliandika, na upatanisho unakuwa mapambo.
export const reconcileLine = ({ openingFloat, txs, lineId, countedFloat }) => {
  const expected = floatAfter(openingFloat, txs, lineId);
  const counted  = num(countedFloat);
  return { expected, counted, variance: counted - expected };
};

export const reconcileCash = ({ openingCash, txs, countedCash }) => {
  const expected = cashAfter(openingCash, txs);
  const counted  = num(countedCash);
  return { expected, counted, variance: counted - expected };
};

// Hali ya tofauti, kwa kiwango alichoweka mmiliki
export const varianceState = (variance, threshold = 0) => {
  const v = num(variance), t = Math.abs(num(threshold));
  if (v === 0) return 'sawa';
  if (Math.abs(v) <= t) return 'ndogo';
  return v < 0 ? 'upungufu' : 'ziada';
};

// ===== MUHTASARI WA SIKU =====
export const dayTotals = txs => {
  const list = (txs || []).filter(Boolean);
  const by = type => list.filter(t => t.type === type && !t.reverses);
  const sum = l => l.reduce((a, t) => a + num(t.amount), 0);
  return {
    idadi:        list.length,
    kuweka:       sum(by('deposit')),
    idadiKuweka:  by('deposit').length,
    kutoa:        sum(by('withdraw')),
    idadiKutoa:   by('withdraw').length,
    floatNunuliwa: sum(by('float_buy')),
    floatUzwa:     sum(by('float_sell')),
    mtaji:        sum(by('cash_in')),
    pesaIliyotoka: sum(by('cash_out')),
    kamisheni:    commissionTotal(list),
    marejesho:    list.filter(t => t.reverses).length,
  };
};

// ===== USAJILI =====
// Vipengele vinajificha asipolipa, LAKINI anaruhusiwa kufunga siku
// kwa siku 7 — pesa isibaki bila kuhesabiwa. Hapo ndipo upotevu
// unapoanzia.
export const GRACE_DAYS = 7;
export const WARN_DAYS  = 5;

export const wakalaAccess = ({ enabled, paidUntil, now = new Date() } = {}) => {
  if (!enabled) return { visible: false, canRecord: false, canClose: false, daysLeft: 0, expired: false };
  const until = paidUntil ? new Date(paidUntil) : null;
  if (!until || Number.isNaN(until.getTime()))
    return { visible: true, canRecord: false, canClose: false, daysLeft: 0, expired: true, neverPaid: true };

  const ms = until.getTime() - new Date(now).getTime();
  const daysLeft = Math.ceil(ms / 86400000);
  const expired = ms <= 0;
  const graceLeft = Math.ceil((ms + GRACE_DAYS * 86400000) / 86400000);

  return {
    visible: !expired || graceLeft > 0,
    canRecord: !expired,
    canClose: !expired || graceLeft > 0,   // kufunga siku kunaruhusiwa ndani ya siku 7
    daysLeft: Math.max(0, daysLeft),
    expired,
    graceLeft: expired ? Math.max(0, graceLeft) : GRACE_DAYS,
    warn: !expired && daysLeft <= WARN_DAYS,
  };
};
