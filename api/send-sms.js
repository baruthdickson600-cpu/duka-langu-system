// Vercel Serverless — Send SMS via Beem Africa
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const API_KEY = process.env.BEEM_API_KEY || 'd73c42b7c28a7c3c';
  const SECRET_KEY = process.env.BEEM_SECRET_KEY || 'YzU2NTEwMWY3OGJiNjAxYmZlYWM3Y2UzYTlmNTU5YTEwOTY3MWVmZDcxNmZlMjY4MzYyNTU5MTU0NTIzODUwZQ==';
  const SENDER_ID = process.env.BEEM_SENDER_ID || 'dukalangu';

  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'Missing to/message' });

  // Format phone: ensure 255 prefix
  let phone = to.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '255' + phone.slice(1);
  if (!phone.startsWith('255')) phone = '255' + phone;

  const auth = Buffer.from(`${API_KEY}:${SECRET_KEY}`).toString('base64');

  try {
    const response = await fetch('https://apisms.bfrnd.com/api/send-sms', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_addr: SENDER_ID,
        encoding: 0,
        schedule_time: '',
        message,
        recipients: [{ recipient_id: 1, dest_addr: phone }],
      }),
    });

    const result = await response.json();
    if (!response.ok || result.code === 100) {
      return res.status(400).json({ success: false, error: result.message || 'SMS failed', details: result });
    }
    return res.status(200).json({ success: true, to: phone, request_id: result.request_id || result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
