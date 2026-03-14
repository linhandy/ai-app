'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MobileWrapper from '@/components/MobileWrapper'
import StatusBar from '@/components/StatusBar'
import TabBar from '@/components/TabBar'

interface Answer {
  questionId: number
  questionText: string
  category: string
  judgment: 'true' | 'lie'
  credibility: number
  transcript?: string
}

interface AIAnalysis {
  level: number
  levelLabel: string
  levelColor: string
  summary: string
  theoreticalBasis: string
  patterns: string[]
  riskAreas: string[]
  advice: string
  disclaimer: string
}

const LEVEL_CONFIGS: Record<number, { emoji: string; bg: string; border: string; text: string; barColor: string }> = {
  5: { emoji: '💚', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', barColor: '#059669' },
  4: { emoji: '💙', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', barColor: '#2563EB' },
  3: { emoji: '💛', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', barColor: '#F59E0B' },
  2: { emoji: '🧡', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', barColor: '#F97316' },
  1: { emoji: '❤️', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', barColor: '#EF4444' },
}

export default function ResultPage() {
  const router = useRouter()
  const [answers, setAnswers] = useState<Answer[]>([])
  const [score, setScore] = useState(0)
  const [displayScore, setDisplayScore] = useState(0)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [shareMode, setShareMode] = useState(false)
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('ld_answers')
    if (!raw) { router.push('/setup'); return }
    const data: Answer[] = JSON.parse(raw)
    setAnswers(data)

    const trueCount = data.filter(a => a.judgment === 'true').length
    const total = data.length
    const avgCredibility = total > 0 ? data.reduce((sum, a) => sum + a.credibility, 0) / total : 50
    const baseScore = total > 0 ? Math.round((trueCount / total) * 60 + avgCredibility * 0.4) : 50
    const finalScore = Math.min(99, Math.max(10, baseScore))
    setScore(finalScore)

    let current = 0
    const step = () => {
      current += Math.ceil((finalScore - current) / 8) || 1
      if (current >= finalScore) { setDisplayScore(finalScore); return }
      setDisplayScore(current)
      animationRef.current = setTimeout(step, 30)
    }
    animationRef.current = setTimeout(step, 400)

    // Call AI analysis
    setAiLoading(true)
    const setupRaw = localStorage.getItem('ld_setup')
    const setup = setupRaw ? JSON.parse(setupRaw) : { mode: 'ta', nickname: 'TA' }
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: data,
        score: finalScore,
        nickname: setup.nickname || 'TA',
        mode: setup.mode || 'ta',
      }),
    })
      .then(r => r.json())
      .then(d => { setAiAnalysis(d); setAiLoading(false) })
      .catch(() => { setAiLoading(false) })

    return () => { if (animationRef.current) clearTimeout(animationRef.current) }
  }, [router])

  const level = aiAnalysis?.level ?? (score >= 85 ? 5 : score >= 70 ? 4 : score >= 50 ? 3 : score >= 30 ? 2 : 1)
  const levelCfg = LEVEL_CONFIGS[level] ?? LEVEL_CONFIGS[3]

  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDash = circumference - (displayScore / 100) * circumference

  function buildShareText() {
    const label = aiAnalysis?.levelLabel ?? (score >= 85 ? '绿色安全区' : score >= 70 ? '蓝色放心区' : score >= 50 ? '黄色注意区' : score >= 30 ? '橙色警戒区' : '红色危机区')
    const advice = aiAnalysis?.advice ?? ''
    const basis = aiAnalysis?.theoreticalBasis ?? ''
    return [
      '【恋爱测谎仪 · 检测报告】',
      `综合可信度：${score}%`,
      `${levelCfg.emoji} 等级：${label}`,
      '',
      '📊 科学分析依据：',
      basis,
      '',
      '💡 建议：',
      advice,
      '',
      `⚠️ 共检测 ${answers.length} 题 | 本报告仅供参考`,
    ].filter(Boolean).join('\n')
  }

  async function handleWechatShare() {
    const text = buildShareText()
    if (navigator.share) {
      try {
        await navigator.share({ title: '恋爱测谎仪检测报告', text })
      } catch {
        // user cancelled
      }
    } else {
      setShareMode(true)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildShareText())
    setShareMode(false)
    alert('已复制！打开微信，粘贴发送给好友或发朋友圈 😊')
  }

  return (
    <MobileWrapper>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-[#2D0A6E]">
          <StatusBar dark />
          <div className="flex items-center px-5 pb-4 gap-3">
            <Link href="/home" className="text-white/80 text-2xl leading-none">‹</Link>
            <h1 className="text-white font-bold text-lg flex-1 text-center">检测结果</h1>
            <button onClick={handleWechatShare} className="text-white/80 text-sm font-medium">分享</button>
          </div>
        </div>

        <div className="flex-1 px-5 py-5 space-y-4 overflow-y-auto">
          {/* Score circle */}
          <div className="bg-white rounded-3xl p-6 flex flex-col items-center shadow-sm">
            <div className="relative w-[150px] h-[150px]">
              <svg width="150" height="150" className="-rotate-90">
                <circle cx="75" cy="75" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="10" />
                <circle
                  cx="75" cy="75" r={radius} fill="none"
                  stroke={levelCfg.barColor}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDash}
                  style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-gray-900">{displayScore}<span className="text-xl">%</span></span>
                <span className="text-gray-500 text-xs mt-1">可信度</span>
              </div>
            </div>

            {/* Level badge */}
            <div className={`mt-4 px-4 py-2.5 rounded-2xl border text-center w-full ${levelCfg.bg} ${levelCfg.border}`}>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">{levelCfg.emoji}</span>
                <div>
                  <p className={`font-bold text-sm ${levelCfg.text}`}>
                    {aiAnalysis?.levelLabel ?? (score >= 85 ? '绿色安全区' : score >= 70 ? '蓝色放心区' : score >= 50 ? '黄色注意区' : score >= 30 ? '橙色警戒区' : '红色危机区')}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {level === 5 ? '第五级 · 最高信任' : level === 4 ? '第四级 · 较高信任' : level === 3 ? '第三级 · 存在疑点' : level === 2 ? '第二级 · 明显可疑' : '第一级 · 高度可疑'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-[#1E1035] px-4 py-3 flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <h3 className="text-white font-bold text-sm flex-1">AI 科学分析</h3>
              {aiLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            </div>

            {aiLoading ? (
              <div className="bg-[#2A1A50] px-4 py-6 flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-purple-300 text-xs">AI 正在分析中，请稍候...</p>
              </div>
            ) : aiAnalysis ? (
              <div className="bg-[#2A1A50] px-4 py-4 space-y-4">
                {/* Summary */}
                <p className="text-white/90 text-xs leading-relaxed">{aiAnalysis.summary}</p>

                {/* Theoretical basis */}
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-purple-300 text-[10px] font-semibold mb-1.5">📚 理论依据</p>
                  <p className="text-white/80 text-xs leading-relaxed">{aiAnalysis.theoreticalBasis}</p>
                </div>

                {/* Patterns */}
                {aiAnalysis.patterns?.length > 0 && (
                  <div>
                    <p className="text-purple-300 text-[10px] font-semibold mb-2">🔍 行为模式分析</p>
                    <div className="space-y-1.5">
                      {aiAnalysis.patterns.map((p, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-purple-400 text-[10px] mt-0.5">▸</span>
                          <p className="text-white/80 text-xs leading-relaxed">{p}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk areas */}
                {aiAnalysis.riskAreas?.length > 0 && (
                  <div>
                    <p className="text-purple-300 text-[10px] font-semibold mb-2">⚠️ 关注领域</p>
                    <div className="flex flex-wrap gap-2">
                      {aiAnalysis.riskAreas.map((r, i) => (
                        <span key={i} className="text-[10px] bg-red-500/20 text-red-300 px-2 py-1 rounded-lg">{r}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advice */}
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-purple-300 text-[10px] font-semibold mb-1.5">💡 专业建议</p>
                  <p className="text-white/80 text-xs leading-relaxed">{aiAnalysis.advice}</p>
                </div>

                <p className="text-white/40 text-[10px] leading-relaxed">{aiAnalysis.disclaimer}</p>
              </div>
            ) : (
              <div className="bg-[#2A1A50] px-4 py-4">
                <p className="text-white/60 text-xs text-center">分析加载失败，请检查网络连接</p>
              </div>
            )}
          </div>

          {/* Question analysis */}
          {answers.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-gray-800 font-bold text-sm mb-3">逐题详情</h3>
              <div className="space-y-3">
                {answers.map((ans, i) => (
                  <div key={ans.questionId} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 text-xs leading-relaxed">{ans.questionText}</p>
                      {ans.transcript && (
                        <p className="text-gray-400 text-[10px] mt-0.5 italic line-clamp-1">💬 {ans.transcript}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ans.judgment === 'true' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {ans.judgment === 'true' ? '✅ 真话' : '❌ 谎言'}
                        </span>
                        <span className="text-gray-400 text-[10px]">可信度 {ans.credibility}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-2 bg-gray-50 space-y-2">
          {/* WeChat share button */}
          <button
            onClick={handleWechatShare}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm gradient-primary shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
          >
            <span>💬</span>
            <span>分享到微信 / 朋友圈</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/setup" className="block">
              <button className="w-full py-3 rounded-xl bg-purple-100 text-purple-700 font-semibold text-xs flex items-center justify-center gap-1">
                <span>🔄</span><span>再来一次</span>
              </button>
            </Link>
            <Link href="/history" className="block">
              <button className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-xs flex items-center justify-center gap-1">
                <span>📋</span><span>查看历史</span>
              </button>
            </Link>
          </div>
        </div>

        <TabBar activeTab="history" />
      </div>

      {/* WeChat share modal */}
      {shareMode && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={() => setShareMode(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-gray-900 font-bold text-base text-center">分享到微信</h3>
            <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-600 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
              {buildShareText()}
            </div>
            <p className="text-gray-400 text-xs text-center">复制文字后，打开微信发送给好友或发朋友圈</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShareMode(false)} className="py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm">
                取消
              </button>
              <button onClick={handleCopy} className="py-3 rounded-xl text-white font-semibold text-sm gradient-primary">
                📋 复制内容
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileWrapper>
  )
}
