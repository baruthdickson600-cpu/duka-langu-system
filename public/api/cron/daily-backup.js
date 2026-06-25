// =====================================================
// DUKA LANGU — DAILY AUTO-BACKUP
// =====================================================
// Inafanya kazi automatic kila usiku saa 2:00 (UTC 23:00)
// Inahifadhi backup yote ya database
// Inatuma email kwa admin yenye:
//   - Statistics za biashara
//   - Backup file (JSON) attached
// =====================================================

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://snosfxagzglswaotrgzv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub3NmeGFnemdsc3dhb3RyZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDcwMDAsImV4cCI6MjA5MDY4MzAwMH0.qS6lEKGJ6IRganQTcpB1sFtw90XDyK0BMaQKSTVLXKE'
);

const ADMIN_EMAIL = 'dukalangusolution@gmail.com';

// All tables to backup
const TABLES = [
  'users', 'businesses', 'branches', 'products', 'sales',
  'expenses', 'customers', 'credit_transactions', 'tokens',
  'promo_codes', 'notifications', 'stock_history', 'login_logs',
  'system_settings', 'sms_logs', 'support_tickets', 'returns',
  'payment_requests', 'marketing_partners', 'campaigns',
  'referrals', 'chat_messages', 'testimonials'
];

export default async function handler(req, res) {
  const GMAIL_USER = process.env.GMAIL_USER || 'dukalangusolution@gmail.com';
  const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
  
  if (!GMAIL_PASS) {
    return res.status(500).json({ error: 'GMAIL_APP_PASSWORD not set' });
  }

  const startTime = Date.now();
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const timeStr = today.toLocaleString('sw-TZ', { 
    timeZone: 'Africa/Dar_es_Salaam',
    dateStyle: 'full',
    timeStyle: 'short'
  });

  console.log('[BACKUP] Starting backup for', dateStr);

  // ============================================
  // STEP 1: FETCH ALL DATA FROM ALL TABLES
  // ============================================
  const backup = {
    metadata: {
      generated_at: today.toISOString(),
      timezone: 'Africa/Dar_es_Salaam',
      version: '1.0',
      total_tables: TABLES.length,
    },
    tables: {},
    stats: {},
    errors: []
  };

  const tableStats = [];
  let totalRows = 0;

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(50000); // Safety limit
      
      if (error) {
        // Table might not exist - skip silently
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          console.log(`[BACKUP] Skipping ${table} (doesn't exist)`);
          continue;
        }
        backup.errors.push({ table, error: error.message });
        continue;
      }
      
      backup.tables[table] = data || [];
      const count = (data || []).length;
      backup.stats[table] = count;
      totalRows += count;
      tableStats.push({ table, count });
      
    } catch (e) {
      backup.errors.push({ table, error: e.message });
    }
  }

  backup.metadata.total_rows = totalRows;
  backup.metadata.duration_ms = Date.now() - startTime;

  console.log('[BACKUP] Collected', totalRows, 'rows from', tableStats.length, 'tables');

  // ============================================
  // STEP 2: BUSINESS STATISTICS  
  // ============================================
  const businesses = backup.tables['businesses'] || [];
  const sales = backup.tables['sales'] || [];
  const products = backup.tables['products'] || [];
  const customers = backup.tables['customers'] || [];
  const users = backup.tables['users'] || [];

  // Calculate today's stats
  const todayDateStr = today.toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.created_at?.startsWith(todayDateStr));
  const todayRevenue = todaySales.reduce((sum, s) => sum + (+s.total || 0), 0);

  // Calculate this month's stats
  const monthPrefix = todayDateStr.slice(0, 7);
  const monthSales = sales.filter(s => s.created_at?.startsWith(monthPrefix));
  const monthRevenue = monthSales.reduce((sum, s) => sum + (+s.total || 0), 0);

  const stats = {
    businesses: businesses.length,
    users: users.length,
    products: products.length,
    customers: customers.length,
    totalSales: sales.length,
    todaySales: todaySales.length,
    todayRevenue,
    monthSales: monthSales.length,
    monthRevenue,
    backupSize: JSON.stringify(backup).length,
  };

  // ============================================
  // STEP 3: PREPARE BACKUP FILE (JSON)
  // ============================================
  const backupJson = JSON.stringify(backup, null, 0); // No pretty-print to save space
  const backupSizeKB = Math.round(backupJson.length / 1024);
  const backupSizeMB = (backupJson.length / 1024 / 1024).toFixed(2);

  // ============================================
  // STEP 4: SEND EMAIL TO ADMIN WITH BACKUP
  // ============================================
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
  });

  const fm = n => `TZS ${(+n || 0).toLocaleString()}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;background:#F8FAFC;font-family:Arial,sans-serif;padding:20px">
  <table style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
    
    <!-- HEADER -->
    <tr><td style="background:linear-gradient(135deg,#0B7A3B,#065F2E);padding:30px;text-align:center">
      <div style="font-size:48px;margin-bottom:10px">💾</div>
      <h1 style="color:#fff;margin:0;font-size:24px">Backup ya Kila Siku</h1>
      <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:13px">Duka Langu — ${timeStr}</p>
    </td></tr>
    
    <!-- SUCCESS BANNER -->
    <tr><td style="padding:20px">
      <div style="background:#F0FDF4;border-left:4px solid #22C55E;padding:14px 18px;border-radius:8px">
        <div style="font-weight:bold;color:#15803D;font-size:14px">✅ Backup Imekamilika!</div>
        <div style="color:#166534;font-size:12px;margin-top:4px">
          Rows: <b>${totalRows.toLocaleString()}</b> • Size: <b>${backupSizeMB} MB</b> • Time: <b>${(backup.metadata.duration_ms/1000).toFixed(1)}s</b>
        </div>
      </div>
    </td></tr>
    
    <!-- TODAY'S STATS -->
    <tr><td style="padding:0 20px">
      <h2 style="color:#0B7A3B;font-size:16px;margin:0 0 12px">📊 Takwimu za Leo</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:12px;background:#F0FDF4;border-radius:8px;width:33%;text-align:center">
            <div style="color:#64748B;font-size:10px;font-weight:bold;letter-spacing:0.5px">MAUZO LEO</div>
            <div style="color:#0B7A3B;font-size:18px;font-weight:900;margin-top:4px">${stats.todaySales}</div>
          </td>
          <td style="width:8px"></td>
          <td style="padding:12px;background:#EFF6FF;border-radius:8px;width:33%;text-align:center">
            <div style="color:#64748B;font-size:10px;font-weight:bold;letter-spacing:0.5px">MAPATO LEO</div>
            <div style="color:#3B82F6;font-size:14px;font-weight:900;margin-top:4px">${fm(stats.todayRevenue)}</div>
          </td>
          <td style="width:8px"></td>
          <td style="padding:12px;background:#FEF3C7;border-radius:8px;width:33%;text-align:center">
            <div style="color:#64748B;font-size:10px;font-weight:bold;letter-spacing:0.5px">MWEZI</div>
            <div style="color:#D97706;font-size:14px;font-weight:900;margin-top:4px">${fm(stats.monthRevenue)}</div>
          </td>
        </tr>
      </table>
    </td></tr>
    
    <!-- TOTALS -->
    <tr><td style="padding:20px">
      <h2 style="color:#0B7A3B;font-size:16px;margin:0 0 12px">📈 Jumla ya Mfumo</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:10px 14px;background:#F8FAFC;border-radius:8px;margin-bottom:6px">
          <div style="display:flex;justify-content:space-between">
            <span style="color:#64748B;font-size:13px">🏪 Maduka</span>
            <strong style="color:#0B7A3B;font-size:14px">${stats.businesses}</strong>
          </div>
        </td></tr>
        <tr><td style="padding:10px 14px;background:#F8FAFC;border-radius:8px">
          <div style="display:flex;justify-content:space-between">
            <span style="color:#64748B;font-size:13px">👥 Watumiaji</span>
            <strong style="color:#0B7A3B;font-size:14px">${stats.users}</strong>
          </div>
        </td></tr>
        <tr><td style="padding:10px 14px;background:#F8FAFC;border-radius:8px">
          <div style="display:flex;justify-content:space-between">
            <span style="color:#64748B;font-size:13px">📦 Bidhaa</span>
            <strong style="color:#0B7A3B;font-size:14px">${stats.products}</strong>
          </div>
        </td></tr>
        <tr><td style="padding:10px 14px;background:#F8FAFC;border-radius:8px">
          <div style="display:flex;justify-content:space-between">
            <span style="color:#64748B;font-size:13px">👤 Wateja</span>
            <strong style="color:#0B7A3B;font-size:14px">${stats.customers}</strong>
          </div>
        </td></tr>
        <tr><td style="padding:10px 14px;background:#F8FAFC;border-radius:8px">
          <div style="display:flex;justify-content:space-between">
            <span style="color:#64748B;font-size:13px">💰 Mauzo Yote</span>
            <strong style="color:#0B7A3B;font-size:14px">${stats.totalSales}</strong>
          </div>
        </td></tr>
      </table>
    </td></tr>
    
    <!-- TABLE BREAKDOWN -->
    <tr><td style="padding:0 20px 20px">
      <h2 style="color:#0B7A3B;font-size:16px;margin:0 0 12px">📁 Tables Zilizohifadhiwa</h2>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        ${tableStats.map(s => `
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #F1F5F9;color:#475569">${s.table}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #F1F5F9;color:#0B7A3B;font-weight:bold;text-align:right">${s.count} rows</td>
          </tr>
        `).join('')}
      </table>
    </td></tr>
    
    <!-- INSTRUCTIONS -->
    <tr><td style="padding:0 20px 20px">
      <div style="background:#EFF6FF;border-left:4px solid #3B82F6;padding:14px 18px;border-radius:8px">
        <div style="font-weight:bold;color:#1E40AF;font-size:13px;margin-bottom:6px">💡 Kuhusu Backup Hii</div>
        <div style="color:#1E3A8A;font-size:12px;line-height:1.6">
          • Backup imeambatishwa kama file ya <b>JSON</b><br/>
          • Hifadhi kwenye Google Drive au Dropbox<br/>
          • Tumia kurudisha data ikitokea tatizo<br/>
          • Backup huja kila siku saa 2:00 alfajiri
        </div>
      </div>
    </td></tr>
    
    ${backup.errors.length > 0 ? `
    <!-- ERRORS -->
    <tr><td style="padding:0 20px 20px">
      <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:14px 18px;border-radius:8px">
        <div style="font-weight:bold;color:#92400E;font-size:13px;margin-bottom:6px">⚠️ Errors (${backup.errors.length})</div>
        <div style="color:#78350F;font-size:11px">
          ${backup.errors.map(e => `<div>• ${e.table}: ${e.error}</div>`).join('')}
        </div>
      </div>
    </td></tr>
    ` : ''}
    
    <!-- FOOTER -->
    <tr><td style="background:#F8FAFC;padding:20px;text-align:center;border-top:1px solid #E2E8F0">
      <div style="color:#64748B;font-size:11px">
        © 2026 Duka Langu Tanzania<br/>
        📧 dukalangusolution@gmail.com | 🌐 Dukalangu.com
      </div>
    </td></tr>
    
  </table>
</body>
</html>`;

  // Attach backup file
  const attachment = {
    filename: `dukalangu-backup-${dateStr}.json`,
    content: backupJson,
    contentType: 'application/json',
  };

  try {
    await transporter.sendMail({
      from: `Duka Langu <${GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `💾 Backup ya Kila Siku — ${dateStr} (${totalRows} rows, ${backupSizeMB}MB)`,
      html,
      attachments: [attachment],
    });
    console.log('[BACKUP] Email sent to', ADMIN_EMAIL);
  } catch (e) {
    console.error('[BACKUP] Email error:', e.message);
    return res.status(500).json({ 
      error: 'Email failed', 
      detail: e.message,
      backup_completed: true,
      stats 
    });
  }

  // ============================================
  // STEP 5: SAVE BACKUP RECORD TO DATABASE
  // ============================================
  try {
    await supabase.from('backup_logs').insert({
      created_at: today.toISOString(),
      total_rows: totalRows,
      total_tables: tableStats.length,
      size_bytes: backupJson.length,
      duration_ms: backup.metadata.duration_ms,
      stats: stats,
      errors: backup.errors,
      status: 'completed',
    }).catch(() => null); // Ignore if table doesn't exist yet
  } catch (e) {
    console.warn('[BACKUP] Log save failed:', e.message);
  }

  // ============================================
  // RETURN SUCCESS
  // ============================================
  return res.status(200).json({
    success: true,
    date: dateStr,
    stats,
    total_rows: totalRows,
    total_tables: tableStats.length,
    size_mb: backupSizeMB,
    duration_seconds: (backup.metadata.duration_ms / 1000).toFixed(2),
    errors: backup.errors.length,
    email_sent_to: ADMIN_EMAIL,
  });
}
