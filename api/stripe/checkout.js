const { readJson, sendJson } = require('../_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return sendJson(res, { error: 'Method Not Allowed' }, 405);
  }

  const env = process.env;
  if (!env.STRIPE_SECRET_KEY) {
    return sendJson(res, { error: 'STRIPE_SECRET_KEY not set — paste from your existing Stripe account' }, 501);
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, { error: 'Invalid JSON' }, 400);
  }

  const pack = body.pack === 'pack5' ? 'pack5' : 'single';
  const price = pack === 'pack5' ? env.PRICE_PACK5 : env.PRICE_SINGLE;
  if (!price) {
    return sendJson(res, { error: `Missing env ${pack === 'pack5' ? 'PRICE_PACK5' : 'PRICE_SINGLE'}` }, 501);
  }

  const forwardedProto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const origin = `${forwardedProto}://${req.headers.host}`;
  const base = (env.PUBLIC_BASE_URL || origin).replace(/\/$/, '');
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', `${base}/decode.html?paid=1`);
  params.set('cancel_url', `${base}/?canceled=1`);
  params.set('line_items[0][price]', price);
  params.set('line_items[0][quantity]', '1');
  params.set('metadata[pack]', pack);

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const data = await resp.json();
  if (!resp.ok) {
    return sendJson(res, { error: data.error?.message || 'Stripe error' }, 502);
  }
  return sendJson(res, { url: data.url, id: data.id });
};
