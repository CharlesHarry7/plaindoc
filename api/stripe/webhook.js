const { readJson, sendJson } = require('../_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return sendJson(res, { error: 'Method Not Allowed' }, 405);
  }

  let event;
  try {
    event = await readJson(req);
  } catch {
    res.statusCode = 400;
    return res.end('bad payload');
  }
  if (event.type === 'checkout.session.completed') {
    // TODO: grant decode credits to email/customer in KV/D1.
  }
  return sendJson(res, { received: true, type: event.type || null });
};
