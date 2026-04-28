import https from 'https';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const API_KEY = process.env.BEEM_API_KEY || 'd73c42b7c28a7c3c';
  const SECRET_KEY = process.env.BEEM_SECRET_KEY || 'YzU2NTEwMWY3OGJiNjAxYmZlYWM3Y2UzYTlmNTU5YTEwOTY3MWVmZDcxNmZlMjY4MzYyNTU5MTU0NTIzODUwZQ==';
  const SENDER_ID = process.env.BEEM_SENDER_ID || 'dukalangu';

  let phone = (req.query.phone || '0628986770').replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) phone = '255' + phone.slice(1);
  if (!phone.startsWith('255')) phone = '255' + phone;

  const auth = Buffer.from(API_KEY + ':' + SECRET_KEY).toString('base64');
  const body = JSON.stringify({
    source_addr: SENDER_ID, encoding: 0, schedule_time: '',
    message: 'DUKA LANGU\nTest SMS inafanya kazi!\nCode: 123456\nAsante!',
    recipients: [{ recipient_id: 1, dest_addr: phone }],
  });

  return new Promise((resolve) => {
    const request = https.request({
      hostname: 'apisms.bfrnd.com', path: '/api/send-sms', method: 'POST',
      headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (response) => {
      let data = '';
      response.on('data', c => data += c);
      response.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch(e) { parsed = { raw: data }; }
        res.status(200).json({
          success: response.statusCode >= 200 && response.statusCode < 300,
          beem_status: response.statusCode,
          phone, sender: SENDER_ID,
          beem_response: parsed,
        });
        resolve();
      });
    });
    request.on('error', (e) => {
      res.status(500).json({ success: false, error: e.message, phone });
      resolve();
    });
    request.setTimeout(15000, () => { request.destroy(); });
    request.write(body);
    request.end();
  });
}
