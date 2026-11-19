// ============================================================
// DukaLangu — HESABU YA PESA MKONONI
//
// Swali analouliza muuzaji mwisho wa siku:
//   "Nimeuza shilingi ngapi, nimetumia ngapi, na imebaki ngapi?"
//
// Jibu si kutoa matumizi kwenye mauzo yote. Mauzo ya M-Pesa
// hayampi pesa mkononi, na mauzo ya deni hayampi chochote.
// Kinachokaa mkononi ni TASLIMU pekee, kasoro matumizi ya taslimu.
//
//   Mauzo yote      = taslimu + simu + deni
//   Pesa iliyoingia = taslimu + simu        (deni haijaingia)
//   Pesa mkononi    = taslimu - matumizi ya taslimu
// ============================================================

const num = v => {
  const n = +v;
  return Number.isFinite(n) ? n : 0;
};

// Rekodi za zamani hazina payment_method — hizo ni taslimu
export const isCash    = r => { const m = r?.payment_method; return !m || m === 'cash'; };
export const isCredit  = r => r?.payment_method === 'credit';
export const isDigital = r => !isCash(r) && !isCredit(r);

const sumBy = (list, pick, amt) =>
  (list || []).filter(r => r && pick(r)).reduce((a, r) => a + num(r[amt]), 0);

// Hesabu kamili ya kipindi
export const cashReport = ({ sales = [], expenses = [] } = {}) => {
  const taslimu = sumBy(sales, isCash, 'total');
  const simu    = sumBy(sales, isDigital, 'total');
  const deni    = sumBy(sales, isCredit, 'total');

  const matumiziTaslimu = sumBy(expenses, isCash, 'amount');
  const matumiziSimu    = sumBy(expenses, r => !isCash(r), 'amount');
  const matumizi        = matumiziTaslimu + matumiziSimu;

  return {
    taslimu, simu, deni,
    mauzo: taslimu + simu + deni,
    mapato: taslimu + simu,
    matumizi, matumiziTaslimu, matumiziSimu,
    // Pesa inayopaswa kuwa mkononi — taslimu pekee, kasoro matumizi ya taslimu
    mkononi: taslimu - matumiziTaslimu,
    idadiMauzo: (sales || []).length,
    idadiMatumizi: (expenses || []).length,
  };
};

// Matumizi ya mtu mmoja (muuzaji anaona yake pekee)
export const mineOnly = (expenses, userId) =>
  (expenses || []).filter(e => String(e?.recorded_by ?? '') === String(userId ?? '\u0000'));
