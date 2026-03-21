import { NextRequest, NextResponse } from 'next/server'

interface Answer {
  questionId: number
  questionText: string
  category: string
  difficulty: string
  selectedOptionIndex: number
  selectedOptionText: string
  score: number
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

    const total = answers.length
    const lowScoreAnswers = answers.filter(a => a.score < 50)
    const highScoreAnswers = answers.filter(a => a.score >= 80)

    // Group low-score answers by category
    const riskCategories = Array.from(new Set(lowScoreAnswers.map(a => a.category)))

    const questionSummary = answers.map((a, i) =>
      `Q${i + 1}[${a.category}·${a.difficulty}]: ${a.questionText}\n   选择: ${String.fromCharCode(65 + a.selectedOptionIndex)}. ${a.selectedOptionText}（诚信分: ${a.score}）`
    ).join('\n')

    const prompt = `你是一位专业的心理学家和亲密关系顾问。请基于以下选择题测谎数据，出具一份专业、科学、有人情味的分析报告。

测试信息：
- 被测对象：${mode === 'self' ? '本人（自我评估）' : nickname || 'TA'}
- 模式：${mode === 'self' ? '自我诚实度检测' : '伴侣测谎'}
- 综合诚信分：${score}分（满分100）
- 共${total}题，高诚信答案${highScoreAnswers.length}题，低诚信答案${lowScoreAnswers.length}题
- 风险集中领域：${riskCategories.length > 0 ? riskCategories.join('、') : '无'}

逐题答案：
${questionSummary}

请以如下JSON格式输出（必须是合法JSON，不要包含markdown代码块标记）：
{
  "level": 数字1-4（4=基本可信，3=略有保留，2=存在隐患，1=危险信号）,
  "levelLabel": "等级名称",
  "levelColor": "颜色英文单词（green/yellow/orange/red）",
  "summary": "2-3句总体评价，基于具体选项分析，语气温和专业",
  "theoreticalBasis": "引用1-2个真实心理学理论支撑分析，需说明理论名称和核心观点",
  "patterns": ["基于选项内容观察到的心理模式1（25-40字）", "模式2", "模式3"],
  "riskAreas": ["需关注的具体领域1", "领域2"],
  "advice": "具体建议120-180字，基于答题选项给出有针对性的建议，温和、实用、有建设性",
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
  const total = answers.length
  const lowScoreAnswers = answers.filter(a => a.score < 50)
  const riskCategories = Array.from(new Set(lowScoreAnswers.map(a => a.category)))

  let level: number
  let levelLabel: string
  let levelColor: string
  let summary: string
  let advice: string

  if (score >= 80) {
    level = 4; levelLabel = '基本可信'; levelColor = 'green'
    summary = `本次综合诚信分达 ${score} 分，整体表现良好。${mode === 'self' ? '您的自我评估显示出较高的诚实水平，内心一致性良好。' : 'TA 在各问题上的选择显示出较高的诚信水平，未发现明显的保留迹象。'}`
    advice = `整体来看，这段关系建立在良好的诚信基础上。建议在此基础上继续深化沟通，创造更多坦诚交流的机会。偶尔出现的轻微保留属于正常人际边界，不需要过度解读。保持相互尊重和开放的沟通氛围，关系会更加稳固。`
  } else if (score >= 60) {
    level = 3; levelLabel = '略有保留'; levelColor = 'yellow'
    summary = `综合诚信分 ${score} 分，整体表现尚可，但个别问题存在保留。${riskCategories.length > 0 ? `在${riskCategories.join('、')}方面需要多加关注。` : ''}`
    advice = `整体诚信度尚可，部分问题上存在轻微保留属于正常现象。建议针对分数较低的话题，在轻松的氛围下进行二次确认，避免正面对质。选择对方心情好的时机，以"我想更了解你"的方式开启话题，而非质疑态度，这样更容易获得真实答案。`
  } else if (score >= 40) {
    level = 2; levelLabel = '存在隐患'; levelColor = 'orange'
    summary = `综合诚信分 ${score} 分，存在一定程度的信息保留。${riskCategories.length > 0 ? `${riskCategories.join('、')}类别的题目得分偏低，值得关注。` : '多道题目显示出保留迹象。'}`
    advice = `检测显示存在值得关注的信号，建议不要急于质问，而是创造安全的沟通环境。可以先分享自己的感受和担忧，用"我感到..."替代"你是不是..."的表达方式。心理学研究表明，人们在感到被理解而非被审判时，才更愿意坦诚分享。`
  } else {
    level = 1; levelLabel = '危险信号'; levelColor = 'red'
    summary = `综合诚信分仅 ${score} 分，多道题目显示出明显的保留或回避。${riskCategories.length > 0 ? `尤其在${riskCategories.join('、')}方面存在较多低分答案。` : ''}`
    advice = `检测结果显示存在较多值得担忧的信号，但请记住任何工具都有局限性。在采取行动之前，请务必保持冷静，避免冲动决定。建议选择两人都平静的状态，进行一次坦诚的面对面沟通，表达你的感受和担忧，倾听对方的解释。如有需要，可考虑寻求专业关系咨询帮助。`
  }

  const riskAreas = riskCategories.length > 0
    ? riskCategories.map(c => `${c}类问题得分偏低，建议深入沟通`)
    : ['未发现明显高风险领域']

  return {
    level,
    levelLabel,
    levelColor,
    summary,
    theoreticalBasis: '基于社会渗透理论（Altman & Taylor）和自我披露研究：在亲密关系中，真诚的自我披露程度与关系满意度高度相关。选择保留性答案往往反映个体在该领域的防御心理或真实担忧，而非简单的欺骗行为。',
    patterns: [
      `选择倾向分析：${total}道题中，高诚信选项（80分以上）占${Math.round((answers.filter(a => a.score >= 80).length / total) * 100)}%`,
      riskCategories.length > 0 ? `风险集中领域：${riskCategories.join('、')}类问题的选择显示出明显的保留倾向` : '各类别表现均衡，未见明显集中保留',
      `整体诚信分布：${score >= 60 ? '多数题目选择了较高诚信选项，整体态度积极' : '较多题目选择了低分选项，整体显示出较强的防御心理'}`,
    ],
    riskAreas,
    advice,
    disclaimer: '本分析基于选择题答案的统计分析，仅供参考，不构成事实认定。重要决策请结合面对面沟通和专业咨询。',
  }
}
