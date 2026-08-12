async function readRawBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') return req.body;
    if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
    return JSON.stringify(req.body);
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

async function readJson(req) {
  const raw = await readRawBody(req);
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

module.exports = { readJson, readRawBody, sendJson };
