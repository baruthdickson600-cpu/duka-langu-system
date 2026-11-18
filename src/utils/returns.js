// ============================================================
// DukaLangu — MAREJESHO (RETURNS)
//
// ⚠️ KOSA LILILOTOKEA: mteja aliuza bidhaa MOJA, lakini aliweza
//    kuirudisha MARA 10. UI ilizuia ndani ya rejesho moja (max =
//    idadi iliyouzwa), lakini HAIKUKUMBUKA marejesho ya awali.
//    Kwa hiyo ulichagua mauzo yale yale tena na tena. Kila mara:
//      - stock inaongezeka kwa bidhaa zisizopo
//      - pesa inarudishwa zaidi ya iliyopokelewa
//      - deni la mteja linafutwa zaidi ya alivyodaiwa
//      - faida inapungua kila mara
//    processReturn() haikuwa na uhakiki HATA KIDOGO — ilikubali
//    kila kitu ilichopewa, pamoja na BEI iliyotumwa na mteja.
//
// Sheria: bidhaa haiwezi kurudishwa zaidi ya ilivyouzwa, na
// marejesho YOTE ya mauzo hayo yanahesabiwa pamoja.
//
// Vipimo: tunahesabu kwa VIPIMO VYA STOCK (qty × fraction), kwa
// sababu nusu kilo mbili ni kilo moja.
// ============================================================

const num = v => {
  const n = +v;
  return Number.isFinite(n) ? n : 0;
};
const frac = i => num(i?.fraction) || 1;
const units = i => num(i?.qty) * frac(i);
const pid = i => String(i?.productId ?? i?.product_id ?? '');

// Vipimo vilivyouzwa kwa kila bidhaa
export const soldUnits = sale => {
  const m = new Map();
  (Array.isArray(sale?.items) ? sale.items : []).forEach(i => {
    const k = pid(i);
    if (k) m.set(k, (m.get(k) || 0) + units(i));
  });
  return m;
};

// Vipimo vilivyorudishwa tayari kwa mauzo haya
export const returnedUnits = (returns, saleId) => {
  const m = new Map();
  (returns || [])
    .filter(r => String(r?.sale_id ?? '') === String(saleId ?? ''))
    .forEach(r => (Array.isArray(r?.items) ? r.items : []).forEach(i => {
      const k = pid(i);
      if (k) m.set(k, (m.get(k) || 0) + units(i));
    }));
  return m;
};

// Vipimo vinavyoweza kurudishwa bado
export const returnableUnits = (sale, returns) => {
  const sold = soldUnits(sale);
  const back = returnedUnits(returns, sale?.id);
  const m = new Map();
  for (const [k, v] of sold) {
    const left = v - (back.get(k) || 0);
    m.set(k, left > 0 ? left : 0);
  }
  return m;
};

// Je mauzo haya yamerudishwa yote?
export const fullyReturned = (sale, returns) => {
  const left = returnableUnits(sale, returns);
  if (left.size === 0) return false;
  for (const v of left.values()) if (v > 0) return false;
  return true;
};

// Bei iliyotumika kuuza bidhaa hiyo (SI bei iliyotumwa na mteja)
const salePrice = (sale, k) => {
  const line = (Array.isArray(sale?.items) ? sale.items : []).find(i => pid(i) === k);
  return line ? num(line.price) : 0;
};

// ===== UHAKIKI =====
// Inarudisha bidhaa zilizosafishwa na kiasi cha kurudisha.
// Kila bidhaa inapunguzwa hadi kiwango kinachoruhusiwa, na bidhaa
// zisizo kwenye mauzo zinaondolewa kabisa.
export const validateReturn = (sale, returns, requested) => {
  const problems = [];
  if (!sale) return { ok: false, items: [], refund: 0, problems: ['Mauzo hayajapatikana'] };

  const left = returnableUnits(sale, returns);
  const used = new Map();
  const items = [];

  for (const req of (Array.isArray(requested) ? requested : [])) {
    const k = pid(req);
    const want = units(req);
    if (!k || want <= 0) continue;

    if (!left.has(k)) {
      problems.push(`${req?.name || k}: haikuwa kwenye mauzo haya`);
      continue;
    }

    const remaining = (left.get(k) || 0) - (used.get(k) || 0);
    if (remaining <= 0) {
      problems.push(`${req?.name || k}: imerudishwa yote tayari`);
      continue;
    }

    const allowed = Math.min(want, remaining);
    if (allowed < want) {
      problems.push(`${req?.name || k}: iliyobaki ni ${remaining} pekee`);
    }
    used.set(k, (used.get(k) || 0) + allowed);

    const f = frac(req);
    items.push({
      ...req,
      qty: allowed / f,
      fraction: f,
      // Bei LAZIMA itoke kwenye mauzo, si kwenye ombi
      price: salePrice(sale, k),
    });
  }

  const refund = items.reduce((s, i) => s + num(i.qty) * num(i.price) * frac(i), 0);
  return { ok: items.length > 0, items, refund, problems };
};
