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
  judgment: 'true' | 'lie'
  credibility: number
}

interface HistoryItem {
  date: string
  answers: Answer[]
  nickname: string
  config?: string
}

function calcScore(answers: Answer[]): number {
  if (!answers?.length) return 0
  const trueCount = answers.filter(a => a.judgment === 'true').length
  const avgCredibility = answers.reduce((sum, a) => sum + (a.credibility ?? 50), 0) / answers.length
  const base = Math.round((trueCount / answers.length) * 60 + avgCredibility * 0.4)
  return Math.min(99, Math.max(10, base))
}

function getLevelInfo(score: number) {
  if (score >= 85) return { emoji: '💚', label: '绿色安全区', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' }
  if (score >= 70) return { emoji: '💙', label: '蓝色放心区', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' }
  if (score >= 50) return { emoji: '💛', label: '黄色注意区', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' }
  if (score >= 30) return { emoji: '🧡', label: '橙色警戒区', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' }
  return { emoji: '❤️', label: '红色危机区', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return '今天 ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return '昨天 ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('ld_history')
    if (raw) {
      try {
        setHistory(JSON.parse(raw))
      } catch {
        setHistory([])
      }
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
            <Link href="/home" className="text-white/80 text-2xl leading-none">‹</Link>
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
              <Link href="/setup">
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
                const lieCount = item.answers?.filter(a => a.judgment === 'lie').length ?? 0
                const isOpen = expanded === i

                return (
                  <div key={i} className={`bg-white rounded-2xl overflow-hidden shadow-sm border ${level.border}`}>
                    {/* Card header */}
                    <button
                      className="w-full p-4 flex items-center gap-3 text-left"
                      onClick={() => setExpanded(isOpen ? null : i)}
                    >
                      {/* Score circle */}
                      <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0 ${level.bg} border-2 ${level.border}`}>
                        <span className="text-sm font-bold text-gray-800">{score}%</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-base">{level.emoji}</span>
                          <span className={`text-xs font-bold ${level.color}`}>{level.label}</span>
                        </div>
                        <p className="text-gray-500 text-[11px]">
                          {item.nickname !== 'TA' ? `测谎「${item.nickname}」` : '测谎记录'} ·{' '}
                          {item.answers?.length ?? 0} 题 · {lieCount} 题可疑
                        </p>
                        <p className="text-gray-400 text-[10px] mt-0.5">{formatDate(item.date)}</p>
                      </div>

                      <span className={`text-gray-400 text-lg transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>›</span>
                    </button>

                    {/* Expanded detail */}
                    {isOpen && item.answers?.length > 0 && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <div className="space-y-2 mt-3">
                          {item.answers.map((ans, j) => (
                            <div key={j} className="flex items-start gap-2">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${
                                ans.judgment === 'true' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {ans.judgment === 'true' ? '✅' : '❌'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-700 text-xs leading-relaxed">{ans.questionText}</p>
                                <p className="text-gray-400 text-[10px] mt-0.5">
                                  {ans.category} · 可信度 {ans.credibility}%
                                </p>
                              </div>
                            </div>
                          ))}
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
