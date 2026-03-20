addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, event));
});

async function handleRequest(request, event) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const text = body.text;
    const style = body.style || 'academic';
    const level = body.level || 'medium';

    if (!text || text.length < 10) {
      return new Response(JSON.stringify({ error: '请输入至少10个字' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (text.length > 10000) {
      return new Response(JSON.stringify({ error: '单次最多10000字' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    var STYLE_MAP = {
      academic: '学术正式风格，用词严谨，适合论文',
      natural: '自然流畅风格，像人类写作',
      simple: '简洁易懂风格，降低复杂度',
    };
    var LEVEL_MAP = {
      light: '轻度改写：保持原文结构，只替换同义词和调整语序',
      medium: '中度改写：重组句子结构，合并或拆分句子，替换表达方式',
      heavy: '深度改写：完全重写，保持核心意思但大幅改变表达方式',
    };

    var prompt = '你是一个专业的论文降重助手。请对以下文本进行改写，降低与原文的相似度，同时保持原意不变。\n\n改写要求：\n- ' + (LEVEL_MAP[level] || LEVEL_MAP.medium) + '\n- 风格：' + (STYLE_MAP[style] || STYLE_MAP.academic) + '\n- 保持专业术语不变\n- 保持逻辑结构清晰\n- 改写后的文本应该与原文意思一致但表达方式明显不同\n- 直接输出改写后的文本，不要加任何解释或前缀\n\n原文：\n' + text;

    var apiKey = event.env ? event.env.ZHIPU_API_KEY : ZHIPU_API_KEY;

    var res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.8,
      }),
    });

    var data = await res.json();
    var result = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

    if (!result) {
      return new Response(JSON.stringify({ error: 'AI未返回结果' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ result: result.trim() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
