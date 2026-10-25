// ============================================================
// api/sms-balance.js — Pata salio la SMS kutoka Beem Africa
// Endpoint: https://apisms.beem.africa/public/v1/vendors/balance
// API keys hazionyeshwi kwa mteja (server-side pekee)
// ============================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const BEEM_API_KEY = process.env.BEEM_API_KEY;
  const BEEM_SECRET_KEY = process.env.BEEM_SECRET_KEY;

  if (!BEEM_API_KEY || !BEEM_SECRET_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Huduma ya SMS haijawekwa. Wasiliana na msimamizi.',
    });
  }

  const credentials = Buffer.from(`${BEEM_API_KEY}:${BEEM_SECRET_KEY}`).toString('base64');

  // Fetch yenye timeout
  const fetchWithTimeout = async (url, opts, ms = 10000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { ...opts, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  };

  try {
    const beemRes = await fetchWithTimeout(
      'https://apisms.beem.africa/public/v1/vendors/balance',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`,
        },
      },
      10000
    );

    const raw = await beemRes.text();
    let data = {};
    try { data = JSON.parse(raw); } catch { data = { raw }; }

    if (!beemRes.ok) {
      const msg =
        beemRes.status === 401 || beemRes.status === 403
          ? 'Uthibitisho umeshindwa. API Key au Secret si sahihi.'
          : beemRes.status >= 500
          ? 'Beem hapatikani kwa sasa. Jaribu tena baadaye.'
          : 'Imeshindwa kupata salio kutoka Beem.';
      return res.status(400).json({ success: false, error: msg });
    }

    // Beem inarudisha: { data: { credit_balance: "1234.00" } }
    const balance = data?.data?.credit_balance ?? data?.credit_balance ?? null;

    return res.status(200).json({
      success: true,
      balance: balance !== null ? parseFloat(balance) : null,
      raw: data,
    });

  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    console.error('[SMS Balance]', isTimeout ? 'TIMEOUT' : err.message);
    return res.status(503).json({
      success: false,
      error: isTimeout
        ? 'Beem amechelewa kujibu. Jaribu tena.'
        : 'Imeshindwa kuwasiliana na Beem.',
    });
  }
}
