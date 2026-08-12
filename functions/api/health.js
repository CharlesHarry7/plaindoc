export async function onRequestGet(context) {
  const { env } = context;
  return new Response(
    JSON.stringify({
      ok: true,
      service: 'plaindoc',
      stripe: Boolean(env.STRIPE_SECRET_KEY),
      llm: Boolean(env.OPENAI_API_KEY),
      prices: {
        single: Boolean(env.PRICE_SINGLE),
        pack5: Boolean(env.PRICE_PACK5),
      },
    }),
    { headers: { 'content-type': 'application/json; charset=utf-8' } }
  );
}
