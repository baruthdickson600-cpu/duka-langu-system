// ============================================================
// Majaribio ya uwakala
//
// Kila jaribio hapa linawakilisha hali halisi ya wakala. Mengi
// yanalinda njia za upotevu wa pesa zilizoainishwa kwenye muundo.
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  TX, txLabel, needsLine, isKnownType, txDeltas, validateTx,
  floatAfter, cashAfter, commissionTotal,
  reconcileLine, reconcileCash, varianceState, dayTotals, wakalaAccess,
} from './wakala.js';

const L1 = 'line-mpesa', L2 = 'line-airtel';
const LINES = [{ id: L1 }, { id: L2 }];
const tx = (type, amount, o = {}) => ({ type, amount, line_id: L1, ...o });

describe('aina za miamala', () => {
  it('kuweka: taslimu inaingia, float inatoka', () => {
    expect(txDeltas(tx('deposit', 50000))).toMatchObject({ cash: 50000, float: -50000 });
  });
  it('kutoa: taslimu inatoka, float inaingia', () => {
    expect(txDeltas(tx('withdraw', 50000))).toMatchObject({ cash: -50000, float: 50000 });
  });
  it('kununua float: taslimu inatoka, float inaingia', () => {
    expect(txDeltas(tx('float_buy', 200000))).toMatchObject({ cash: -200000, float: 200000 });
  });
  it('kuuza float: kinyume chake', () => {
    expect(txDeltas(tx('float_sell', 200000))).toMatchObject({ cash: 200000, float: -200000 });
  });
  it('mtaji na kutoa pesa havigusi float', () => {
    expect(txDeltas({ type: 'cash_in', amount: 100000 })).toMatchObject({ cash: 100000, float: 0 });
    expect(txDeltas({ type: 'cash_out', amount: 100000 })).toMatchObject({ cash: -100000, float: 0 });
  });
  it('aina isiyojulikana haibadilishi chochote', () => {
    expect(txDeltas({ type: 'hewa', amount: 999 })).toEqual({ cash: 0, float: 0, commission: 0 });
    expect(txDeltas(null)).toEqual({ cash: 0, float: 0, commission: 0 });
  });
  it('majina na mahitaji ya laini', () => {
    expect(txLabel('deposit')).toBe('Kuweka');
    expect(txLabel('kitu')).toBe('kitu');
    expect(needsLine('deposit')).toBe(true);
    expect(needsLine('cash_in')).toBe(false);
    expect(isKnownType('withdraw')).toBe(true);
    expect(isKnownType('toString')).toBe(false);
  });
});

describe('kamisheni', () => {
  it('HAIGUSI taslimu wala float — mitandao inalipa baadaye', () => {
    const d = txDeltas(tx('withdraw', 50000, { commission: 800 }));
    expect(d.cash).toBe(-50000);
    expect(d.float).toBe(50000);
    expect(d.commission).toBe(800);
  });
  it('kununua float hakuzalishi kamisheni hata ikiandikwa', () => {
    expect(txDeltas(tx('float_buy', 200000, { commission: 5000 })).commission).toBe(0);
  });
  it('jumla ya kamisheni', () => {
    expect(commissionTotal([
      tx('deposit', 10000, { commission: 300 }),
      tx('withdraw', 50000, { commission: 800 }),
      tx('float_buy', 200000, { commission: 999 }),
    ])).toBe(1100);
  });
});

describe('marejesho', () => {
  it('yanageuza muamala kabisa', () => {
    const asili = tx('withdraw', 50000, { commission: 800 });
    const rejesho = { ...asili, reverses: 'tx-1' };
    const a = txDeltas(asili), r = txDeltas(rejesho);
    expect(r.cash).toBe(-a.cash);
    expect(r.float).toBe(-a.float);
    expect(r.commission).toBe(-a.commission);
  });
  it('muamala pamoja na rejesho lake = sifuri', () => {
    const t = tx('deposit', 30000, { commission: 500 });
    const list = [t, { ...t, reverses: 'x' }];
    expect(cashAfter(0, list)).toBe(0);
    expect(floatAfter(0, list, L1)).toBe(0);
    expect(commissionTotal(list)).toBe(0);
  });
});

describe('uhakiki', () => {
  it('muamala sahihi unapita', () => {
    expect(validateTx(tx('deposit', 10000, { commission: 300 }), { lines: LINES }).ok).toBe(true);
  });
  it('kiasi sifuri au hasi kinakataliwa', () => {
    expect(validateTx(tx('deposit', 0), { lines: LINES }).ok).toBe(false);
    expect(validateTx(tx('deposit', -500), { lines: LINES }).ok).toBe(false);
  });
  it('laini inahitajika kwa kuweka na kutoa', () => {
    const r = validateTx({ type: 'deposit', amount: 1000 }, { lines: LINES });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('laini');
  });
  it('laini isiyopo inakataliwa', () => {
    expect(validateTx(tx('deposit', 1000, { line_id: 'hewa' }), { lines: LINES }).ok).toBe(false);
  });
  it('mtaji hauhitaji laini', () => {
    expect(validateTx({ type: 'cash_in', amount: 50000 }, { lines: LINES }).ok).toBe(true);
  });
  it('kamisheni kubwa kuliko muamala ni kosa la kuandika', () => {
    const r = validateTx(tx('withdraw', 5000, { commission: 9000 }), { lines: LINES });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain('Kamisheni');
  });
  it('aina isiyojulikana inakataliwa', () => {
    expect(validateTx({ type: 'hewa', amount: 100 }).ok).toBe(false);
  });
});

describe('salio', () => {
  const txs = [
    tx('deposit', 50000), tx('withdraw', 30000),
    tx('deposit', 20000, { line_id: L2 }),
    { type: 'cash_in', amount: 100000 },
  ];
  it('float inahesabiwa KWA KILA LAINI peke yake', () => {
    expect(floatAfter(500000, txs, L1)).toBe(500000 - 50000 + 30000);
    expect(floatAfter(200000, txs, L2)).toBe(200000 - 20000);
  });
  it('taslimu ni moja kwa shughuli zote', () => {
    expect(cashAfter(100000, txs)).toBe(100000 + 50000 - 30000 + 20000 + 100000);
  });
  it('orodha tupu inarudisha ya asubuhi', () => {
    expect(floatAfter(500000, [], L1)).toBe(500000);
    expect(cashAfter(80000, null)).toBe(80000);
  });
  it('data batili haitoi NaN', () => {
    expect(cashAfter(1000, [null, { type: 'deposit', amount: 'abc' }])).toBe(1000);
  });
});

describe('upatanisho — hapa ndipo upotevu unapokamatwa', () => {
  it('kila kitu sawa', () => {
    const txs = [tx('deposit', 50000), tx('withdraw', 30000)];
    const r = reconcileLine({ openingFloat: 500000, txs, lineId: L1, countedFloat: 480000 });
    expect(r.expected).toBe(480000);
    expect(r.variance).toBe(0);
  });

  // Njia 1: ameandika kidogo kuliko alivyotoa
  it('ameandika 30,000 wakati ametoa 50,000 -> ZIADA ya float', () => {
    const txs = [tx('withdraw', 30000)];
    const r = reconcileLine({ openingFloat: 500000, txs, lineId: L1, countedFloat: 550000 });
    expect(r.variance).toBe(20000);
    expect(varianceState(r.variance, 1000)).toBe('ziada');
  });

  // Njia 2: hakuandika kabisa
  it('hakuandika muamala -> UPUNGUFU wa float', () => {
    const r = reconcileLine({ openingFloat: 500000, txs: [], lineId: L1, countedFloat: 460000 });
    expect(r.variance).toBe(-40000);
    expect(varianceState(r.variance, 1000)).toBe('upungufu');
  });

  // Njia 4: amechukua taslimu kasheni
  it('amechukua taslimu -> UPUNGUFU wa taslimu', () => {
    const txs = [tx('deposit', 50000)];
    const r = reconcileCash({ openingCash: 100000, txs, countedCash: 130000 });
    expect(r.expected).toBe(150000);
    expect(r.variance).toBe(-20000);
  });

  it('tofauti ndogo ndani ya kiwango cha mmiliki', () => {
    expect(varianceState(-500, 1000)).toBe('ndogo');
    expect(varianceState(0, 1000)).toBe('sawa');
    expect(varianceState(-5000, 1000)).toBe('upungufu');
    expect(varianceState(5000, 0)).toBe('ziada');
  });
});

describe('muhtasari wa siku', () => {
  const txs = [
    tx('deposit', 50000, { commission: 500 }),
    tx('deposit', 20000, { commission: 300 }),
    tx('withdraw', 80000, { commission: 1200 }),
    tx('float_buy', 500000),
    { type: 'cash_in', amount: 200000 },
    { ...tx('deposit', 10000, { commission: 200 }), reverses: 'x' },
  ];
  it('inahesabu kila aina peke yake', () => {
    const t = dayTotals(txs);
    expect(t.kuweka).toBe(70000);
    expect(t.idadiKuweka).toBe(2);
    expect(t.kutoa).toBe(80000);
    expect(t.floatNunuliwa).toBe(500000);
    expect(t.mtaji).toBe(200000);
    expect(t.marejesho).toBe(1);
  });
  it('marejesho yanapunguza kamisheni', () => {
    expect(dayTotals(txs).kamisheni).toBe(500 + 300 + 1200 - 200);
  });
  it('siku tupu', () => {
    const t = dayTotals([]);
    expect(t.idadi).toBe(0); expect(t.kuweka).toBe(0); expect(t.kamisheni).toBe(0);
  });
});

describe('usajili wa uwakala', () => {
  const siku = n => new Date(Date.now() + n * 86400000).toISOString();

  it('admin hajawasha -> hakuna chochote', () => {
    const a = wakalaAccess({ enabled: false, paidUntil: siku(30) });
    expect(a.visible).toBe(false);
    expect(a.canRecord).toBe(false);
  });
  it('amewasha lakini hajalipa kamwe', () => {
    const a = wakalaAccess({ enabled: true, paidUntil: null });
    expect(a.visible).toBe(true);
    expect(a.canRecord).toBe(false);
    expect(a.neverPaid).toBe(true);
  });
  it('amelipa -> anaandika kawaida', () => {
    const a = wakalaAccess({ enabled: true, paidUntil: siku(20) });
    expect(a.canRecord).toBe(true);
    expect(a.warn).toBe(false);
    expect(a.daysLeft).toBeGreaterThan(15);
  });
  it('siku 5 zimebaki -> onyo', () => {
    expect(wakalaAccess({ enabled: true, paidUntil: siku(4) }).warn).toBe(true);
  });

  // Hii ndiyo muhimu: pesa isibaki bila kuhesabiwa
  it('imeisha -> HAWEZI kuandika, LAKINI anaweza kufunga siku', () => {
    const a = wakalaAccess({ enabled: true, paidUntil: siku(-2) });
    expect(a.expired).toBe(true);
    expect(a.canRecord).toBe(false);
    expect(a.canClose).toBe(true);
    expect(a.visible).toBe(true);
  });
  it('baada ya siku 7 za neema -> kila kitu kimefungwa', () => {
    const a = wakalaAccess({ enabled: true, paidUntil: siku(-9) });
    expect(a.canClose).toBe(false);
    expect(a.visible).toBe(false);
  });
  it('tarehe batili inahesabiwa kama hajalipa', () => {
    expect(wakalaAccess({ enabled: true, paidUntil: 'si-tarehe' }).canRecord).toBe(false);
  });
});
