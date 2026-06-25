// =====================================================
// SCHEDULED SMS SENDER
// Inafanya kazi kila dakika 5
// Inaangalia SMS zilizopangwa, inazituma, na kupanga next_run_at
// =====================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://snosfxagzglswaotrgzv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub3NmeGFnemdsc3dhb3RyZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDcwMDAsImV4cCI6MjA5MDY4MzAwMH0.qS6lEKGJ6IRganQTcpB1sFtw90XDyK0BMaQKSTVLXKE'
);

// Phone normalization
const normalizePhone = (p) => {
  if (!p) return '';
  p = String(p).replace(/\D/g, '');
  if (p.startsWith('0')) p = '255' + p.slice(1);
  if (!p.startsWith('255')) p = '255' + p;
  return p;
};

// Personalize template variables
const personalize = (msg, r) => {
  if (!msg) return msg;
  return msg
    .replace(/\{jina\}/gi, r.name || 'Mteja')
    .replace(/\{biashara\}/gi, r.business || 'Duka Langu')
    .replace(/\{kiasi\}/gi, r.amount ? Number(r.amount).toLocaleString() : '0')
    .replace(/\{simu\}/gi, r.phone || '');
};

// Calculate next run for recurring SMS
const calculateNextRun = (schedule) => {
  const now = new Date();
  const { schedule_type, schedule_time, schedule_days, schedule_day_of_month, end_date } = schedule;
  
  if (!schedule_time) return null;
  const [hh, mm] = schedule_time.split(':').map(Number);
  
  let next = new Date();
  next.setHours(hh, mm, 0, 0);
  
  // If today's time already passed, start from tomorrow
  if (next <= now) next.setDate(next.getDate() + 1);
  
  if (schedule_type === 'daily') {
    // Already calculated above - just check end_date
  } else if (schedule_type === 'weekly') {
    // Find next matching day of week (0=Sun, 1=Mon, ..., 6=Sat)
    if (!schedule_days || schedule_days.length === 0) return null;
    while (!schedule_days.includes(next.getDay())) {
      next.setDate(next.getDate() + 1);
    }
  } else if (schedule_type === 'monthly') {
    if (!schedule_day_of_month) return null;
    next.setDate(schedule_day_of_month);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(schedule_day_of_month);
    }
  }
  
  // Check end_date
  if (end_date && new Date(end_date) < next) return null;
  
  return next.toISOString();
};

// Send SMS via Beem API
const sendSMSBatch = async (recipients, message) => {
  const BEEM_KEY = process.env.BEEM_API_KEY || 'd73c42b7c28a7c3c';
  const BEEM_SECRET = process.env.BEEM_SECRET_KEY;
  const BEEM_SENDER = process.env.BEEM_SENDER_ID || 'dukalangu';
  
  if (!BEEM_SECRET) {
    return { success: 0, failed: recipients.length, error: 'BEEM_SECRET_KEY not set' };
  }
  
  const auth = 'Basic ' + Buffer.from(`${BEEM_KEY}:${BEEM_SECRET}`).toString('base64');
  
  let success = 0;
  let failed = 0;
  const errors = [];
  
  // Parallel batches of 5
  const BATCH = 5;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async r => {
      const phone = normalizePhone(r.phone);
      if (!phone || phone.length < 10) return { ok: false, error: 'Invalid phone' };
      
      const personalizedMsg = personalize(message, r);
      
      try {
        const res = await fetch('https://apisms.beem.africa/v1/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': auth },
          body: JSON.stringify({
            source_addr: BEEM_SENDER,
            message: personalizedMsg,
            recipients: [{ recipient_id: '1', dest_addr: phone }],
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.successful) return { ok: true };
        return { ok: false, error: data.message || 'API error' };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }));
    
    results.forEach(r => {
      if (r.ok) success++;
      else {
        failed++;
        if (r.error && errors.length < 5) errors.push(r.error);
      }
    });
  }
  
  return { success, failed, errors };
};


export default async function handler(req, res) {
  const now = new Date();
  console.log('[SCHED-SMS] Running at', now.toISOString());
  
  // Find all active schedules where next_run_at <= now
  const { data: schedules, error } = await supabase
    .from('scheduled_sms')
    .select('*')
    .eq('status', 'active')
    .lte('next_run_at', now.toISOString())
    .limit(20); // Process max 20 per run
  
  if (error) {
    console.error('[SCHED-SMS] Query error:', error);
    return res.status(500).json({ error: error.message });
  }
  
  if (!schedules || schedules.length === 0) {
    return res.status(200).json({ 
      message: 'No schedules due', 
      checked_at: now.toISOString() 
    });
  }
  
  console.log('[SCHED-SMS] Found', schedules.length, 'schedules due');
  
  const results = [];
  
  for (const s of schedules) {
    try {
      const recipients = s.recipients || [];
      if (recipients.length === 0) {
        await supabase.from('scheduled_sms')
          .update({ status: 'failed', last_error: 'No recipients' })
          .eq('id', s.id);
        continue;
      }
      
      // Send SMS to all recipients
      const result = await sendSMSBatch(recipients, s.message);
      
      // Update schedule
      const updates = {
        last_sent_at: now.toISOString(),
        total_runs: (s.total_runs || 0) + 1,
        last_success_count: result.success,
        last_failed_count: result.failed,
        last_error: result.errors?.join(', ') || null,
      };
      
      // Determine next status
      if (s.schedule_type === 'once') {
        updates.status = 'completed';
        updates.next_run_at = null;
      } else {
        // Recurring - calculate next run
        const nextRun = calculateNextRun(s);
        if (!nextRun || (s.max_runs && updates.total_runs >= s.max_runs)) {
          updates.status = 'completed';
          updates.next_run_at = null;
        } else {
          updates.next_run_at = nextRun;
        }
      }
      
      await supabase.from('scheduled_sms').update(updates).eq('id', s.id);
      
      results.push({
        id: s.id,
        name: s.name,
        type: s.schedule_type,
        recipients: recipients.length,
        success: result.success,
        failed: result.failed,
        next_run: updates.next_run_at,
        status: updates.status,
      });
      
      console.log('[SCHED-SMS]', s.name, '-', result.success, 'sent,', result.failed, 'failed');
      
    } catch (e) {
      console.error('[SCHED-SMS] Error processing', s.id, e);
      await supabase.from('scheduled_sms')
        .update({ status: 'failed', last_error: e.message })
        .eq('id', s.id);
    }
  }
  
  return res.status(200).json({
    processed: results.length,
    timestamp: now.toISOString(),
    results,
  });
}
