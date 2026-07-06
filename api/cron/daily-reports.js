// ============================================================
// api/cron/daily-reports.js — Daily Reports (Vercel Cron)
// Schedule: 0 3 * * * (saa 3 UTC = saa 6 asubuhi EAT)
// Vercel Hobby: ✅ mara moja kwa siku — inakubalika
// ============================================================

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ success: false, error: 'Supabase config haipo' });
  }

  const startTime = Date.now();
  console.log('📊 [Reports] Inaanza daily reports:', new Date().toISOString());

  try {
    // Tengeneza tarehe ya jana (EAT = UTC+3)
    const now      = new Date();
    const eatOffset = 3 * 60 * 60 * 1000;
    const yesterday = new Date(now.getTime() - eatOffset);
    yesterday.setUTCHours(0, 0, 0, 0);
    const dayStart = new Date(yesterday.getTime() - eatOffset).toISOString();
    const dayEnd   = new Date(yesterday.getTime() - eatOffset + 86399999).toISOString();

    // Pata muhtasari wa mauzo ya jana
    const salesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/sales?created_at=gte.${dayStart}&created_at=lte.${dayEnd}&select=total,profit,business_id`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey':        SUPABASE_KEY,
        },
      }
    );

    const sales = salesRes.ok ? await salesRes.json() : [];
    const totalRevenue = sales.reduce((sum, s) => sum + (s.total  || 0), 0);
    const totalProfit  = sales.reduce((sum, s) => sum + (s.profit || 0), 0);

    console.log(`📊 [Reports] Jana: Mauzo ${sales.length}, Mapato ${totalRevenue}, Faida ${totalProfit}`);

    // Hifadhi ripoti kwenye system_logs
    await fetch(`${SUPABASE_URL}/rest/v1/system_logs`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey':        SUPABASE_KEY,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        action:    'daily_report',
        details:   JSON.stringify({ sales: sales.length, revenue: totalRevenue, profit: totalProfit, date: dayStart }),
        created_at: new Date().toISOString(),
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [Reports] Imekamilika kwa ${duration}ms`);

    return res.status(200).json({
      success:       true,
      duration:      `${duration}ms`,
      report: {
        date:     dayStart.split('T')[0],
        sales:    sales.length,
        revenue:  totalRevenue,
        profit:   totalProfit,
      },
    });

  } catch (err) {
    console.error('❌ [Reports] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
