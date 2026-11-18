// ============================================================
// DukaLangu — KUBADILISHA STOCK
//
// Kuna njia MBILI za kupunguza stock:
//   1. Function ya database (dl_deduct_stock) — muuzaji analazimika
//      kuitumia kwa sababu RLS inamkatalia UPDATE ya moja kwa moja.
//   2. UPDATE ya moja kwa moja — mwenye duka, NA kinga ya mwisho
//      kama function ya database haipo bado.
//
// ⚠️ KOSA LILILOTOKEA: njia ya 1 ilikuwa inarudi mara moja ikishindwa,
//    bila kujaribu njia ya 2. Kwa maduka yaliyokuwa hayajaendesha SQL,
//    function haikuwepo — kwa hiyo stock HAIKUPUNGUA KABISA, kimya
//    kimya. Wateja waliuza siku nzima na stock ikabaki ileile.
//
// Kwa hiyo sheria ni: njia ya 1 ikishindwa kwa SABABU YOYOTE, lazima
// njia ya 2 ijaribiwe. Stock lazima ipungue.
// ============================================================

export async function changeStock({ isSeller, delta, rpcFn, updateFn, warn }) {
  const say = typeof warn === 'function' ? warn : () => {};

  if (isSeller && delta && typeof rpcFn === 'function') {
    try {
      const r = await rpcFn();
      if (r && !r.error) return 'rpc';
      say('rpc imeshindwa: ' + (r?.error?.message || 'haijulikani'));
    } catch (e) {
      say('rpc: ' + (e?.message || String(e)));
    }
  }

  if (typeof updateFn === 'function') {
    await updateFn();
    return 'update';
  }
  return 'none';
}
