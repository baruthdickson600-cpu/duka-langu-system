// Send SMS via Beem - tries multiple endpoints (multi-fallback)
import https from 'https';

function tryBeemSMS(host, path, auth, body) {
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
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
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

  const { to, message } = req.body || {};
  if (!to || !message) return res.status(400).json({ success: false, error: 'Missing to/message' });

  // Format phone
  let phone = (to + '').replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) phone = '255' + phone.slice(1);
  if (phone.length > 9 && !phone.startsWith('255')) phone = '255' + phone;
  if (phone.length < 12) return res.status(400).json({ success: false, error: 'Phone format wrong: ' + phone });

  const auth = Buffer.from(API_KEY + ':' + SECRET_KEY).toString('base64');
  const body = JSON.stringify({
    source_addr: SENDER_ID, encoding: 0, schedule_time: '',
    message, recipients: [{ recipient_id: 1, dest_addr: phone }],
  });

  // Beem main endpoint (verified working)
  const endpoints = [
    { host: 'apisms.beem.africa', path: '/v1/send' },
    { host: 'apisms.bfrnd.com', path: '/v1/send' },
  ];

  const errors = [];
  for (const ep of endpoints) {
    try {
      const result = await tryBeemSMS(ep.host, ep.path, auth, body);
      if (result.ok) {
        return res.status(200).json({ success: true, phone, sender: SENDER_ID, beem_status: result.status, beem_response: result.data, endpoint: ep.host });
      }
      errors.push({ ep: ep.host + ep.path, status: result.status, data: result.data });
    } catch (e) {
      errors.push({ ep: ep.host + ep.path, error: e.message });
    }
  }

  return res.status(500).json({ success: false, error: 'All Beem endpoints failed', phone, attempts: errors });
}
