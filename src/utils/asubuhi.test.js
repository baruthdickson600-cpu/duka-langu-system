// ============================================================
// Ujumbe wa uchambuzi wa asubuhi
//
// SMS inalipiwa kwa kila herufi 160. Ujumbe huu LAZIMA ukae
// ndani ya mbili (320), vinginevyo mmiliki analipa mara tatu
// kila siku bila kujua.
// ============================================================
import { describe, it, expect } from 'vitest';
import { tengenezaUjumbe } from '../../api/cron/wakala-asubuhi.js';

const biz = { name: 'Duka la Baruth' };
const base = {
  day: '2026-11-21', idadi: 34, zaMteja: 32, marekebisho: 0,
  kuweka: 820000, kutoa: 640000, kamisheni: 12400, gharama: 0,
  thibitishwa: 30, imefungwa: true, tofautiTaslimu: 0, tofautiFloat: 0,
  float: { 'M-Pesa': 230000, 'Airtel Money': 88000 },
};

describe('ujumbe wa asubuhi', () => {
  it('siku ya kawaida inasomeka na ni fupi', () => {
    const m = tengenezaUjumbe(biz, base);
    expect(m).toContain('UWAKALA 21/11');
    expect(m).toContain('Miamala 32');
    expect(m).toContain('12,400');
    expect(m).toContain('M-Pesa 230,000');
    expect(m).toContain('hesabu ziko sawa');
    expect(m.length).toBeLessThanOrEqual(320);
  });

  it('SIKU ISIYOFUNGWA ndiyo hoja kuu ya arifa hii', () => {
    const m = tengenezaUjumbe(biz, { ...base, imefungwa: false });
    expect(m).toContain('SIKU HAIKUFUNGWA');
    expect(m).not.toContain('hesabu ziko sawa');
  });

  it('tofauti inatajwa kwa namba', () => {
    const m = tengenezaUjumbe(biz, { ...base, tofautiTaslimu: -25000, tofautiFloat: 4000 });
    expect(m).toContain('taslimu -25,000');
    expect(m).toContain('float 4,000');
  });

  it('faida inaonyeshwa pale gharama zilipoandikwa', () => {
    const m = tengenezaUjumbe(biz, { ...base, gharama: 35000 });
    expect(m).toContain('Gharama 35,000');
    expect(m).toContain('Faida -22,600');
  });

  it('gharama sifuri hazijazi ujumbe bure', () => {
    expect(tengenezaUjumbe(biz, base)).not.toContain('Gharama');
  });

  it('kiwango cha uthibitisho kinatajwa kikishuka tu', () => {
    expect(tengenezaUjumbe(biz, base)).not.toContain('Majina');
    const m = tengenezaUjumbe(biz, { ...base, thibitishwa: 10 });  // 31%
    expect(m).toContain('Majina yaliyothibitishwa 31%');
  });

  it('sampuli ndogo haitoi lawama', () => {
    const m = tengenezaUjumbe(biz, { ...base, zaMteja: 6, thibitishwa: 1 });
    expect(m).not.toContain('Majina');
  });

  it('hata siku mbaya kabisa inakaa ndani ya SMS mbili', () => {
    const m = tengenezaUjumbe(biz, {
      ...base, gharama: 125000, imefungwa: true,
      tofautiTaslimu: -250000, tofautiFloat: -180000,
      thibitishwa: 2, marekebisho: 7,
      float: { 'M-Pesa': 1230000, 'Airtel Money': 880000, 'Mixx by Yas': 440000 },
    });
    expect(m.length).toBeLessThanOrEqual(320);
  });

  it('data tupu haitoi NaN', () => {
    const m = tengenezaUjumbe(biz, { day: '2026-11-21' });
    expect(m).not.toMatch(/NaN|undefined/);
  });
});

// Emoji moja inabadilisha SMS kuwa Unicode: kikomo 160 -> 70.
// Ujumbe wa herufi 200 ungekuwa SMS TATU badala ya MBILI.
describe('gharama ya SMS', () => {
  const kesi = [
    { ...base },
    { ...base, imefungwa: false },
    { ...base, gharama: 35000, tofautiTaslimu: -25000, tofautiFloat: 4000 },
    { ...base, thibitishwa: 3, marekebisho: 4, gharama: 99000 },
  ];
  it('hakuna emoji wala herufi zinazolazimisha Unicode', () => {
    kesi.forEach(k => {
      const m = tengenezaUjumbe(biz, k);
      // eslint-disable-next-line no-control-regex
      expect(m).not.toMatch(/[^\u0000-\u007F -ÿ\n]/);
    });
  });
  it('kila ujumbe ni SMS mbili au chini', () => {
    kesi.forEach(k => expect(Math.ceil(tengenezaUjumbe(biz, k).length / 153)).toBeLessThanOrEqual(2));
  });
});
