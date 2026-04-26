// Test Beem SMS — fungua browser: /api/test-sms?phone=0628986770
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const API_KEY = process.env.BEEM_API_KEY || 'd73c42b7c28a7c3c';
  const SECRET_KEY = process.env.BEEM_SECRET_KEY || 'YzU2NTEwMWY3OGJiNjAxYmZlYWM3Y2UzYTlmNTU5YTEwOTY3MWVmZDcxNmZlMjY4MzYyNTU5MTU0NTIzODUwZQ==';
  const SENDER_ID = process.env.BEEM_SENDER_ID || 'dukalangu';

  let phone = req.query.phone || '0628986770';
  phone = phone.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '255' + phone.slice(1);
  if (!phone.startsWith('255')) phone = '255' + phone;

  const auth = Buffer.from(API_KEY + ':' + SECRET_KEY).toString('base64');
  
  const body = {
    source_addr: SENDER_ID,
    encoding: 0,
    schedule_time: '',
    message: 'DUKA LANGU - Test SMS inafanya kazi! Code: 123456',
    recipients: [{ recipient_id: 1, dest_addr: phone }],
  };

  try {
    const response = await fetch('https://apisms.bfrnd.com/api/send-sms', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch(e) { result = text; }

    return res.status(200).json({
      success: response.ok,
      status: response.status,
      phone,
      sender: SENDER_ID,
      auth_preview: 'Basic ' + auth.substring(0, 20) + '...',
      api_key_used: API_KEY,
      response: result,
      request_body: body,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, phone, sender: SENDER_ID });
  }
}
