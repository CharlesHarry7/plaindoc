const { sendJson } = require('./_utils');

module.exports = function handler(req, res) {
  const env = process.env;
  sendJson(res, {
    ok: true,
    service: 'plaindoc',
    stripe: Boolean(env.STRIPE_SECRET_KEY),
    llm: Boolean(env.OPENAI_API_KEY),
    prices: {
      single: Boolean(env.PRICE_SINGLE),
      pack5: Boolean(env.PRICE_PACK5),
    },
  });
};
