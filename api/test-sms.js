import https from 'https';

function sendBeemSMS(apiKey, secretKey, senderId, phone, message) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(apiKey + ':' + secretKey).toString('base64');
    const body = JSON.stringify({
      source_addr: senderId, encoding: 0, schedule_time: '',
      message, recipients: [{ recipient_id: 1, dest_addr: phone }],
    });
    const req = https.request({
      hostname: 'apisms.bfrnd.com', path: '/api/send-sms', method: 'POST',
      headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(data) }) } catch(e) { resolve({ status: res.statusCode, data }) } });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')) });
    req.write(body); req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const API_KEY = process.env.BEEM_API_KEY || 'd73c42b7c28a7c3c';
  const SECRET_KEY = process.env.BEEM_SECRET_KEY || 'YzU2NTEwMWY3OGJiNjAxYmZlYWM3Y2UzYTlmNTU5YTEwOTY3MWVmZDcxNmZlMjY4MzYyNTU5MTU0NTIzODUwZQ==';
  const SENDER_ID = process.env.BEEM_SENDER_ID || 'dukalangu';

  let phone = (req.query.phone || '0628986770').replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) phone = '255' + phone.slice(1);
  if (!phone.startsWith('255')) phone = '255' + phone;

  try {
    const result = await sendBeemSMS(API_KEY, SECRET_KEY, SENDER_ID, phone, 'DUKA LANGU - Test SMS! Code: 123456');
    return res.status(200).json({ success: result.status >= 200 && result.status < 300, beem_status: result.status, phone, sender: SENDER_ID, beem_response: result.data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, phone });
  }
}
