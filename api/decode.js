const { readJson, sendJson } = require('./_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return sendJson(res, { error: 'Method Not Allowed' }, 405);
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, { error: 'Invalid JSON' }, 400);
  }

  const text = (body.text || '').trim();
  const kind = body.kind || 'other';
  if (text.length < 40) {
    return sendJson(res, { error: '请粘贴更完整的文档（至少约 40 字）' }, 400);
  }
  if (text.length > 20000) {
    return sendJson(res, { error: '文本过长，请截取关键条款后重试' }, 400);
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const markdown = await llmDecode(process.env.OPENAI_API_KEY, kind, text);
      return sendJson(res, { markdown, demo: false });
    } catch {
      // Fall through to the heuristic fallback when the LLM is unavailable.
    }
  }

  return sendJson(res, {
    markdown: heuristicDecode(kind, text),
    demo: true,
  });
};

async function llmDecode(apiKey, kind, text) {
  const prompt = `你是法律/财务通俗解释助手（非律师，不提供法律意见）。文档类型:${kind}。
用中文输出 Markdown，结构固定：
## 一句话总结
## 关键条款/费用
## 潜在风险
## 建议下一步
不要编造文档里没有的数字；不确定就标明「原文未写清」。金额、日期、违约金优先摘录。

文档：
"""
${text.slice(0, 12000)}
"""`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });
  if (!resp.ok) throw new Error('llm');
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

function heuristicDecode(kind, text) {
  const money = [...text.matchAll(/(?:¥|￥|人民币)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:元|块)/g)]
    .map((m) => m[0].trim())
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 12);
  const dates = [...text.matchAll(/20\d{2}[\.\/\-年]\d{1,2}[\.\/\-月]\d{1,2}日?/g)]
    .map((m) => m[0])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 10);
  const riskHits = [];
  const rules = [
    [/违约金|违约责任|赔偿/, '出现违约金/赔偿责任表述，核对计算方式和上限'],
    [/押金|保证金/, '有押金/保证金条款，确认退还条件与扣款范围'],
    [/提前.*解除|单方解除|清退/, '关注提前解约/清退条件是否对一方明显不利'],
    [/自动续|顺延/, '可能自动续租/顺延，留意通知期限'],
    [/滞纳金|逾期/, '逾期费用条款，核对日费率是否过高'],
    [/维修|损坏|原状/, '维修与原状返还责任，入住前建议做交割清单'],
    [/转租|分租/, '转租限制，违者可能被解约'],
  ];
  for (const [re, tip] of rules) {
    if (re.test(text)) riskHits.push(tip);
  }
  if (!riskHits.length) riskHits.push('未命中常见风险关键词，仍建议人工核对关键数字与签字页');

  const label = { lease: '租房合同', bill: '账单', offer: 'Offer/劳动合同', other: '文档' }[kind] || '文档';
  const moneyBlock = money.length ? money.map((m) => `- ${m}`).join('\n') : '- （未用规则抽到明确「元」金额，请人工核对）';
  const dateBlock = dates.length ? dates.map((d) => `- ${d}`).join('\n') : '- （未抽到日期）';

  return `## 一句话总结
这是一份「${label}」类文本的**演示解读**（未接 LLM key）。下面用规则抽出了金额/日期与常见风险点，方便你先筛坑。

## 关键条款/费用
**金额（规则抽取）**
${moneyBlock}

**日期（规则抽取）**
${dateBlock}

## 潜在风险
${riskHits.map((x) => `- ${x}`).join('\n')}

## 建议下一步
1. 把所有金额、租期起止、违约金单独标黄
2. 签字前要书面确认：押金退还条件、维修责任、提前解约损失
3. 接上 OPENAI_API_KEY 后可升级为完整白话解读（本页会自动切换）
4. 重要决策请咨询专业人士——本工具不构成法律意见`;
}
