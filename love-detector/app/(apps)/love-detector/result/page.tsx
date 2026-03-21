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
  difficulty: string
  selectedOptionIndex: number
  selectedOptionText: string
  score: number
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

const DIFFICULTY_WEIGHTS: Record<string, number> = {
  '灵魂拷问': 1.5,
  '犀利': 1.2,
  '温和': 1.0,
}

function calcWeightedScore(answers: Answer[]): number {
  if (!answers.length) return 50
  let totalWeighted = 0
  let totalWeight = 0
  for (const a of answers) {
    const w = DIFFICULTY_WEIGHTS[a.difficulty] ?? 1.0
    totalWeighted += a.score * w
    totalWeight += w
  }
  return Math.min(99, Math.max(10, Math.round(totalWeighted / totalWeight)))
}

function getLevelConfig(score: number) {
  if (score >= 80) return { level: 4, emoji: '💚', label: '基本可信', sublabel: '整体表现良好', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', color: '#22C55E' }
  if (score >= 60) return { level: 3, emoji: '💛', label: '略有保留', sublabel: '个别问题需关注', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', color: '#F59E0B' }
  if (score >= 40) return { level: 2, emoji: '🟠', label: '存在隐患', sublabel: '建议进一步沟通', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', color: '#F97316' }
  return { level: 1, emoji: '🔴', label: '危险信号', sublabel: '多个问题值得担忧', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', color: '#EF4444' }
}

function getOptionColor(score: number): string {
  if (score >= 80) return '#22C55E'
  if (score >= 60) return '#F59E0B'
  if (score >= 40) return '#F97316'
  return '#EF4444'
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
    if (!raw) { router.push('/love-detector/setup'); return }

    const data: Answer[] = JSON.parse(raw)
    setAnswers(data)

    const finalScore = calcWeightedScore(data)
    setScore(finalScore)

    // Animate score counter
    let current = 0
    const step = () => {
      current += Math.ceil((finalScore - current) / 8) || 1
      if (current >= finalScore) { setDisplayScore(finalScore); return }
      setDisplayScore(current)
      animationRef.current = setTimeout(step, 30)
    }
    animationRef.current = setTimeout(step, 400)

    // AI Analysis
    setAiLoading(true)
    const setupRaw = localStorage.getItem('ld_setup')
    const setup = setupRaw ? JSON.parse(setupRaw) : { mode: 'ta', nickname: 'TA' }
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: data, score: finalScore, nickname: setup.nickname || 'TA', mode: setup.mode || 'ta' }),
    })
      .then(r => r.json())
      .then(d => { setAiAnalysis(d); setAiLoading(false) })
      .catch(() => setAiLoading(false))

    return () => { if (animationRef.current) clearTimeout(animationRef.current) }
  }, [router])

  const levelCfg = getLevelConfig(score)
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDash = circumference - (displayScore / 100) * circumference

  function buildShareText() {
    const setup = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('ld_setup') || '{}') : {}
    const nickname = setup.nickname || 'TA'
    return [
      '【恋爱测谎仪 · 选择题检测报告】',
      `综合诚信分：${score}分`,
      `${levelCfg.emoji} ${levelCfg.label} — ${levelCfg.sublabel}`,
      '',
      aiAnalysis?.summary ?? '',
      '',
      `💡 建议：${aiAnalysis?.advice ?? ''}`,
      '',
      `⚠️ 共检测 ${answers.length} 题 · 测谎对象：${nickname} · 本报告仅供参考`,
    ].filter(Boolean).join('\n')
  }

  async function handleShare() {
    const text = buildShareText()
    if (navigator.share) {
      try { await navigator.share({ title: '恋爱测谎仪检测报告', text }) } catch { /* cancelled */ }
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
            <Link href="/love-detector" className="text-white/80 text-2xl leading-none">‹</Link>
            <h1 className="text-white font-bold text-lg flex-1 text-center">测谎结果</h1>
            <button onClick={handleShare} className="text-white/80 text-sm font-medium">分享</button>
          </div>
        </div>

        <div className="flex-1 px-5 py-5 space-y-4 overflow-y-auto">
          {/* Score card */}
          <div className="bg-white rounded-3xl p-6 flex flex-col items-center shadow-sm">
            {/* Circle */}
            <div className="relative w-[150px] h-[150px]">
              <svg width="150" height="150" className="-rotate-90">
                <circle cx="75" cy="75" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="10" />
                <circle
                  cx="75" cy="75" r={radius} fill="none"
                  stroke={levelCfg.color}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDash}
                  style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-gray-900">{displayScore}</span>
                <span className="text-gray-400 text-xs mt-0.5">综合分</span>
              </div>
            </div>

            {/* Level badge */}
            <div className={`mt-4 px-4 py-2.5 rounded-2xl border w-full text-center ${levelCfg.bg} ${levelCfg.border}`}>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">{levelCfg.emoji}</span>
                <div>
                  <p className={`font-bold text-sm ${levelCfg.text}`}>{levelCfg.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{levelCfg.sublabel}</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-[#1E1035] px-4 py-3 flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <h3 className="text-white font-bold text-sm flex-1">AI 综合分析</h3>
              {aiLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            </div>
            {aiLoading ? (
              <div className="bg-[#2A1A50] px-4 py-6 flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-purple-300 text-xs">AI 正在分析中，请稍候...</p>
              </div>
            ) : aiAnalysis ? (
              <div className="bg-[#2A1A50] px-4 py-4 space-y-4">
                <p className="text-white/90 text-xs leading-relaxed">{aiAnalysis.summary}</p>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-purple-300 text-[10px] font-semibold mb-1.5">📚 理论依据</p>
                  <p className="text-white/80 text-xs leading-relaxed">{aiAnalysis.theoreticalBasis}</p>
                </div>
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
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-purple-300 text-[10px] font-semibold mb-1.5">💡 专业建议</p>
                  <p className="text-white/80 text-xs leading-relaxed">{aiAnalysis.advice}</p>
                </div>
                <p className="text-white/40 text-[10px]">{aiAnalysis.disclaimer}</p>
              </div>
            ) : (
              <div className="bg-[#2A1A50] px-4 py-4">
                <p className="text-white/60 text-xs text-center">分析加载失败，请检查网络连接</p>
              </div>
            )}
          </div>

          {/* Question review */}
          {answers.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-gray-800 font-bold text-sm mb-3">题目回顾</h3>
              <div className="space-y-3">
                {answers.map((ans, i) => {
                  const color = getOptionColor(ans.score)
                  return (
                    <div key={ans.questionId} className="flex items-start gap-3">
                      <div className="w-1.5 shrink-0 mt-1 self-stretch rounded-full" style={{ backgroundColor: color, minHeight: '32px' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-500 text-xs leading-relaxed">{ans.questionText}</p>
                        <p className="text-xs font-semibold mt-1" style={{ color }}>
                          {String.fromCharCode(65 + ans.selectedOptionIndex)}. {ans.selectedOptionText}
                        </p>
                        <p className="text-gray-300 text-[10px] mt-0.5">{ans.category} · {ans.difficulty}</p>
                      </div>
                      <div className="text-[11px] font-bold shrink-0 mt-0.5" style={{ color }}>
                        {ans.score}分
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-2 bg-gray-50 space-y-2">
          <button
            onClick={handleShare}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm gradient-primary shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
          >
            <span>💬</span><span>分享到微信 / 朋友圈</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/love-detector/setup" className="block">
              <button className="w-full py-3 rounded-xl bg-purple-100 text-purple-700 font-semibold text-xs flex items-center justify-center gap-1">
                <span>🔄</span><span>再来一次</span>
              </button>
            </Link>
            <Link href="/love-detector/history" className="block">
              <button className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-xs flex items-center justify-center gap-1">
                <span>📋</span><span>查看历史</span>
              </button>
            </Link>
          </div>
        </div>

        <TabBar activeTab="history" />
      </div>

      {shareMode && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={() => setShareMode(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-gray-900 font-bold text-base text-center">分享到微信</h3>
            <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-600 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
              {buildShareText()}
            </div>
            <p className="text-gray-400 text-xs text-center">复制文字后，打开微信发送给好友或发朋友圈</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShareMode(false)} className="py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm">取消</button>
              <button onClick={handleCopy} className="py-3 rounded-xl text-white font-semibold text-sm gradient-primary">📋 复制内容</button>
            </div>
          </div>
        </div>
      )}
    </MobileWrapper>
  )
}
