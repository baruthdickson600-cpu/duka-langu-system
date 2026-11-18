// ============================================================
// Majaribio ya kubadilisha stock
//
// Kila jaribio hapa linalinda kosa halisi: "wateja wanalalamika
// wakiuza bidhaa hazipungui store". Function ya database haikuwepo,
// na mfumo ulirudi kimya kimya bila kupunguza stock.
// ============================================================
import { describe, it, expect, vi } from 'vitest';
import { changeStock } from './stock.js';

const ok = () => ({ error: null });
const fail = msg => () => ({ error: { message: msg } });
const boom = msg => () => { throw new Error(msg) };

describe('changeStock', () => {
  it('mwenye duka: UPDATE ya moja kwa moja', async () => {
    const rpcFn = vi.fn(ok), updateFn = vi.fn();
    expect(await changeStock({ isSeller: false, delta: -4, rpcFn, updateFn })).toBe('update');
    expect(rpcFn).not.toHaveBeenCalled();
    expect(updateFn).toHaveBeenCalledOnce();
  });

  it('muuzaji: function ya database ikifanikiwa, hiyo inatosha', async () => {
    const rpcFn = vi.fn(ok), updateFn = vi.fn();
    expect(await changeStock({ isSeller: true, delta: -4, rpcFn, updateFn })).toBe('rpc');
    expect(rpcFn).toHaveBeenCalledOnce();
    expect(updateFn).not.toHaveBeenCalled();
  });

  // ===== HAPA NDIPO KOSA LILIPOKUWA =====
  it('muuzaji: function HAIPO -> LAZIMA ijaribu UPDATE', async () => {
    const rpcFn = vi.fn(fail('function dl_deduct_stock does not exist'));
    const updateFn = vi.fn();
    expect(await changeStock({ isSeller: true, delta: -4, rpcFn, updateFn })).toBe('update');
    expect(updateFn).toHaveBeenCalledOnce();
  });

  it('muuzaji: function ikilipuka -> LAZIMA ijaribu UPDATE', async () => {
    const updateFn = vi.fn();
    expect(await changeStock({ isSeller: true, delta: -4, rpcFn: boom('mtandao'), updateFn })).toBe('update');
    expect(updateFn).toHaveBeenCalledOnce();
  });

  it('muuzaji: function ikirudisha tupu -> LAZIMA ijaribu UPDATE', async () => {
    const updateFn = vi.fn();
    expect(await changeStock({ isSeller: true, delta: -4, rpcFn: () => null, updateFn })).toBe('update');
    expect(updateFn).toHaveBeenCalledOnce();
  });

  it('delta 0 (hakuna mabadiliko) inakwenda UPDATE pekee', async () => {
    const rpcFn = vi.fn(ok), updateFn = vi.fn();
    await changeStock({ isSeller: true, delta: 0, rpcFn, updateFn });
    expect(rpcFn).not.toHaveBeenCalled();
    expect(updateFn).toHaveBeenCalledOnce();
  });

  it('kurudisha stock (delta chanya) kunatumia function pia', async () => {
    const rpcFn = vi.fn(ok), updateFn = vi.fn();
    expect(await changeStock({ isSeller: true, delta: +3, rpcFn, updateFn })).toBe('rpc');
  });

  it('kosa linaripotiwa ili lionekane kwenye console', async () => {
    const warn = vi.fn();
    await changeStock({ isSeller: true, delta: -1, rpcFn: fail('hakuna ruhusa'), updateFn: vi.fn(), warn });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain('hakuna ruhusa');
  });

  it('bila updateFn hairudishi "update" kwa uongo', async () => {
    expect(await changeStock({ isSeller: true, delta: -1, rpcFn: fail('x') })).toBe('none');
  });
});
