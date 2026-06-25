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
    source_addr: SENDER_ID,
    encoding: 0,
    schedule_time: '',
    message: 'DUKA LANGU - Test SMS! Code: 123456',
    recipients: [{ recipient_id: 1, dest_addr: phone }],
  });

  // Try multiple endpoints
  const endpoints = [
    { host: 'apisms.beem.africa', path: '/v1/send' },
    { host: 'apisms.bfrnd.com', path: '/v1/send' },
    { host: 'apisms.bfrnd.com', path: '/api/send-sms' },
  ];

  for (const ep of endpoints) {
    try {
      const result = await new Promise((resolve, reject) => {
        const request = https.request({
          hostname: ep.host,
          path: ep.path,
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + auth,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'User-Agent': 'Mozilla/5.0 DukaLangu/1.0',
            'Accept': 'application/json',
          },
        }, (response) => {
          let data = '';
          response.on('data', c => data += c);
          response.on('end', () => {
            let parsed;
            try { parsed = JSON.parse(data); } catch (e) { parsed = { raw: data }; }
            resolve({ status: response.statusCode, data: parsed, endpoint: ep.host + ep.path });
          });
        });
        request.on('error', reject);
        request.setTimeout(20000, () => { request.destroy(); reject(new Error('Timeout')); });
        request.write(body);
        request.end();
      });

      if (result.status >= 200 && result.status < 300) {
        return res.status(200).json({ success: true, ...result, phone, sender: SENDER_ID });
      }
      // Continue to next endpoint if this one returned error
      console.log('[SMS] Endpoint failed:', ep.host, result.status, result.data);
    } catch (err) {
      console.log('[SMS] Endpoint error:', ep.host, err.message);
      // Try next endpoint
    }
  }

  return res.status(500).json({
    success: false,
    error: 'All Beem endpoints failed - tried apisms.beem.africa and apisms.bfrnd.com',
    phone,
    suggestion: 'Beem SMS may be blocking Vercel IPs. Use email OTP instead.',
  });
}
