'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import MobileWrapper from '@/components/MobileWrapper'
import { ACCESS_KEY, isAuthenticated } from '@/lib/auth'

export default function VerifyPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/home')
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) {
      setError('请输入验证码')
      triggerShake()
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()

      if (data.success && data.token) {
        localStorage.setItem(ACCESS_KEY, data.token)
        router.push('/home')
      } else {
        setError(data.message || '验证码无效，请检查后重试')
        triggerShake()
      }
    } catch {
      setError('网络错误，请稍后重试')
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  return (
    <MobileWrapper>
      <div className="min-h-screen gradient-hero flex flex-col">
        {/* Top decorative circles */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/4 translate-x-1/4" />
        <div className="absolute top-20 left-0 w-32 h-32 rounded-full bg-white/5 -translate-x-1/2" />

        {/* Hero section */}
        <div className="flex flex-col items-center pt-16 pb-8 px-6 relative z-10">
          <div className="pulse-heart text-6xl mb-4">💕</div>
          <h1 className="text-white text-3xl font-bold tracking-wide mb-2">恋爱测谎仪</h1>
          <p className="text-white/80 text-sm text-center">爱需要诚实，谎言无处遁形</p>

          {/* Stats row */}
          <div className="flex gap-4 mt-6">
            {[
              { value: '98%', label: '准确率' },
              { value: '12万+', label: '题库' },
              { value: '3秒', label: '出结果' },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col items-center bg-white/15 rounded-2xl px-4 py-2">
                <span className="text-white font-bold text-lg">{stat.value}</span>
                <span className="text-white/70 text-xs">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 bg-white rounded-t-[32px] px-6 pt-8 pb-6 relative z-10">
          <h2 className="text-gray-900 text-xl font-bold mb-1">输入验证码解锁</h2>
          <p className="text-gray-500 text-sm mb-6">购买后获得专属验证码，一次购买永久使用</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={shake ? 'shake' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-2">验证码</label>
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="请输入验证码，如 LLD-XXXX-XXXX"
                className={`w-full px-4 py-3.5 rounded-2xl border-2 text-sm font-mono tracking-widest outline-none transition-colors ${
                  error
                    ? 'border-red-400 bg-red-50 text-red-700 placeholder-red-300'
                    : 'border-purple-200 bg-purple-50/50 text-gray-800 placeholder-gray-400 focus:border-purple-500'
                }`}
                autoComplete="off"
                spellCheck={false}
              />
              {error && (
                <p className="mt-2 text-red-500 text-xs flex items-center gap-1">
                  <span>⚠</span> {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-white font-bold text-base gradient-primary shadow-lg shadow-purple-500/30 active:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  验证中...
                </>
              ) : (
                '🔓 解锁测谎仪'
              )}
            </button>
          </form>

          {/* Purchase hint */}
          <div className="mt-6 p-4 bg-[#FFF0F6] rounded-2xl border border-pink-100">
            <p className="text-sm text-pink-700 font-medium mb-1">💡 没有验证码？</p>
            <p className="text-xs text-pink-600 leading-relaxed">
              去小红书 / 闲鱼搜索「恋爱测谎仪」购买，购买后立即获得验证码，一次购买永久使用。
            </p>
          </div>

          {/* Features */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: '🔒', title: '隐私安全', desc: '数据本地处理' },
              { icon: '🤖', title: 'AI驱动', desc: '智能分析结果' },
              { icon: '💯', title: '专业题库', desc: '20+专业问题' },
            ].map(f => (
              <div key={f.title} className="flex flex-col items-center bg-[#F5F3FF] rounded-2xl p-3 gap-1">
                <span className="text-xl">{f.icon}</span>
                <span className="text-xs font-semibold text-purple-800">{f.title}</span>
                <span className="text-[10px] text-purple-600 text-center">{f.desc}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">已有账号？输入验证码即可直接登录</p>
        </div>
      </div>
    </MobileWrapper>
  )
}
