// ============================================================
// Majaribio ya hesabu ya pesa mkononi
// ============================================================
import { describe, it, expect } from 'vitest';
import { cashReport, mineOnly, isCash, isCredit, isDigital } from './cash.js';

const s = (total, pm) => ({ total, payment_method: pm });
const e = (amount, pm, by) => ({ amount, payment_method: pm, recorded_by: by });

describe('aina za malipo', () => {
  it('taslimu, na rekodi za zamani zisizo na njia', () => {
    expect(isCash(s(1000, 'cash'))).toBe(true);
    expect(isCash(s(1000))).toBe(true);
    expect(isCash(s(1000, ''))).toBe(true);
  });
  it('deni si taslimu wala simu', () => {
    expect(isCredit(s(1000, 'credit'))).toBe(true);
    expect(isCash(s(1000, 'credit'))).toBe(false);
    expect(isDigital(s(1000, 'credit'))).toBe(false);
  });
  it('M-Pesa na benki ni za simu', () => {
    expect(isDigital(s(1000, 'mpesa'))).toBe(true);
    expect(isDigital(s(1000, 'halopesa'))).toBe(true);
    expect(isDigital(s(1000, 'bank'))).toBe(true);
  });
});

describe('cashReport', () => {
  const sales = [s(45000, 'cash'), s(12000, 'mpesa'), s(9000, 'cash'), s(20000, 'credit')];
  const expenses = [e(8000, 'cash'), e(3000, 'mpesa')];

  it('inatenganisha taslimu, simu na deni', () => {
    const r = cashReport({ sales, expenses });
    expect(r.taslimu).toBe(54000);
    expect(r.simu).toBe(12000);
    expect(r.deni).toBe(20000);
  });
  it('mauzo yote ni jumla ya zote tatu', () => {
    expect(cashReport({ sales }).mauzo).toBe(86000);
  });
  it('pesa iliyoingia haijumuishi deni', () => {
    expect(cashReport({ sales }).mapato).toBe(66000);
  });
  it('PESA MKONONI = taslimu kasoro matumizi ya taslimu', () => {
    // M-Pesa (12,000) na deni (20,000) hazipo mkononi;
    // matumizi ya M-Pesa (3,000) hayatoi pesa mkononi
    expect(cashReport({ sales, expenses }).mkononi).toBe(54000 - 8000);
  });
  it('matumizi yanatenganishwa kwa njia', () => {
    const r = cashReport({ sales, expenses });
    expect(r.matumiziTaslimu).toBe(8000);
    expect(r.matumiziSimu).toBe(3000);
    expect(r.matumizi).toBe(11000);
  });
  it('matumizi yasiyo na njia ni taslimu', () => {
    expect(cashReport({ sales: [s(10000, 'cash')], expenses: [{ amount: 4000 }] }).mkononi).toBe(6000);
  });
  it('matumizi yakizidi taslimu, mkononi inakuwa hasi (onyo la kweli)', () => {
    expect(cashReport({ sales: [s(5000, 'cash')], expenses: [e(9000, 'cash')] }).mkononi).toBe(-4000);
  });
  it('siku tupu', () => {
    const r = cashReport({});
    expect(r.mauzo).toBe(0); expect(r.mkononi).toBe(0); expect(r.idadiMauzo).toBe(0);
  });
  it('data batili haitoi NaN', () => {
    const r = cashReport({ sales: [{ total: 'abc' }, null], expenses: [{ amount: null }] });
    expect(r.mauzo).toBe(0); expect(r.mkononi).toBe(0);
  });
  it('inahesabu idadi', () => {
    const r = cashReport({ sales, expenses });
    expect(r.idadiMauzo).toBe(4); expect(r.idadiMatumizi).toBe(2);
  });
});

describe('mineOnly', () => {
  const list = [e(1000, 'cash', 'u1'), e(2000, 'cash', 'u2'), e(500, 'cash', 'u1')];
  it('inachuja matumizi ya mtu mmoja', () => {
    expect(mineOnly(list, 'u1')).toHaveLength(2);
    expect(cashReport({ expenses: mineOnly(list, 'u1') }).matumizi).toBe(1500);
  });
  it('mtumiaji asiye na matumizi', () => {
    expect(mineOnly(list, 'u9')).toHaveLength(0);
  });
  it('matumizi yasiyo na mwenyewe hayahesabiwi kwa mtu yeyote', () => {
    expect(mineOnly([{ amount: 100 }], 'u1')).toHaveLength(0);
    expect(mineOnly([{ amount: 100 }], undefined)).toHaveLength(0);
  });
});
