/**
 * POST /api/stripe/webhook
 * Env: STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY
 * Skeleton: verify signature next; for now acknowledge + log event type.
 * Credits ledger TBD (KV/D1) — do not invent storage binding yet.
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  const raw = await request.text();
  // Production: verify Stripe-Signature with STRIPE_WEBHOOK_SECRET
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('bad payload', { status: 400 });
  }
  if (event.type === 'checkout.session.completed') {
    // TODO: grant decode credits to email/customer in KV/D1
  }
  return new Response(JSON.stringify({ received: true, type: event.type || null }), {
    headers: { 'content-type': 'application/json' },
  });
}
