// ============================================================
// Majaribio ya hesabu za pesa
//
// Kila jaribio hapa linawakilisha hali halisi ya dukani. Mengi
// yanalinda makosa YALIYOTOKEA KWELI kwenye mfumo huu:
//
//   * mauzo ya muuzaji yana profit = NULL -> yalikuwa hayaleti
//     faida yoyote kwenye ripoti zote (JS inahesabu null kama 0)
//   * marejesho hayahifadhi bei ya kununua -> yalikuwa yanapunguza
//     faida kwa mauzo YOTE badala ya faida pekee
//   * oda zilitafuta c.buy_price wakati cart ina buyPrice -> gharama
//     ilikuwa 0, faida ikazidishwa
//
// Endesha:  npm test
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  buildCostMap, unitCost, itemRevenue, itemProfit,
  saleRevenue, saleCost, saleProfit, withProfit,
  returnProfit, netProfit, margin,
} from './money.js';

// Sabuni: nunua 700, uza 1000.  Sukari: nunua 1500, uza 3000.
const PRODUCTS = [
  { id: 'p1', name: 'Sabuni', buy_price: 700 },
  { id: 'p2', name: 'Sukari', buy_price: 1500 },
];
const COSTS = buildCostMap(PRODUCTS);

const item = (o = {}) => ({ productId: 'p1', qty: 1, price: 1000, ...o });

describe('buildCostMap', () => {
  it('inasoma bei za bidhaa', () => {
    expect(COSTS.get('p1')).toBe(700);
    expect(COSTS.get('p2')).toBe(1500);
  });
  it('haivunjiki kwa orodha tupu au batili', () => {
    expect(buildCostMap([]).size).toBe(0);
    expect(buildCostMap(null).size).toBe(0);
    expect(buildCostMap([null, undefined, {}]).size).toBe(0);
  });
  it('id ya namba inapatikana kwa herufi', () => {
    expect(buildCostMap([{ id: 7, buy_price: 500 }]).get('7')).toBe(500);
  });
  it('bidhaa isiyo na bei inakuwa sifuri, si NaN', () => {
    expect(buildCostMap([{ id: 'x' }]).get('x')).toBe(0);
  });
});

describe('unitCost — mpangilio wa kutafuta bei', () => {
  it('1. cost ya database inashinda zote', () => {
    expect(unitCost(item({ cost: 650, buyPrice: 700 }), COSTS)).toBe(650);
  });
  it('2. buyPrice ya kivinjari inafuata', () => {
    expect(unitCost(item({ buyPrice: 680 }), COSTS)).toBe(680);
  });
  it('3. jedwali la bidhaa ni kinga ya mwisho', () => {
    expect(unitCost(item(), COSTS)).toBe(700);
  });
  it('4. hakuna chochote -> sifuri', () => {
    expect(unitCost(item({ productId: 'haipo' }), COSTS)).toBe(0);
    expect(unitCost(item())).toBe(0);
  });
  it('cost = 0 ni jibu halali, si "hakuna"', () => {
    expect(unitCost(item({ cost: 0 }), COSTS)).toBe(0);
  });
  it('inakubali product_id pia', () => {
    expect(unitCost({ product_id: 'p2', qty: 1, price: 3000 }, COSTS)).toBe(1500);
  });
  it('maandishi yanabadilishwa kuwa namba', () => {
    expect(unitCost(item({ cost: '650' }), COSTS)).toBe(650);
  });
  it('tupu ("") inaruka hadi ngazi inayofuata', () => {
    expect(unitCost(item({ cost: '', buyPrice: 700 }), COSTS)).toBe(700);
  });
});

describe('itemRevenue', () => {
  it('idadi x bei', () => {
    expect(itemRevenue(item({ qty: 4 }))).toBe(4000);
  });
  it('nusu kilo (fraction 0.5)', () => {
    expect(itemRevenue(item({ productId: 'p2', qty: 2, price: 3000, fraction: 0.5 }))).toBe(3000);
  });
  it('fraction 0 inamaanisha nzima — si sifuri', () => {
    expect(itemRevenue(item({ qty: 2, fraction: 0 }))).toBe(2000);
  });
  it('data batili inatoa sifuri, si NaN', () => {
    expect(itemRevenue({})).toBe(0);
    expect(itemRevenue(null)).toBe(0);
    expect(itemRevenue(item({ qty: 'abc' }))).toBe(0);
  });
});

describe('itemProfit', () => {
  it('lineProfit ya database inashinda hesabu', () => {
    expect(itemProfit(item({ qty: 4, lineProfit: 1200 }), COSTS)).toBe(1200);
  });
  it('lineProfit hasi inaheshimiwa (bidhaa iliuzwa kwa hasara)', () => {
    expect(itemProfit(item({ lineProfit: -200 }), COSTS)).toBe(-200);
  });
  it('mauzo ya mwenye duka (buyPrice)', () => {
    expect(itemProfit(item({ qty: 4, buyPrice: 700 }), COSTS)).toBe(1200);
  });
  it('MAUZO YA MUUZAJI — hakuna bei, jedwali linaokoa', () => {
    // Hapa ndipo mfumo ulipokuwa unakosea: bila costMap, faida
    // ilikuwa mapato YOTE (margin 100%).
    expect(itemProfit(item({ productId: 'p2', qty: 3, price: 3000 }), COSTS)).toBe(4500);
    expect(itemProfit(item({ productId: 'p2', qty: 3, price: 3000 }))).toBe(9000);
  });
  it('nusu kilo', () => {
    expect(itemProfit(item({ productId: 'p2', qty: 2, price: 3000, fraction: 0.5 }), COSTS)).toBe(1500);
  });
  it('kuuza chini ya bei ya kununua kunatoa hasara', () => {
    expect(itemProfit(item({ qty: 1, price: 500 }), COSTS)).toBe(-200);
  });
});

describe('saleProfit', () => {
  it('faida iliyotumwa haiguswi', () => {
    expect(saleProfit({ profit: 1200, items: [item({ qty: 4 })] }, COSTS)).toBe(1200);
  });
  it('faida 0 ni jibu halali — si "hakuna"', () => {
    expect(saleProfit({ profit: 0, items: [item({ qty: 99 })] }, COSTS)).toBe(0);
  });
  it('MAUZO YA MUUZAJI (profit = null) yanahesabiwa', () => {
    const sale = { profit: null, discount: 0, items: [item({ productId: 'p2', qty: 3, price: 3000 })] };
    expect(saleProfit(sale, COSTS)).toBe(4500);
  });
  it('profit = undefined pia', () => {
    expect(saleProfit({ items: [item({ qty: 4 })] }, COSTS)).toBe(1200);
  });
  it('punguzo linapunguza faida', () => {
    const sale = { profit: null, discount: 500, items: [item({ qty: 4 })] };
    expect(saleProfit(sale, COSTS)).toBe(700);
  });
  it('bidhaa kadhaa', () => {
    const sale = { profit: null, items: [
      item({ qty: 4 }),
      item({ productId: 'p2', qty: 3, price: 3000 }),
    ] };
    expect(saleProfit(sale, COSTS)).toBe(1200 + 4500);
  });
  it('mauzo bila bidhaa', () => {
    expect(saleProfit({ profit: null, items: [] }, COSTS)).toBe(0);
    expect(saleProfit({ profit: null }, COSTS)).toBe(0);
    expect(saleProfit({ profit: null, items: 'si-orodha' }, COSTS)).toBe(0);
  });
  it('NaN si faida halali — inahesabiwa upya', () => {
    expect(saleProfit({ profit: NaN, items: [item({ qty: 4 })] }, COSTS)).toBe(1200);
  });
  it('bidhaa iliyofutwa inatumia gharama iliyohifadhiwa', () => {
    const sale = { profit: null, items: [{ productId: 'imefutwa', qty: 2, price: 1000, cost: 700 }] };
    expect(saleProfit(sale, COSTS)).toBe(600);
  });
});

describe('withProfit', () => {
  it('inarudisha kitu KILE KILE ikiwa faida ipo (React isirender bure)', () => {
    const s = { profit: 1200, items: [] };
    expect(withProfit(s, COSTS)).toBe(s);
  });
  it('inarudisha kipya chenye faida ikiwa haipo', () => {
    const s = { profit: null, items: [item({ qty: 4 })] };
    const r = withProfit(s, COSTS);
    expect(r).not.toBe(s);
    expect(r.profit).toBe(1200);
    expect(r.items).toBe(s.items);
  });
});

describe('returnProfit — faida inayorudishwa', () => {
  it('marejesho yenye bei yaliyohifadhiwa', () => {
    expect(returnProfit([{ items: [item({ qty: 1, buyPrice: 700 })] }], COSTS)).toBe(300);
  });
  it('MAREJESHO BILA BEI — jedwali linaokoa', () => {
    // Kosa la awali: bila costMap, marejesho yalipunguza MAUZO YOTE
    // (1000) badala ya faida (300).
    expect(returnProfit([{ items: [item({ qty: 1 })] }], COSTS)).toBe(300);
    expect(returnProfit([{ items: [item({ qty: 1 })] }])).toBe(1000);
  });
  it('marejesho mengi', () => {
    const rs = [{ items: [item({ qty: 2 })] }, { items: [item({ productId: 'p2', qty: 1, price: 3000 })] }];
    expect(returnProfit(rs, COSTS)).toBe(600 + 1500);
  });
  it('orodha tupu', () => {
    expect(returnProfit([], COSTS)).toBe(0);
    expect(returnProfit(null, COSTS)).toBe(0);
    expect(returnProfit([{}], COSTS)).toBe(0);
  });
});

describe('netProfit — faida ya kipindi', () => {
  const sales = [
    { profit: 1200, items: [item({ qty: 4, buyPrice: 700 })] },
    { profit: null, items: [item({ productId: 'p2', qty: 3, price: 3000 })] },
  ];
  it('inajumlisha mauzo ya mwenye duka NA ya muuzaji', () => {
    expect(netProfit(sales, [], COSTS)).toBe(1200 + 4500);
  });
  it('marejesho ya taslimu yanapunguza', () => {
    expect(netProfit(sales, [{ items: [item({ qty: 1 })] }], COSTS)).toBe(5700 - 300);
  });
  it('marejesho ya DENI hayapunguzi (pesa haikuwa imeingia)', () => {
    const rs = [{ was_credit: true, items: [item({ qty: 1 })] }];
    expect(netProfit(sales, rs, COSTS)).toBe(5700);
  });
  it('haiwezi kuwa chini ya sifuri', () => {
    const rs = [{ items: [item({ productId: 'p2', qty: 100, price: 3000 })] }];
    expect(netProfit(sales, rs, COSTS)).toBe(0);
  });
  it('siku isiyo na mauzo', () => {
    expect(netProfit([], [], COSTS)).toBe(0);
  });
});

describe('saleRevenue na saleCost', () => {
  it('mapato na gharama vinalingana na faida', () => {
    const sale = { profit: null, discount: 0, items: [
      item({ qty: 4 }), item({ productId: 'p2', qty: 3, price: 3000 }),
    ] };
    const rev = saleRevenue(sale), cost = saleCost(sale, COSTS);
    expect(rev).toBe(4000 + 9000);
    expect(cost).toBe(2800 + 4500);
    expect(rev - cost).toBe(saleProfit(sale, COSTS));
  });
});

describe('margin', () => {
  it('asilimia ya faida', () => {
    expect(margin(300, 1000)).toBe(30);
    expect(margin(1500, 3000)).toBe(50);
  });
  it('haigawanyi kwa sifuri', () => {
    expect(margin(500, 0)).toBe(0);
    expect(margin(0, 0)).toBe(0);
  });
  it('hasara inatoa asilimia hasi', () => {
    expect(margin(-200, 1000)).toBe(-20);
  });
});

describe('hali halisi ya dukani', () => {
  it('siku kamili: mwenye duka + muuzaji + rejesho + punguzo', () => {
    const sales = [
      // Mwenye duka: sabuni 4 @1000
      { profit: 1200, items: [item({ qty: 4, buyPrice: 700 })] },
      // Muuzaji (profit NULL, hakuna bei): sukari 3 @3000
      { profit: null, discount: 0, items: [item({ productId: 'p2', qty: 3, price: 3000 })] },
      // Muuzaji baada ya SQL (database imeweka cost + lineProfit)
      { profit: 600, items: [item({ qty: 2, cost: 700, lineProfit: 600 })] },
      // Mauzo yenye punguzo la 500
      { profit: null, discount: 500, items: [item({ qty: 4 })] },
    ];
    const returns = [{ items: [item({ qty: 1 })] }];

    const revenue = sales.reduce((a, s) => a + saleRevenue(s), 0);
    expect(revenue).toBe(4000 + 9000 + 2000 + 4000);

    // 1200 + 4500 + 600 + 700 = 7000, kasoro rejesho 300
    expect(netProfit(sales, returns, COSTS)).toBe(6700);
    expect(margin(6700, revenue)).toBe(35);
  });
});

// ============================================================
// MAPATO YA DUKALANGU — malipo ya wateja kwako
// ============================================================
import { txAmt, txMonth, txDate, sumTx } from './money.js';

describe('mapato ya DukaLangu', () => {
  const TX = [
    { amount: 25000, paid_at: '2026-11-03T08:00:00Z' },
    { amount: 35000, paid_at: '2026-11-14T10:00:00Z' },
    { amount: 15000, created_at: '2026-10-28T09:00:00Z' },
  ];
  it('inajumlisha malipo halisi', () => {
    expect(sumTx(TX)).toBe(75000);
  });
  it('orodha tupu si NaN', () => {
    expect(sumTx([])).toBe(0);
    expect(sumTx(null)).toBe(0);
    expect(sumTx(undefined)).toBe(0);
  });
  it('malipo yasiyo na kiasi hayavunji jumla', () => {
    expect(sumTx([{ amount: 25000 }, {}, { amount: null }, { amount: 'abc' }])).toBe(25000);
  });
  it('kiasi cha maandishi kinabadilishwa', () => {
    expect(txAmt({ amount: '25000' })).toBe(25000);
  });
  it('mwezi unatoka paid_at, au created_at ikikosekana', () => {
    expect(txMonth(TX[0])).toBe('2026-11');
    expect(txMonth(TX[2])).toBe('2026-10');
    expect(txMonth({})).toBe('');
  });
  it('tarehe inatoka paid_at', () => {
    expect(txDate(TX[1])).toBe('2026-11-14');
    expect(txDate({})).toBe('');
  });
  it('kuchuja kwa mwezi kunatoa jumla sahihi', () => {
    expect(sumTx(TX.filter(t => txMonth(t) === '2026-11'))).toBe(60000);
  });
});
