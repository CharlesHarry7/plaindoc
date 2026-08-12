/**
 * POST /api/decode
 * Body: { kind, text }
 * Env: OPENAI_API_KEY optional
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
  if (text.length < 40) return json({ error: '请粘贴更完整的文档（至少约 40 字）' }, 400);
  if (text.length > 20000) return json({ error: '文本过长，请截取关键条款后重试' }, 400);

  if (env.OPENAI_API_KEY) {
    try {
      const markdown = await llmDecode(env.OPENAI_API_KEY, kind, text);
      return json({ markdown, demo: false });
    } catch (e) {}
  }
  return json({ markdown: heuristicDecode(kind, text), demo: true });
}

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
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.2 }),
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

  const rent = (text.match(/(?:月租金|租金为|租金[:：]|每月租金)[^。；;\n]{0,24}?((?:¥|￥|人民币)?\s*\d[\d,]*(?:\.\d+)?\s*元)/) || [])[1];
  const deposit = (text.match(/(?:押金|保证金)[^。；;\n]{0,24}?((?:¥|￥|人民币)?\s*\d[\d,]*(?:\.\d+)?\s*元)/) || [])[1];
  const lateFee = (text.match(/(?:滞纳金|逾期)[^。；;\n]{0,40}?(\d+(?:\.\d+)?\s*%)/) || [])[1];
  const partyA = (text.match(/甲方[（(]?[^）)\n]{0,12}[）)]?[：:]\s*([^\n，,。]{1,20})/) || [])[1];
  const partyB = (text.match(/乙方[（(]?[^）)\n]{0,12}[）)]?[：:]\s*([^\n，,。]{1,20})/) || [])[1];

  const risks = [];
  const push = (level, tip) => risks.push({ level, tip });
  if (/违约金|违约责任|赔偿/.test(text)) push('高', '有违约金/赔偿条款——核对计算基数、上限与是否“一个月租金”一口价');
  if (/押金|保证金/.test(text)) push('中', '押金退还条件与可扣款项要写清，退房时建议交割清单+拍照');
  if (/提前.*(?:解除|退租)|单方解除|清退/.test(text)) push('高', '提前解约/清退条件可能一边倒，确认通知期与损失计算');
  if (/自动续|顺延/.test(text)) push('中', '自动续租/顺延：标出反对通知的截止日，避免默续多一年');
  if (/滞纳金|逾期/.test(text)) push('中', '逾期费用' + (lateFee ? '约 ' + lateFee : '') + '——对照当地惯常水平，过高可协商改');
  if (/转租|分租/.test(text)) push('中', '转租限制较严，违者常被解约');
  if (/维修|损坏|原状/.test(text)) push('低', '维修与原状返还责任：入住当天做书面交割');
  if (kind === 'bill' && /保险|共付|自费/.test(text)) push('中', '账单含保险/自费项——逐项核对是否已付款或可申诉');
  if (kind === 'offer' && /试用期|竞业|期权|归属/.test(text)) push('高', '试用期/竞业/期权归属是高频坑，单独拉出来问 HR');
  if (!risks.length) push('低', '未命中常见风险词，仍建议人工核对签字页与全部数字');

  const label = { lease: '租房合同', bill: '账单', offer: 'Offer/劳动合同', other: '文档' }[kind] || '文档';
  const high = risks.filter((r) => r.level === '高').length;
  const summary =
    high >= 2
      ? '这份「' + label + '」至少有 ' + high + ' 处偏高风险点，建议签字前改条款或书面确认。'
      : high === 1
        ? '这份「' + label + '」有 1 处偏高风险点，其余先核对金额与日期。'
        : '这份「' + label + '」未见明显高风险关键词，但仍要核对金额、日期与签字页。';

  const keyLines = [];
  if (partyA || partyB) {
    keyLines.push('- 当事人：' + (partyA ? '甲方 ' + partyA : '') + (partyA && partyB ? ' / ' : '') + (partyB ? '乙方 ' + partyB : ''));
  }
  if (rent) keyLines.push('- 月租金（抽取）：' + rent);
  if (deposit) keyLines.push('- 押金（抽取）：' + deposit);
  if (lateFee) keyLines.push('- 滞纳金比例（抽取）：' + lateFee);
  keyLines.push('**金额（规则抽取）**');
  keyLines.push(money.length ? money.map((m) => '- ' + m).join('\n') : '- （未抽到「元」金额）');
  keyLines.push('**日期（规则抽取）**');
  keyLines.push(dates.length ? dates.map((d) => '- ' + d).join('\n') : '- （未抽到日期）');

  return [
    '## 一句话总结',
    summary,
    '',
    '> 演示模式：未接 LLM。下面用规则抽取，够你先筛坑；接上 key 后会升级成完整白话。',
    '',
    '## 关键条款/费用',
    keyLines.join('\n'),
    '',
    '## 潜在风险',
    risks.map((r) => '- 【' + r.level + '】' + r.tip).join('\n'),
    '',
    '## 建议下一步',
    '1. 把金额、租期/账单周期、违约金单独标黄，和对方书面确认',
    '2. 高风险条款改成「可接受的上限/通知期」再签字',
    '3. 需要更口语的条款拆解时再付费解锁完整解读',
    '4. 本工具不构成法律意见；重大决策请咨询专业人士',
  ].join('\n');
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
