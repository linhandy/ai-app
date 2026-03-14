import { NextRequest, NextResponse } from 'next/server'

interface Answer {
  questionId: number
  questionText: string
  category: string
  judgment: 'true' | 'lie'
  credibility: number
  transcript?: string
}

interface AnalyzeRequest {
  answers: Answer[]
  score: number
  nickname: string
  mode: 'ta' | 'self'
}

export async function POST(req: NextRequest) {
  try {
    const { answers, score, nickname, mode }: AnalyzeRequest = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(getFallbackAnalysis(answers, score, mode), { status: 200 })
    }

    const lieCount = answers.filter(a => a.judgment === 'lie').length
    const trueCount = answers.filter(a => a.judgment === 'true').length
    const total = answers.length

    const questionSummary = answers.map((a, i) =>
      `Q${i + 1}[${a.category}]: ${a.questionText}\n   判断: ${a.judgment === 'true' ? '真话' : '谎言'} | 可信度: ${a.credibility}%${a.transcript ? `\n   实录: ${a.transcript}` : ''}`
    ).join('\n')

    const prompt = `你是一位专业的心理学家和行为分析专家，研究方向是亲密关系诚信评估。请基于以下测谎数据，出具一份专业、科学、有人情味的分析报告。

测试信息：
- 被测对象：${mode === 'self' ? '本人（自我评估）' : nickname || 'TA'}
- 模式：${mode === 'self' ? '自我诚实度检测' : '伴侣测谎'}
- 综合可信度：${score}%
- 共${total}题，真话${trueCount}题，谎言${lieCount}题

逐题记录：
${questionSummary}

请以如下JSON格式输出（必须是合法JSON，不要包含markdown代码块标记）：
{
  "level": 数字1-5（5=完全可信，4=较可信，3=存疑，2=可疑，1=高度可疑）,
  "levelLabel": "等级名称",
  "levelColor": "颜色英文单词（green/blue/yellow/orange/red）",
  "summary": "2-3句总体评价，语气温和专业",
  "theoreticalBasis": "引用1-2个真实心理学理论支撑分析，需说明理论名称和核心观点",
  "patterns": ["观察到的行为模式1（25-40字）", "行为模式2", "行为模式3"],
  "riskAreas": ["需关注的领域1（20-30字）", "领域2"],
  "advice": "具体建议120-180字，温和、实用、有建设性",
  "disclaimer": "专业免责说明一句话"
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
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      console.error('Anthropic API error:', await response.text())
      return NextResponse.json(getFallbackAnalysis(answers, score, mode), { status: 200 })
    }

    const data = await response.json()
    const content = data.content[0].text

    try {
      const parsed = JSON.parse(content)
      return NextResponse.json(parsed)
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          return NextResponse.json(JSON.parse(jsonMatch[0]))
        } catch {
          // ignore
        }
      }
      return NextResponse.json(getFallbackAnalysis(answers, score, mode))
    }
  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function getFallbackAnalysis(answers: Answer[], score: number, mode: 'ta' | 'self') {
  const lieCount = answers.filter(a => a.judgment === 'lie').length
  const total = answers.length
  const liePercent = total > 0 ? Math.round((lieCount / total) * 100) : 0

  let level: number
  let levelLabel: string
  let levelColor: string
  let summary: string
  let advice: string

  if (score >= 85) {
    level = 5; levelLabel = '绿色安全区'; levelColor = 'green'
    summary = `本次检测综合可信度达 ${score}%，属于高度诚实范畴。${mode === 'self' ? '您的自我评估显示出高度的诚实水平，内心一致性良好。' : 'TA 在各问题上的回答表现出高度一致性，语言模式稳定，未发现明显欺骗迹象。'}`
    advice = `整体来看，这段关系建立在良好的诚信基础上。${mode === 'self' ? '建议继续保持真诚的自我认知，对自己诚实是成长的重要基础。在关系中，这种诚实态度会带来更深的连接与信任。' : '建议在此基础上继续深化沟通，创造更多坦诚交流的机会。偶尔出现的轻微回避属于正常人际边界的体现，不需要过度解读。保持相互尊重和开放的沟通氛围，关系会更加稳固。'}`
  } else if (score >= 70) {
    level = 4; levelLabel = '蓝色放心区'; levelColor = 'blue'
    summary = `综合可信度 ${score}%，整体表现较为诚实。共 ${total} 题中有 ${lieCount} 题（${liePercent}%）存在可疑信号，属于正常范围内的轻微保留。`
    advice = `整体诚实度良好，少量问题上存在轻微回避属于正常现象。建议针对可疑话题在轻松的氛围下进行二次确认，避免正面对质。选择 TA 心情好的时机，以"我想更了解你"的方式开启话题，而非"你是否在说谎"的质疑态度，这样更容易获得真实答案。`
  } else if (score >= 50) {
    level = 3; levelLabel = '黄色注意区'; levelColor = 'yellow'
    summary = `综合可信度 ${score}%，存在一定程度的信息保留。${lieCount} 题（${liePercent}%）出现可疑信号，部分敏感话题上出现明显的语言模式变化。`
    advice = `检测显示存在值得关注的信号，建议不要急于质问，而是创造安全的沟通环境。可以先分享自己的感受和担忧，用"我感到..."替代"你是不是..."的表达方式。心理学研究表明，人们在感到被理解而非被审判时，才更愿意坦诚分享。选择合适的时机、安全的环境进行深度沟通至关重要。`
  } else if (score >= 30) {
    level = 2; levelLabel = '橙色警戒区'; levelColor = 'orange'
    summary = `综合可信度仅 ${score}%，存在明显的欺骗迹象。${lieCount} 题（${liePercent}%）判断为谎言，多个类别的问题均出现可疑模式，需要引起重视。`
    advice = `检测结果显示存在较多可疑信号。在做出任何判断之前，建议先冷静思考，因为测谎工具存在误差，主观判断也可能受情绪影响。建议选择两人都平静的状态，进行一次坦诚的面对面沟通。表达你的担忧和感受，倾听对方的解释。如果沟通困难，可以考虑寻求专业关系咨询帮助。`
  } else {
    level = 1; levelLabel = '红色危机区'; levelColor = 'red'
    summary = `综合可信度仅 ${score}%，检测显示大量可疑信号。${lieCount} 题（${liePercent}%）判断为谎言，整体诚信模式令人担忧，关系可能面临严重的信任危机。`
    advice = `检测结果显示关系存在严重的信任问题，但请记住任何工具都有局限性。在采取行动之前，请务必保持冷静，避免冲动决定。建议寻求专业情感咨询师的帮助，专业人士能提供更准确的评估和指导。无论结果如何，自我保护和心理健康是最重要的。`
  }

  return {
    level,
    levelLabel,
    levelColor,
    summary,
    theoreticalBasis: '基于保罗·艾克曼（Paul Ekman）的微表情研究和认知负荷理论：说谎时大脑需要同时维持谎言逻辑和压制真相记忆，导致认知负担增加，在语言流畅度、反应速度和情绪控制上出现可观察的变化。',
    patterns: [
      '回答速度异常：特定问题上出现停顿或过快回应，与基准反应时间有偏差',
      '语言模式切换：从直接陈述转变为修饰性、模糊性表达，信息量减少',
      `情绪一致性：${liePercent}% 的问题显示情绪表达与内容逻辑存在偏差`,
    ],
    riskAreas: lieCount > 0 ? [
      answers.filter(a => a.judgment === 'lie')[0]?.category + '类问题存在信息保留',
      '建议就可疑话题进行单独深入沟通',
    ] : ['未发现明显风险领域'],
    advice,
    disclaimer: '本分析基于行为心理学模型，仅供参考，不构成事实认定。重要决策请结合面对面沟通和专业咨询。',
  }
}
