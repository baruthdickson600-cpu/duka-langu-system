import https from 'https';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const API_KEY = process.env.BEEM_API_KEY || 'd73c42b7c28a7c3c';
  const SECRET_KEY = process.env.BEEM_SECRET_KEY || 'YzU2NTEwMWY3OGJiNjAxYmZlYWM3Y2UzYTlmNTU5YTEwOTY3MWVmZDcxNmZlMjY4MzYyNTU5MTU0NTIzODUwZQ==';
  const SENDER_ID = process.env.BEEM_SENDER_ID || 'dukalangu';

  const phone = '255628986770';
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const message = `DUKA LANGU\nTEST OTP: ${otp}\nInaisha dakika 5.`;

  const auth = Buffer.from(API_KEY + ':' + SECRET_KEY).toString('base64');
  const body = JSON.stringify({
    source_addr: SENDER_ID,
    encoding: 0,
    schedule_time: '',
    message,
    recipients: [{ recipient_id: 1, dest_addr: phone }],
  });

  try {
    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'apisms.beem.africa',
        path: '/v1/send',
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + auth,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, (response) => {
        let data = '';
        response.on('data', c => data += c);
        response.on('end', () => {
          try { resolve({ status: response.statusCode, data: JSON.parse(data) }); }
          catch (e) { resolve({ status: response.statusCode, raw: data }); }
        });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
      req.write(body);
      req.end();
    });
    return res.status(200).json({
      success: result.status >= 200 && result.status < 300,
      otp_sent: otp,
      phone,
      sender: SENDER_ID,
      ...result,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message, phone });
  }
}
