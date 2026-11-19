// ============================================================
// Majaribio: safu isiyokuwepo isiharibu mauzo
//
// KOSA HALISI: niliacha offline_id itumwe bila kuhakikisha safu
// ipo kwenye database. PostgREST ilikataa ombi ZIMA kwa 400, na
// KILA MAUZO yakakataliwa — "Mauzo 3 yamekataliwa na mfumo na
// HAYAPO kwenye ripoti". Hayakufika kwa mmiliki, yakatoweka
// baada ya refresh, wakati stock ilikuwa imeshapungua.
//
// Somo: mfumo haupaswi KAMWE kutegemea SQL kuwa imeendeshwa.
// ============================================================
import { describe, it, expect } from 'vitest';
import { unknownColumn } from './offlineDB.js';

describe('unknownColumn', () => {
  it('PGRST204 — schema cache ya Supabase', () => {
    expect(unknownColumn(
      "Could not find the 'offline_id' column of 'sales' in the schema cache"
    )).toBe('offline_id');
  });
  it('42703 — kosa la Postgres', () => {
    expect(unknownColumn(
      'column "offline_id" of relation "sales" does not exist'
    )).toBe('offline_id');
  });
  it('umbo la tatu', () => {
    expect(unknownColumn('column offline_id does not exist')).toBe('offline_id');
  });
  it('JSON ya PostgREST nzima', () => {
    expect(unknownColumn(JSON.stringify({
      code: 'PGRST204',
      message: "Could not find the 'stock_applied' column of 'sales' in the schema cache",
    }))).toBe('stock_applied');
  });
  it('kosa jingine halitambuliwi kama safu', () => {
    expect(unknownColumn('duplicate key value violates unique constraint')).toBeNull();
    expect(unknownColumn('new row violates row-level security policy')).toBeNull();
    expect(unknownColumn('')).toBeNull();
    expect(unknownColumn(null)).toBeNull();
  });
  it('constraint ya payment_method si safu', () => {
    expect(unknownColumn(
      'new row for relation "sales" violates check constraint "sales_payment_method_check"'
    )).toBeNull();
  });
});
