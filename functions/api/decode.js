/**
 * POST /api/decode
 * Body: { kind: 'lease'|'bill'|'offer'|'other', text: string }
 * Env: OPENAI_API_KEY (optional — demo fallback without it)
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const text = (body.text || '').trim();
  const kind = body.kind || 'other';
  if (text.length < 40) {
    return json({ error: '请粘贴更完整的文档（至少约 40 字）' }, 400);
  }
  if (text.length > 20000) {
    return json({ error: '文本过长，请截取关键条款后重试' }, 400);
  }

  if (!env.OPENAI_API_KEY) {
    return json({
      markdown: demoDecode(kind, text),
      demo: true,
    });
  }

  const prompt = `你是法律/财务通俗解释助手（非律师）。文档类型:${kind}。
用中文输出 Markdown，结构固定：
## 一句话总结
## 关键条款/费用
## 潜在风险
## 建议下一步
不要编造文档里没有的数字；不确定就标明「原文未写清」。

文档：
"""
${text.slice(0, 12000)}
"""`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: 'LLM failed', detail: err.slice(0, 300) }, 502);
  }
  const data = await resp.json();
  const markdown = data.choices?.[0]?.message?.content || '';
  return json({ markdown, demo: false });
}

function demoDecode(kind, text) {
  const snippet = text.slice(0, 80).replace(/\s+/g, ' ');
  return `## 一句话总结
（Demo）这是一份「${kind}」类文档开头：「${snippet}…」——接上 OPENAI_API_KEY 后返回真解读。

## 关键条款/费用
- 请重点核对：金额、期限、违约金、解除条件
- 原文未接模型，以下为占位

## 潜在风险
- 模糊表述可能对租客/付款方不利
- 建议对照当地法规或咨询专业人士

## 建议下一步
1. 标出所有金额与日期
2. 拍下/保存签署前版本
3. 有争议条款单独问房东/对方书面确认`;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
