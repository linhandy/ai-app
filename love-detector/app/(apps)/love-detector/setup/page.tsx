'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import MobileWrapper from '@/components/MobileWrapper'
import StatusBar from '@/components/StatusBar'
import TabBar from '@/components/TabBar'
import { CATEGORIES, type Category, type Difficulty } from '@/lib/questions'

interface SetupConfig {
  mode: 'ta' | 'self'
  nickname: string
  count: number
  categories: Category[]
  difficulty: Difficulty | 'all'
}

const DIFFICULTY_OPTIONS: { value: Difficulty | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: '全部', icon: '🌶' },
  { value: '温和', label: '温和', icon: '🌶' },
  { value: '犀利', label: '犀利', icon: '🌶🌶' },
  { value: '灵魂拷问', label: '灵魂拷问', icon: '🌶🌶🌶' },
]

const CATEGORY_COLORS: Record<Category, string> = {
  '忠诚度': 'bg-white text-gray-400 border-gray-200',
  '手机隐私': 'bg-white text-gray-400 border-gray-200',
  '感情深度': 'bg-white text-gray-400 border-gray-200',
  '小谎言': 'bg-white text-gray-400 border-gray-200',
  '财务诚实': 'bg-white text-gray-400 border-gray-200',
  '社交边界': 'bg-white text-gray-400 border-gray-200',
  '未来规划': 'bg-white text-gray-400 border-gray-200',
}

const CATEGORY_COLORS_ACTIVE: Record<Category, string> = {
  '忠诚度': 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-300',
  '手机隐私': 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-300',
  '感情深度': 'bg-pink-600 text-white border-pink-600 shadow-sm shadow-pink-300',
  '小谎言': 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-300',
  '财务诚实': 'bg-green-600 text-white border-green-600 shadow-sm shadow-green-300',
  '社交边界': 'bg-cyan-600 text-white border-cyan-600 shadow-sm shadow-cyan-300',
  '未来规划': 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-300',
}

const CATEGORY_DOTS: Record<Category, string> = {
  '忠诚度': '🔮',
  '手机隐私': '📱',
  '感情深度': '💕',
  '小谎言': '🤥',
  '财务诚实': '💰',
  '社交边界': '🤝',
  '未来规划': '🔮',
}

function SetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const modeParam = searchParams.get('mode')

  const [config, setConfig] = useState<SetupConfig>({
    mode: modeParam === 'self' ? 'self' : 'ta',
    nickname: '',
    count: 5,
    categories: ['忠诚度', '感情深度'],
    difficulty: '温和',
  })

  useEffect(() => {
    if (modeParam === 'self' || modeParam === 'ta') {
      setConfig(prev => ({ ...prev, mode: modeParam }))
    }
  }, [modeParam])

  function toggleCategory(cat: Category) {
    setConfig(prev => {
      const has = prev.categories.includes(cat)
      if (has && prev.categories.length === 1) return prev
      return {
        ...prev,
        categories: has
          ? prev.categories.filter(c => c !== cat)
          : [...prev.categories, cat],
      }
    })
  }

  function handleStart() {
    localStorage.setItem('ld_setup', JSON.stringify(config))
    router.push('/love-detector/test')
  }

  return (
    <MobileWrapper>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-[#2D0A6E]">
          <StatusBar dark />
          <div className="flex items-center px-5 pb-4 gap-3">
            <Link href="/love-detector" className="text-white/80 text-2xl leading-none">‹</Link>
            <h1 className="text-white font-bold text-lg flex-1 text-center pr-7">测谎设置</h1>
          </div>
        </div>

        <div className="flex-1 px-5 py-5 space-y-5 overflow-y-auto">
          {/* 测谁 */}
          <div className="bg-white rounded-2xl p-4">
            <h2 className="text-gray-800 font-bold text-sm mb-3">测谁？</h2>
            <div className="flex gap-2">
              {([['ta', '测 TA', '🔍'], ['self', '测自己', '🪞']] as const).map(([val, label, icon]) => (
                <button
                  key={val}
                  onClick={() => setConfig(prev => ({ ...prev, mode: val }))}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    config.mode === val
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {config.mode === 'ta' && (
              <div className="mt-3">
                <input
                  type="text"
                  value={config.nickname}
                  onChange={e => setConfig(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="TA 的昵称（选填）"
                  className="w-full px-4 py-3 rounded-xl border-2 border-purple-100 bg-purple-50/30 text-sm outline-none focus:border-purple-400 text-gray-800 placeholder-gray-400"
                />
              </div>
            )}
          </div>

          {/* 题目数量 */}
          <div className="bg-white rounded-2xl p-4">
            <h2 className="text-gray-800 font-bold text-sm mb-3">题目数量</h2>
            <div className="flex gap-2">
              {[3, 5, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setConfig(prev => ({ ...prev, count: n }))}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                    config.count === n
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  {n} 题
                </button>
              ))}
            </div>
          </div>

          {/* 题目分类 */}
          <div className="bg-white rounded-2xl p-4">
            <h2 className="text-gray-800 font-bold text-sm mb-1">题目分类</h2>
            <p className="text-gray-400 text-xs mb-3">可多选，至少选一个</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const isActive = config.categories.includes(cat)
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all flex items-center gap-1 ${
                      isActive ? CATEGORY_COLORS_ACTIVE[cat] : CATEGORY_COLORS[cat]
                    }`}
                  >
                    <span>{CATEGORY_DOTS[cat]}</span>
                    <span>{cat}</span>
                    {isActive && <span className="text-[10px] opacity-80">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 难度 */}
          <div className="bg-white rounded-2xl p-4">
            <h2 className="text-gray-800 font-bold text-sm mb-3">题目难度</h2>
            <div className="grid grid-cols-2 gap-2">
              {DIFFICULTY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setConfig(prev => ({ ...prev, difficulty: opt.value }))}
                  className={`py-3 rounded-xl border-2 font-semibold text-xs transition-all flex flex-col items-center gap-1 ${
                    config.difficulty === opt.value
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#F5F3FF] rounded-2xl p-4 border border-purple-100">
            <p className="text-purple-700 text-xs font-medium">
              📋 将从
              {config.categories.join('、')}
              中随机抽取 {config.count} 道
              {config.difficulty === 'all' ? '全难度' : config.difficulty}
              题目
              {config.mode === 'ta' && config.nickname ? `，测谎对象：${config.nickname}` : ''}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pb-2 bg-gray-50">
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-2xl text-white font-bold text-base gradient-primary shadow-lg shadow-purple-500/30 active:opacity-90 transition-opacity"
          >
            🔍 开始测谎
          </button>
        </div>

        <TabBar activeTab="test" />
      </div>
    </MobileWrapper>
  )
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#2D0A6E] flex items-center justify-center"><div className="text-white text-lg">加载中...</div></div>}>
      <SetupContent />
    </Suspense>
  )
}
