import { NextRequest, NextResponse } from 'next/server'

interface WechatAnalyzeRequest {
  content: string
  source: 'text' | 'image' | 'voice'
}

export async function POST(req: NextRequest) {
  try {
    const { content, source }: WechatAnalyzeRequest = await req.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(getFallbackWechatAnalysis(content), { status: 200 })
    }

    const sourceLabel = source === 'image' ? '聊天截图（OCR识别）' : source === 'voice' ? '语音转文字' : '手动粘贴'

    const prompt = `你是一位专业的语言心理学家和欺骗检测专家，擅长通过文字表达分析诚信度。请分析以下微信聊天记录，识别可能存在的欺骗、回避或矛盾之处。

来源方式：${sourceLabel}

聊天内容：
---
${content.slice(0, 3000)}
---

请用以下JSON格式输出分析结果（必须是合法JSON，不加markdown代码块标记）：
{
  "credibilityScore": 0-100的整数（越高越可信）,
  "level": 1-5的整数（5=完全可信，4=较可信，3=存疑，2=可疑，1=高度可疑）,
  "levelLabel": "等级名称（如绿色安全区/黄色注意区等）",
  "levelColor": "green/blue/yellow/orange/red",
  "summary": "2-3句整体评价",
  "suspiciousPoints": [
    {
      "quote": "原文中可疑的语句片段（20字以内）",
      "reason": "可疑原因分析（30-50字）",
      "riskLevel": "high/medium/low"
    }
  ],
  "theoreticalBasis": "引用1-2个真实心理语言学理论支撑分析",
  "patterns": ["识别到的语言模式1（25-40字）", "模式2", "模式3"],
  "advice": "针对性建议100-150字",
  "disclaimer": "免责说明一句话"
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      console.error('Wechat analyze error:', await response.text())
      return NextResponse.json(getFallbackWechatAnalysis(content), { status: 200 })
    }

    const data = await response.json()
    const text = data.content[0].text

    try {
      return NextResponse.json(JSON.parse(text))
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        try { return NextResponse.json(JSON.parse(match[0])) } catch { /* ignore */ }
      }
      return NextResponse.json(getFallbackWechatAnalysis(content))
    }
  } catch (error) {
    console.error('Wechat analyze error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function getFallbackWechatAnalysis(content: string) {
  const wordCount = content.length
  const hasNegation = /没有|不是|从来没|绝对没|怎么可能/.test(content)
  const hasVague = /可能|也许|好像|大概|随便|不知道/.test(content)
  const hasDeflect = /你怎么这样|为什么不信我|你不信我|烦死了/.test(content)

  let score = 65
  if (hasNegation) score -= 10
  if (hasVague) score -= 8
  if (hasDeflect) score -= 15
  if (wordCount < 50) score -= 5
  score = Math.min(90, Math.max(25, score))

  const level = score >= 80 ? 5 : score >= 65 ? 4 : score >= 50 ? 3 : score >= 35 ? 2 : 1
  const levelLabel = level === 5 ? '绿色安全区' : level === 4 ? '蓝色放心区' : level === 3 ? '黄色注意区' : level === 2 ? '橙色警戒区' : '红色危机区'
  const levelColor = level === 5 ? 'green' : level === 4 ? 'blue' : level === 3 ? 'yellow' : level === 2 ? 'orange' : 'red'

  const suspiciousPoints = []
  if (hasNegation) suspiciousPoints.push({ quote: '过度否认表述', reason: '心理学研究表明，无辜者通常不需要过度强调"绝对没有"，过度否认反而可能是防御性反应', riskLevel: 'medium' })
  if (hasVague) suspiciousPoints.push({ quote: '模糊性表达', reason: '使用"可能""也许"等模糊词汇回避明确承诺，是认知负荷增加时的典型语言表现', riskLevel: 'medium' })
  if (hasDeflect) suspiciousPoints.push({ quote: '话题转移行为', reason: '通过质疑对方信任度来转移话题焦点，是常见的防御性欺骗策略', riskLevel: 'high' })

  return {
    credibilityScore: score,
    level,
    levelLabel,
    levelColor,
    summary: `本次聊天记录共分析 ${wordCount} 字，综合可信度评分为 ${score}%。${suspiciousPoints.length > 0 ? `发现 ${suspiciousPoints.length} 处值得关注的语言模式。` : '整体表达较为正常，未发现明显欺骗迹象。'}`,
    suspiciousPoints,
    theoreticalBasis: '基于保罗·艾克曼的欺骗心理学和 CBCA（基于标准的内容分析）理论：真实陈述通常包含更多细节、上下文和自发性修正，而欺骗性陈述往往更加简短、缺乏具体细节，并伴随过度否认或话题转移。',
    patterns: [
      '信息密度分析：回答内容详尽程度与问题复杂度的比例',
      `情绪一致性：文字情绪表达与话题严重性${hasDeflect ? '存在偏差' : '基本匹配'}`,
      `防御性语言：${hasNegation || hasDeflect ? '检测到防御性表达模式' : '未发现明显防御性语言'}`,
    ],
    advice: `根据分析结果，建议${score >= 60 ? '保持信任的同时适当关注，可以在轻松的环境下就疑虑话题进行坦诚沟通。记住，文字分析存在局限性，面对面的沟通更能反映真实情况。' : '不要急于做出判断，选择一个双方都平静的时机进行面对面的深度交流。以"我感到担忧"替代"你在撒谎"的表达方式，有助于建立更安全的沟通环境，获得更真实的答案。'}`,
    disclaimer: '本分析基于语言心理学模型，仅供参考，不构成事实判断。文字沟通存在大量非语言信息缺失，重要决策请结合面对面沟通。',
  }
}
