/**
 * POST /api/stripe/checkout  { pack: 'single' | 'pack5' }
 * Env: STRIPE_SECRET_KEY, PRICE_SINGLE, PRICE_PACK5, PUBLIC_BASE_URL
 * Reuse existing Stripe account — create two one-time Prices and paste IDs.
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: 'STRIPE_SECRET_KEY not set — paste from your existing Stripe account' }, 501);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const pack = body.pack === 'pack5' ? 'pack5' : 'single';
  const price = pack === 'pack5' ? env.PRICE_PACK5 : env.PRICE_SINGLE;
  if (!price) {
    return json({ error: `Missing env ${pack === 'pack5' ? 'PRICE_PACK5' : 'PRICE_SINGLE'}` }, 501);
  }
  const base = (env.PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/$/, '');
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
    return json({ error: data.error?.message || 'Stripe error' }, 502);
  }
  return json({ url: data.url, id: data.id });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
