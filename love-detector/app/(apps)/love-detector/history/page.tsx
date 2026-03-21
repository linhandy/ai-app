'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import MobileWrapper from '@/components/MobileWrapper'
import StatusBar from '@/components/StatusBar'
import TabBar from '@/components/TabBar'

interface Answer {
  questionId: number
  questionText: string
  category: string
  selectedOptionText?: string
  score?: number
  // legacy fields
  judgment?: 'true' | 'lie'
  credibility?: number
}

interface HistoryItem {
  date: string
  answers: Answer[]
  nickname: string
  config?: string
}

function calcScore(answers: Answer[]): number {
  if (!answers?.length) return 0
  // MCQ score
  const hasScores = answers.some(a => a.score !== undefined)
  if (hasScores) {
    const avg = answers.reduce((sum, a) => sum + (a.score ?? 50), 0) / answers.length
    return Math.min(99, Math.max(10, Math.round(avg)))
  }
  // Legacy credibility score
  const trueCount = answers.filter(a => a.judgment === 'true').length
  const avgCredibility = answers.reduce((sum, a) => sum + (a.credibility ?? 50), 0) / answers.length
  const base = Math.round((trueCount / answers.length) * 60 + avgCredibility * 0.4)
  return Math.min(99, Math.max(10, base))
}

function getLevelInfo(score: number) {
  if (score >= 80) return { emoji: '💚', label: '基本可信', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' }
  if (score >= 60) return { emoji: '💛', label: '略有保留', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' }
  if (score >= 40) return { emoji: '🧡', label: '存在隐患', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' }
  return { emoji: '❤️', label: '危险信号', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return '今天 ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return '昨天 ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22C55E'
  if (score >= 60) return '#F59E0B'
  if (score >= 40) return '#F97316'
  return '#EF4444'
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('ld_history')
    if (raw) {
      try { setHistory(JSON.parse(raw)) } catch { setHistory([]) }
    }
  }, [])

  function handleClear() {
    if (confirm('确定要清除所有历史记录吗？')) {
      localStorage.removeItem('ld_history')
      setHistory([])
    }
  }

  return (
    <MobileWrapper>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-[#2D0A6E]">
          <StatusBar dark />
          <div className="flex items-center px-5 pb-4 gap-3">
            <Link href="/love-detector" className="text-white/80 text-2xl leading-none">‹</Link>
            <h1 className="text-white font-bold text-lg flex-1 text-center">历史记录</h1>
            {history.length > 0 && (
              <button onClick={handleClear} className="text-white/60 text-xs">清除</button>
            )}
          </div>
        </div>

        <div className="flex-1 px-5 py-5 space-y-3 overflow-y-auto">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <span className="text-5xl">📋</span>
              <p className="text-gray-400 text-sm text-center">还没有测试记录<br />完成一次测谎后会显示在这里</p>
              <Link href="/love-detector/setup">
                <button className="mt-2 px-6 py-3 rounded-2xl text-white font-semibold text-sm gradient-primary shadow-lg shadow-purple-500/30">
                  开始第一次测谎
                </button>
              </Link>
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-xs text-center">最近 {history.length} 次记录（最多保留 5 次）</p>
              {history.map((item, i) => {
                const score = calcScore(item.answers)
                const level = getLevelInfo(score)
                const isOpen = expanded === i

                return (
                  <div key={i} className={`bg-white rounded-2xl overflow-hidden shadow-sm border ${level.border}`}>
                    <button
                      className="w-full p-4 flex items-center gap-3 text-left"
                      onClick={() => setExpanded(isOpen ? null : i)}
                    >
                      <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0 ${level.bg} border-2 ${level.border}`}>
                        <span className="text-sm font-bold" style={{ color: getScoreColor(score) }}>{score}</span>
                        <span className="text-[9px] text-gray-400">分</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-base">{level.emoji}</span>
                          <span className={`text-xs font-bold ${level.color}`}>{level.label}</span>
                        </div>
                        <p className="text-gray-500 text-[11px]">
                          {item.nickname && item.nickname !== 'TA' ? `测谎「${item.nickname}」` : '测谎记录'} · {item.answers?.length ?? 0} 题
                        </p>
                        <p className="text-gray-400 text-[10px] mt-0.5">{formatDate(item.date)}</p>
                      </div>
                      <span className={`text-gray-400 text-lg transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>›</span>
                    </button>

                    {isOpen && item.answers?.length > 0 && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <div className="space-y-2 mt-3">
                          {item.answers.map((ans, j) => {
                            const ansScore = ans.score ?? (ans.judgment === 'true' ? 80 : 20)
                            const color = ansScore >= 80 ? '#22C55E' : ansScore >= 60 ? '#F59E0B' : ansScore >= 40 ? '#F97316' : '#EF4444'
                            return (
                              <div key={j} className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: color }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-700 text-xs leading-relaxed">{ans.questionText}</p>
                                  {ans.selectedOptionText && (
                                    <p className="text-xs mt-0.5 font-medium" style={{ color }}>→ {ans.selectedOptionText}</p>
                                  )}
                                  <p className="text-gray-400 text-[10px] mt-0.5">{ans.category}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>

        <TabBar activeTab="history" />
      </div>
    </MobileWrapper>
  )
}
