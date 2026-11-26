import { describe, it, expect } from 'vitest';
import { siku, haliYa, HALI, KARIBU, hesabuZaWateja, pangaKwaDharura } from './wateja';

const SASA = Date.parse('2026-11-26T09:00:00+03:00');
const siku_n = n => new Date(SASA + n * 86400000).toISOString();

const analipa  = (n) => ({ id: 'a' + n, token_active: true,  token_expiry: siku_n(n) });
const trial    = (n) => ({ id: 't' + n, token_active: false, trial_end: siku_n(n) });

describe('siku zilizobaki', () => {
  it('analipa inasoma token_expiry', () => {
    expect(siku(analipa(30), SASA)).toBe(30);
  });
  it('trial inasoma trial_end, si token_expiry', () => {
    expect(siku({ token_active: false, trial_end: siku_n(3), token_expiry: siku_n(99) }, SASA)).toBe(3);
  });
  it('iliyoisha inarudisha hasi', () => {
    expect(siku(analipa(-4), SASA)).toBe(-4);
  });
  it('bila tarehe inarudisha null, si NaN wala 999', () => {
    expect(siku({ token_active: true }, SASA)).toBe(null);
    expect(siku({}, SASA)).toBe(null);
    expect(siku(null, SASA)).toBe(null);
  });
  it('tarehe mbovu hairudishi NaN', () => {
    expect(siku({ token_active: true, token_expiry: 'si-tarehe' }, SASA)).toBe(null);
  });
});

describe('hali ya mteja', () => {
  it('analipa na muda mrefu ni analipa', () => {
    expect(haliYa(analipa(30), SASA)).toBe('analipa');
  });

  // Hii ndiyo kazi ya supevaiza: kumkamata kabla hajakatika
  it('analipa lakini anaishiwa ndani ya siku 5 ni kulipia', () => {
    expect(haliYa(analipa(5), SASA)).toBe('kulipia');
    expect(haliYa(analipa(1), SASA)).toBe('kulipia');
    expect(haliYa(analipa(0), SASA)).toBe('kulipia');
  });

  it('siku 6 bado ni analipa — mpaka ni 5', () => {
    expect(haliYa(analipa(6), SASA)).toBe('analipa');
    expect(KARIBU).toBe(5);
  });

  it('trial inayoendelea ni trial', () => {
    expect(haliYa(trial(2), SASA)).toBe('trial');
  });

  it('trial iliyoisha ni kulipia, si trial', () => {
    expect(haliYa(trial(-1), SASA)).toBe('kulipia');
  });

  it('aliyesimamishwa ni ameondoka hata kama ana muda', () => {
    expect(haliYa({ ...analipa(30), is_suspended: true }, SASA)).toBe('ameondoka');
  });

  it('asiye na tarehe yoyote ni trial, si kulipia', () => {
    // Hatujui lolote kuhusu yeye — tusimpe dharura ya uongo
    expect(haliYa({ token_active: false }, SASA)).toBe('trial');
  });

  it('kila hali ina jina na rangi', () => {
    ['kulipia', 'trial', 'analipa', 'ameondoka'].forEach(k => {
      expect(HALI[k].lab).toBeTruthy();
      expect(HALI[k].rangi).toMatch(/^#/);
    });
  });
});

describe('hesabu', () => {
  const orodha = [analipa(30), analipa(2), trial(3), trial(-2), { ...analipa(10), is_suspended: true }];

  it('kila mteja anahesabiwa mara moja tu', () => {
    const h = hesabuZaWateja(orodha, SASA);
    expect(h.wote).toBe(5);
    expect(h.kulipia + h.trial + h.analipa + h.ameondoka).toBe(5);
  });

  it('hesabu ni sahihi', () => {
    const h = hesabuZaWateja(orodha, SASA);
    expect(h.analipa).toBe(1);
    expect(h.kulipia).toBe(2);     // analipa(2) + trial iliyoisha
    expect(h.trial).toBe(1);
    expect(h.ameondoka).toBe(1);
  });

  it('orodha tupu haivunjiki', () => {
    expect(hesabuZaWateja([], SASA).wote).toBe(0);
    expect(hesabuZaWateja(null, SASA).wote).toBe(0);
  });
});

describe('mpangilio wa dharura', () => {
  it('wanaotakiwa kulipia wanakuja kwanza', () => {
    const l = pangaKwaDharura([analipa(30), trial(-5), analipa(2)], SASA);
    expect(haliYa(l[0], SASA)).toBe('kulipia');
    expect(haliYa(l[1], SASA)).toBe('kulipia');
  });

  it('aliyeishiwa zaidi anakuja juu', () => {
    const l = pangaKwaDharura([analipa(3), trial(-10), analipa(1)], SASA);
    expect(siku(l[0], SASA)).toBe(-10);
  });

  it('asiye na tarehe anaenda mwisho', () => {
    const bila = { id: 'x', token_active: false };
    const l = pangaKwaDharura([bila, trial(3)], SASA);
    expect(l[l.length - 1].id).toBe('x');
  });

  it('haibadilishi orodha ya awali', () => {
    const asili = [analipa(30), analipa(1)];
    const nakala = [...asili];
    pangaKwaDharura(asili, SASA);
    expect(asili).toEqual(nakala);
  });
});
