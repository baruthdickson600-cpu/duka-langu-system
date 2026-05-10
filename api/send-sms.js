// Send SMS via Beem - supports SINGLE or BATCH
import https from 'https';

function callBeem(host, path, auth, body, timeout=15000) {
  return new Promise((resolve, reject) => {
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
        try { resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: { raw: data } }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('Timeout')); });
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
    let success = 0, failed = 0;
    const results = [];
    
    // Beem allows up to 100 recipients per request, but we send one at a time inside
    // ONE serverless function call to keep it efficient
    for (const r of recipients) {
      const phone = formatPhone(r.phone);
      if (!phone || !r.message) {
        failed++;
        results.push({ phone: r.phone, ok: false, error: 'Invalid phone' });
        continue;
      }
      
      const body = JSON.stringify({
        source_addr: SENDER_ID, encoding: 0, schedule_time: '',
        message: r.message,
        recipients: [{ recipient_id: 1, dest_addr: phone }],
      });
      
      try {
        const result = await callBeem('apisms.beem.africa', '/v1/send', auth, body, 10000);
        if (result.ok) {
          success++;
          results.push({ phone, ok: true });
        } else {
          failed++;
          results.push({ phone, ok: false, status: result.status });
        }
      } catch (e) {
        failed++;
        results.push({ phone, ok: false, error: e.message });
      }
    }
    
    return res.status(200).json({ success: true, total: recipients.length, sent: success, failed, results });
  }

  // ===== SINGLE MODE: {to, message} =====
  if (!to || !message) return res.status(400).json({ success: false, error: 'Missing to/message' });

  const phone = formatPhone(to);
  if (!phone) return res.status(400).json({ success: false, error: 'Phone format wrong' });

  const body = JSON.stringify({
    source_addr: SENDER_ID, encoding: 0, schedule_time: '',
    message, recipients: [{ recipient_id: 1, dest_addr: phone }],
  });

  try {
    const result = await callBeem('apisms.beem.africa', '/v1/send', auth, body, 12000);
    if (result.ok) {
      return res.status(200).json({ success: true, phone, sender: SENDER_ID, beem_response: result.data });
    }
    return res.status(500).json({ success: false, error: 'Beem rejected', status: result.status, data: result.data });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
