// ============================================================
// DukaLangu — HESABU ZA PESA
//
// Hesabu zote za faida, gharama na mapato ziko HAPA, mahali pamoja.
// Zilikuwa zimetawanyika sehemu tatu (AppContext, OfficeDash,
// OfficePages) na zilikuwa zinatofautiana kidogo — ndipo makosa
// yalipozaliwa. Hizi ni function safi: hazina React wala database,
// kwa hiyo zinaweza kujaribiwa (ona money.test.js).
//
// MUHIMU — mpangilio wa kutafuta bei ya kununua:
//   1. item.cost       — iliyohifadhiwa na database wakati wa mauzo
//   2. item.buyPrice    — iliyohifadhiwa na kivinjari cha mwenye duka
//   3. costMap          — bei ya SASA kutoka jedwali la bidhaa
//   4. 0
// Namba 1 na 2 ni za WAKATI WA MAUZO, kwa hiyo ni sahihi zaidi:
// bei ya kununua ikibadilika leo, faida ya zamani haibadiliki.
// Namba 3 ni kinga ya mwisho — mauzo ya muuzaji na marejesho
// hayahifadhi bei ya kununua kabisa.
// ============================================================

const num = v => {
  const n = +v;
  return Number.isFinite(n) ? n : 0;
};

const has = v => v !== undefined && v !== null && v !== '';

// fraction 0 au tupu inamaanisha bidhaa NZIMA (tabia iliyopo tangu awali)
const frac = item => num(item?.fraction) || 1;

// Ramani ya bei za kununua (mwenye duka pekee anazo)
export const buildCostMap = products => {
  const m = new Map();
  (products || []).forEach(p => {
    if (p && p.id !== undefined && p.id !== null) m.set(String(p.id), num(p.buy_price));
  });
  return m;
};

// Bei ya kununua ya bidhaa moja kwenye mauzo
export const unitCost = (item, costMap) => {
  if (has(item?.cost)) return num(item.cost);
  if (has(item?.buyPrice)) return num(item.buyPrice);
  if (has(item?.buy_price)) return num(item.buy_price);
  if (costMap) {
    const pid = String(item?.productId ?? item?.product_id ?? '');
    if (costMap.has(pid)) return num(costMap.get(pid));
  }
  return 0;
};

// Mapato ya mstari mmoja
export const itemRevenue = item => num(item?.qty) * num(item?.price) * frac(item);

// Faida ya mstari mmoja
export const itemProfit = (item, costMap) => {
  if (has(item?.lineProfit)) return num(item.lineProfit);
  return num(item?.qty) * (num(item?.price) - unitCost(item, costMap)) * frac(item);
};

// Mapato ya mauzo yote (kabla ya punguzo)
export const saleRevenue = sale =>
  (Array.isArray(sale?.items) ? sale.items : []).reduce((a, i) => a + itemRevenue(i), 0);

// Gharama ya mauzo yote
export const saleCost = (sale, costMap) =>
  (Array.isArray(sale?.items) ? sale.items : []).reduce(
    (a, i) => a + num(i?.qty) * unitCost(i, costMap) * frac(i), 0);

// Faida ya mauzo moja.
// Muuzaji hatumi faida (hana bei ya kununua), kwa hiyo mauzo yake
// yana profit = NULL. JavaScript inahesabu NULL kama sifuri, kwa hiyo
// mauzo yake yalikuwa HAYALETI FAIDA YOYOTE kwenye ripoti zote.
// Hapa tunaijaza kwa mwenye duka.
export const saleProfit = (sale, costMap) => {
  if (typeof sale?.profit === 'number' && Number.isFinite(sale.profit)) return sale.profit;
  return saleRevenue(sale) - saleCost(sale, costMap) - num(sale?.discount);
};

// Mauzo yenye faida iliyojazwa (inarudisha kitu kile kile ikiwa tayari nayo)
export const withProfit = (sale, costMap) => {
  if (typeof sale?.profit === 'number' && Number.isFinite(sale.profit)) return sale;
  return { ...sale, profit: saleProfit(sale, costMap) };
};

// Faida iliyopotea kwa marejesho
export const returnProfit = (returns, costMap) =>
  (returns || []).reduce((sum, r) => sum + (Array.isArray(r?.items) ? r.items : [])
    .reduce((s, i) => s + itemProfit(i, costMap), 0), 0);

// Faida halisi ya kipindi — msingi wa taslimu.
// Marejesho ya taslimu pekee yanapunguza (ya deni hayakuwa yameingia).
export const netProfit = (cashSales, returns, costMap) => {
  const gross = (cashSales || []).reduce((a, s) => a + saleProfit(s, costMap), 0);
  const back = returnProfit((returns || []).filter(r => !r.was_credit), costMap);
  return Math.max(0, gross - back);
};

// Asilimia ya faida
export const margin = (profit, revenue) =>
  num(revenue) > 0 ? Math.round(num(profit) / num(revenue) * 100) : 0;

// ============================================================
// MAPATO YA DUKALANGU (malipo ya wateja kwako)
//
// Chanzo kimoja: malipo yaliyothibitishwa kuingia (status='paid').
// ⚠️ Hapa ndipo bug ya "TZS 600,000" ilipokuwa — mapato yalikuwa
//    yanakadiriwa (tokens × bei), si pesa halisi iliyoingia.
// ============================================================
export const txAmt   = t => num(t?.amount);
export const txMonth = t => String(t?.paid_at || t?.created_at || '').slice(0, 7);
export const txDate  = t => String(t?.paid_at || t?.created_at || '').slice(0, 10);
export const sumTx   = list => (list || []).reduce((a, t) => a + txAmt(t), 0);
