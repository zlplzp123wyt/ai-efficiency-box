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
      const tool = body.type || body.tool || 'rewrite';
      const text = body.text;

      if (!text || text.length < 10) {
        return new Response(JSON.stringify({ error: '请输入至少10个字' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      let prompt;

      if (tool === 'rewrite') {
        const style = body.style || 'academic';
        const level = body.level || 'medium';
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
        prompt = `你是一个专业的论文降重助手。请对以下文本进行改写，降低与原文的相似度，同时保持原意不变。

改写要求：
- ${LEVEL_MAP[level] || LEVEL_MAP.medium}
- 风格：${STYLE_MAP[style] || STYLE_MAP.academic}
- 保持专业术语不变
- 保持逻辑结构清晰
- 改写后的文本应该与原文意思一致但表达方式明显不同
- 直接输出改写后的文本，不要加任何解释或前缀

原文：
${text}`;

      } else if (tool === 'resume') {
        const targetJob = body.jobTarget || body.targetJob || '';
        const style = body.resumeStyle || body.style || 'professional';
        const STYLE_MAP = {
          professional: '专业稳重，适合金融/法律/咨询等行业',
          creative: '创意活泼，适合设计/营销/互联网行业',
          concise: '简洁精炼，适合技术岗/工程岗',
        };
        prompt = `你是一位资深HR和职业规划师。请对以下简历内容进行优化，使其更具竞争力。

优化方向：
- 目标岗位：${targetJob || '通用'}
- 风格：${STYLE_MAP[style] || STYLE_MAP.professional}

优化要求：
1. 使用STAR法则（情境-任务-行动-结果）重写工作经历
2. 量化成果（用数据说话，如"提升30%"、"管理5人团队"）
3. 突出与目标岗位匹配的关键词
4. 精简冗余描述，每条经历控制在2-3行
5. 如果有明显的短板，给出改善建议
6. 直接输出优化后的简历内容，格式清晰
7. 最后给出3-5条具体的改善建议

简历内容：
${text}`;

      } else if (tool === 'copywriting') {
        const platform = body.platform || 'taobao';
        const type = body.type || 'all';
        const PLAT_MAP = {
          taobao: '淘宝/天猫',
          douyin: '抖音/短视频',
          xiaohongshu: '小红书',
          wechat: '微信/朋友圈',
        };
        prompt = `你是一位资深电商文案专家，精通各平台的文案风格和算法推荐机制。请根据以下产品信息，生成${PLAT_MAP[platform]}平台的文案。

平台风格要求：
- 淘宝/天猫：标题含关键词、卖点前置、30字以内
- 抖音/短视频：口语化、有冲击力、前3秒抓眼球、适合短视频口播
- 小红书：种草风格、有真实感、适当用emoji、标题带数字或对比
- 微信/朋友圈：简洁精致、有调性、适合熟人社交传播

请输出以下内容（用##标题分隔）：
1. ## 产品标题（3个备选方案）
2. ## 详情描述（卖点+场景+促销，200字左右）
3. ## 推广软文（适合发社交媒体，100字左右）

产品信息：
${text}`;

      } else if (tool === 'contract') {
        const focus = body.focusArea || 'complete';
        const FOCUS_MAP = {
          complete: '全面审查（法律风险+条款公平性+缺失条款）',
          risk: '重点审查法律风险（违约责任、争议解决、免责条款）',
          fair: '重点审查条款公平性（权利义务对等、格式条款识别）',
        };
        prompt = `你是一位资深法务顾问，精通中国合同法和相关法规。请对以下合同内容进行审查。

审查重点：${FOCUS_MAP[focus] || FOCUS_MAP.complete}

请按以下格式输出审查报告：

## 📋 合同审查报告

### 🔍 条款逐一审查
对每条关键条款：标注风险等级（🔴高风险 🟡中风险 🟢低风险），分析问题，给出修改建议

### ⚠️ 缺失条款提醒
列出应该有但缺失的保护性条款

### 📊 风险总结
列出前3大风险，给出总体建议

合同内容：
${text}`;

      } else {
        return new Response(JSON.stringify({ error: '未知工具类型: ' + tool }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

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
