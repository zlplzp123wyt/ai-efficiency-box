export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    try {
      const body = await request.json();
      const text = body.text;
      const style = body.style || 'academic';
      const level = body.level || 'medium';

      if (!text || text.length < 10) {
        return new Response(JSON.stringify({ error: '请输入至少10个字' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const STYLE_MAP = {
        academic: '学术正式风格，用词严谨，适合论文',
        natural: '自然流畅风格，像人类写作',
        simple: '简洁易懂风格，降低复杂度',
      };
      const LEVEL_MAP = {
        light: '轻度改写：保持原文结构，只替换同义词和调整语序',
        medium: '中度改写：重组句子结构，合并或拆分句子，替换表达方式',
        heavy: '深度改写：完全重写，保持核心意思但大幅改变表达方式',
      };

      const prompt = `你是一个专业的论文降重助手。请对以下文本进行改写，降低与原文的相似度，同时保持原意不变。

改写要求：
- ${LEVEL_MAP[level] || LEVEL_MAP.medium}
- 风格：${STYLE_MAP[style] || STYLE_MAP.academic}
- 保持专业术语不变
- 保持逻辑结构清晰
- 改写后的文本应该与原文意思一致但表达方式明显不同
- 直接输出改写后的文本，不要加任何解释或前缀

原文：
${text}`;

      const apiKey = env.ZHIPU_API_KEY;

      const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
          temperature: 0.8,
        }),
      });

      const data = await res.json();
      const result = data.choices?.[0]?.message?.content;

      if (!result) {
        return new Response(JSON.stringify({ error: 'AI未返回结果', debug: JSON.stringify(data) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ result: result.trim() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  },
};
