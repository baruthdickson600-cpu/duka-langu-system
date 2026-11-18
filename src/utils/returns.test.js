// ============================================================
// Majaribio ya marejesho
//
// Kosa halisi: mteja aliuza bidhaa MOJA, akairudisha MARA 10.
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  soldUnits, returnedUnits, returnableUnits, fullyReturned, validateReturn,
} from './returns.js';

const SALE = {
  id: 's1',
  items: [
    { productId: 'p1', name: 'Sabuni', qty: 1, price: 1000, fraction: 1 },
    { productId: 'p2', name: 'Sukari', qty: 4, price: 3000, fraction: 1 },
  ],
};
const ret = (items, saleId = 's1') => ({ id: 'r' + Math.random(), sale_id: saleId, items });

describe('soldUnits', () => {
  it('inahesabu vipimo vilivyouzwa', () => {
    const m = soldUnits(SALE);
    expect(m.get('p1')).toBe(1);
    expect(m.get('p2')).toBe(4);
  });
  it('nusu kilo: qty 2 x fraction 0.5 = kilo 1', () => {
    const m = soldUnits({ items: [{ productId: 'x', qty: 2, price: 3000, fraction: 0.5 }] });
    expect(m.get('x')).toBe(1);
  });
  it('bidhaa ile ile mara mbili inajumlishwa', () => {
    const m = soldUnits({ items: [
      { productId: 'x', qty: 2, price: 100 }, { productId: 'x', qty: 3, price: 100 }] });
    expect(m.get('x')).toBe(5);
  });
  it('mauzo batili', () => {
    expect(soldUnits(null).size).toBe(0);
    expect(soldUnits({}).size).toBe(0);
  });
});

describe('returnedUnits', () => {
  it('inahesabu marejesho ya mauzo HAYO pekee', () => {
    const rs = [
      ret([{ productId: 'p1', qty: 1, price: 1000 }]),
      ret([{ productId: 'p1', qty: 1, price: 1000 }], 's-nyingine'),
    ];
    expect(returnedUnits(rs, 's1').get('p1')).toBe(1);
  });
  it('marejesho mengi yanajumlishwa', () => {
    const rs = [
      ret([{ productId: 'p2', qty: 1, price: 3000 }]),
      ret([{ productId: 'p2', qty: 2, price: 3000 }]),
    ];
    expect(returnedUnits(rs, 's1').get('p2')).toBe(3);
  });
});

describe('returnableUnits', () => {
  it('hakuna rejesho bado -> zote zinaweza kurudishwa', () => {
    const m = returnableUnits(SALE, []);
    expect(m.get('p1')).toBe(1);
    expect(m.get('p2')).toBe(4);
  });
  it('baada ya kurudisha, iliyobaki inapungua', () => {
    const m = returnableUnits(SALE, [ret([{ productId: 'p2', qty: 3, price: 3000 }])]);
    expect(m.get('p2')).toBe(1);
  });
  it('haiwezi kuwa chini ya sifuri', () => {
    const m = returnableUnits(SALE, [ret([{ productId: 'p1', qty: 99, price: 1000 }])]);
    expect(m.get('p1')).toBe(0);
  });
});

describe('fullyReturned', () => {
  it('mauzo yasiyorudishwa', () => {
    expect(fullyReturned(SALE, [])).toBe(false);
  });
  it('mauzo yaliyorudishwa yote', () => {
    const rs = [ret([
      { productId: 'p1', qty: 1, price: 1000 },
      { productId: 'p2', qty: 4, price: 3000 }])];
    expect(fullyReturned(SALE, rs)).toBe(true);
  });
  it('yaliyorudishwa nusu', () => {
    expect(fullyReturned(SALE, [ret([{ productId: 'p1', qty: 1, price: 1000 }])])).toBe(false);
  });
});

describe('validateReturn — KOSA LILILOTOKEA', () => {
  it('rejesho la kwanza halali linapita', () => {
    const r = validateReturn(SALE, [], [{ productId: 'p1', name: 'Sabuni', qty: 1, price: 1000 }]);
    expect(r.ok).toBe(true);
    expect(r.items[0].qty).toBe(1);
    expect(r.refund).toBe(1000);
    expect(r.problems).toHaveLength(0);
  });

  // ===== HAPA NDIPO MTEJA ALIKUWA ANARUDISHA MARA 10 =====
  it('aliuza 1 na akarudisha 1: rejesho la PILI linakataliwa', () => {
    const rs = [ret([{ productId: 'p1', qty: 1, price: 1000 }])];
    const r = validateReturn(SALE, rs, [{ productId: 'p1', name: 'Sabuni', qty: 1, price: 1000 }]);
    expect(r.ok).toBe(false);
    expect(r.items).toHaveLength(0);
    expect(r.refund).toBe(0);
    expect(r.problems[0]).toContain('imerudishwa yote');
  });

  it('kurudisha mara 10 kunazuiwa kila mara', () => {
    let rs = [];
    let kupita = 0;
    for (let i = 0; i < 10; i++) {
      const r = validateReturn(SALE, rs, [{ productId: 'p1', name: 'Sabuni', qty: 1, price: 1000 }]);
      if (r.ok) { kupita++; rs = [...rs, ret(r.items)] }
    }
    expect(kupita).toBe(1);   // moja pekee, si 10
  });

  it('kuomba zaidi ya ilivyouzwa kunapunguzwa', () => {
    const r = validateReturn(SALE, [], [{ productId: 'p2', name: 'Sukari', qty: 10, price: 3000 }]);
    expect(r.items[0].qty).toBe(4);          // si 10
    expect(r.refund).toBe(12000);            // si 30,000
    expect(r.problems[0]).toContain('iliyobaki ni 4');
  });

  it('marejesho ya sehemu yanafuatana vizuri', () => {
    const rs = [ret([{ productId: 'p2', qty: 3, price: 3000 }])];
    const r = validateReturn(SALE, rs, [{ productId: 'p2', name: 'Sukari', qty: 3, price: 3000 }]);
    expect(r.items[0].qty).toBe(1);          // moja iliyobaki pekee
    expect(r.refund).toBe(3000);
  });

  it('bidhaa isiyokuwa kwenye mauzo inakataliwa', () => {
    const r = validateReturn(SALE, [], [{ productId: 'pX', name: 'Mafuta', qty: 1, price: 50000 }]);
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toContain('haikuwa kwenye mauzo');
  });

  it('BEI inatoka kwenye mauzo, si kwenye ombi', () => {
    // Mteja akijaribu kuomba marejesho kwa bei kubwa
    const r = validateReturn(SALE, [], [{ productId: 'p1', name: 'Sabuni', qty: 1, price: 999999 }]);
    expect(r.items[0].price).toBe(1000);
    expect(r.refund).toBe(1000);
  });

  it('bidhaa ile ile mara mbili kwenye ombi moja haipiti kiwango', () => {
    const r = validateReturn(SALE, [], [
      { productId: 'p1', name: 'Sabuni', qty: 1, price: 1000 },
      { productId: 'p1', name: 'Sabuni', qty: 1, price: 1000 },
    ]);
    const jumla = r.items.reduce((s, i) => s + i.qty * (i.fraction || 1), 0);
    expect(jumla).toBe(1);
    expect(r.refund).toBe(1000);
  });

  it('nusu kilo: kurudisha nusu kilo mara mbili ni kilo moja', () => {
    const sale = { id: 's2', items: [{ productId: 'k', name: 'Sukari', qty: 2, price: 3000, fraction: 0.5 }] };
    const r1 = validateReturn(sale, [], [{ productId: 'k', qty: 1, price: 3000, fraction: 0.5 }]);
    expect(r1.ok).toBe(true);
    expect(r1.refund).toBe(1500);
    const r2 = validateReturn(sale, [ret(r1.items, 's2')], [{ productId: 'k', qty: 1, price: 3000, fraction: 0.5 }]);
    expect(r2.ok).toBe(true);
    const r3 = validateReturn(sale, [ret(r1.items, 's2'), ret(r2.items, 's2')],
      [{ productId: 'k', qty: 1, price: 3000, fraction: 0.5 }]);
    expect(r3.ok).toBe(false);               // kilo imekwisha
  });

  it('idadi 0 au hasi inaruka', () => {
    const r = validateReturn(SALE, [], [
      { productId: 'p1', qty: 0, price: 1000 },
      { productId: 'p2', qty: -5, price: 3000 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.items).toHaveLength(0);
  });

  it('mauzo yasiyopatikana', () => {
    const r = validateReturn(null, [], [{ productId: 'p1', qty: 1, price: 1000 }]);
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toContain('hayajapatikana');
  });
});
