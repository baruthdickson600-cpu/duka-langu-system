// Send SMS via Beem - supports SINGLE or BATCH (with parallel processing)
import https from 'https';

function callBeem(host, path, auth, body, timeout = 8000) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: host, path, method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0 DukaLangu/1.0',
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: { raw: data } });
        }
      });
    });
    req.on('error', (e) => resolve({ ok: false, status: 0, error: e.message }));
    req.setTimeout(timeout, () => {
      req.destroy();
      resolve({ ok: false, status: 0, error: 'Timeout' });
    });
    req.write(body);
    req.end();
  });
}

function formatPhone(p) {
  let phone = (p + '').replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) phone = '255' + phone.slice(1);
  if (phone.length > 9 && !phone.startsWith('255')) phone = '255' + phone;
  return phone.length >= 12 ? phone : null;
}

// Send a single SMS to one recipient
async function sendOne(auth, senderId, phone, message) {
  const formatted = formatPhone(phone);
  if (!formatted) return { phone, ok: false, error: 'Invalid phone' };
  
  const body = JSON.stringify({
    source_addr: senderId,
    encoding: 0,
    schedule_time: '',
    message,
    recipients: [{ recipient_id: 1, dest_addr: formatted }],
  });
  
  const result = await callBeem('apisms.beem.africa', '/v1/send', auth, body, 8000);
  
  if (result.ok) {
    return { phone: formatted, ok: true };
  }
  return { phone: formatted, ok: false, status: result.status, error: result.error || JSON.stringify(result.data).slice(0, 100) };
}

// Process recipients in PARALLEL batches (much faster!)
async function sendInBatches(auth, senderId, recipients, batchSize = 5) {
  const results = [];
  
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    // Send batch in PARALLEL
    const batchResults = await Promise.all(
      batch.map(r => sendOne(auth, senderId, r.phone, r.message))
    );
    results.push(...batchResults);
  }
  
  return results;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const API_KEY = process.env.BEEM_API_KEY || 'd73c42b7c28a7c3c';
  const SECRET_KEY = process.env.BEEM_SECRET_KEY || 'YzU2NTEwMWY3OGJiNjAxYmZlYWM3Y2UzYTlmNTU5YTEwOTY3MWVmZDcxNmZlMjY4MzYyNTU5MTU0NTIzODUwZQ==';
  const SENDER_ID = process.env.BEEM_SENDER_ID || 'dukalangu';

  const { to, message, recipients } = req.body || {};
  const auth = Buffer.from(API_KEY + ':' + SECRET_KEY).toString('base64');

  // ===== BATCH MODE: array of {phone, message} =====
  if (Array.isArray(recipients) && recipients.length > 0) {
    try {
      // Validate first
      const valid = recipients.filter(r => r.phone && r.message);
      const invalid = recipients.length - valid.length;
      
      // Process in parallel batches of 5
      const results = await sendInBatches(auth, SENDER_ID, valid, 5);
      
      const success = results.filter(r => r.ok).length;
      const failed = results.filter(r => !r.ok).length + invalid;
      
      return res.status(200).json({
        success: true,
        total: recipients.length,
        sent: success,
        failed,
        results,
      });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // ===== SINGLE MODE: {to, message} =====
  if (!to || !message) return res.status(400).json({ success: false, error: 'Missing to/message' });

  const result = await sendOne(auth, SENDER_ID, to, message);
  
  if (result.ok) {
    return res.status(200).json({ success: true, phone: result.phone, sender: SENDER_ID });
  }
  return res.status(500).json({ success: false, error: result.error || 'Send failed', status: result.status });
}
