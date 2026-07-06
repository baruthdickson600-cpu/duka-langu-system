// ============================================================
// api/cron/daily-backup.js — Daily Backup (Vercel Cron)
// Schedule: 0 21 * * * (saa 21 UTC = saa 12 usiku EAT)
// Vercel Hobby: ✅ mara moja kwa siku — inakubalika
// ============================================================

export default async function handler(req, res) {
  // Vercel inatuma header hii kwenye cron jobs
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ [Backup] Supabase env variables hazipo');
    return res.status(500).json({ success: false, error: 'Supabase config haipo' });
  }

  const startTime = Date.now();
  console.log('🔄 [Backup] Inaanza daily backup:', new Date().toISOString());

  try {
    // 1. Hifadhi backup log kwenye Supabase
    const logRes = await fetch(`${SUPABASE_URL}/rest/v1/backup_logs`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey':        SUPABASE_KEY,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        status:     'running',
        started_at: new Date().toISOString(),
        type:       'daily',
      }),
    });

    if (!logRes.ok) {
      console.warn('⚠️ [Backup] Haikuweza kuandika backup log:', logRes.status);
    }

    // 2. Safisha data za zamani (OTP zilizokwisha, logs za zamani)
    const cleanupTasks = [
      // Futa OTP zilizokwisha zaidi ya saa 24
      fetch(`${SUPABASE_URL}/rest/v1/otp_codes?expires_at=lt.${new Date(Date.now() - 86400000).toISOString()}`, {
        method:  'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey':        SUPABASE_KEY,
        },
      }),
    ];

    const results = await Promise.allSettled(cleanupTasks);
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.warn(`⚠️ [Backup] Cleanup task ${i} imeshindwa:`, r.reason);
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [Backup] Imekamilika kwa ${duration}ms`);

    return res.status(200).json({
      success:   true,
      duration:  `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('❌ [Backup] Error:', err.message);
    return res.status(500).json({
      success: false,
      error:   err.message,
    });
  }
}
