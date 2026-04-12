'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_SKIP_PAYMENT === 'true'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  const sendCode = async () => {
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '发送验证码失败')
      setCodeSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '发送验证码失败')
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async () => {
    if (!code || code.length !== 6) {
      setError('请输入6位验证码')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '验证失败')
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '验证失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <nav className="flex items-center px-6 md:px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">装</div>
          <span className="font-bold text-xl">装AI</span>
        </Link>
        <div className="flex-1" />
        <Link href="/" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
          返回首页
        </Link>
      </nav>

      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="w-full max-w-sm px-6">
          <div className="flex flex-col items-center gap-3 mb-8">
            <h1 className="text-2xl font-bold text-white">手机号登录/注册</h1>
            <p className="text-gray-500 text-sm">未注册手机号将自动创建账号</p>
          </div>

          {DEV_MODE && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-amber-950 border border-amber-800 text-amber-400 text-sm">
              开发模式：任意6位数字即可登录
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* Phone input */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">手机号</label>
              <input
                type="tel"
                maxLength={11}
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full h-12 px-4 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Code input */}
            {codeSent && (
              <div>
                <label className="block text-gray-400 text-sm mb-2">验证码</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="请输入6位验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-12 px-4 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {!codeSent ? (
              <button
                onClick={sendCode}
                disabled={loading}
                className="w-full h-12 bg-amber-500 text-black font-bold text-base rounded disabled:opacity-50 hover:bg-amber-400 transition-colors"
              >
                {loading ? '发送中...' : '获取验证码'}
              </button>
            ) : (
              <button
                onClick={verifyCode}
                disabled={loading}
                className="w-full h-12 bg-amber-500 text-black font-bold text-base rounded disabled:opacity-50 hover:bg-amber-400 transition-colors"
              >
                {loading ? '验证中...' : '登录/注册'}
              </button>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-gray-500 text-xs">或</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Skip login */}
            <Link
              href="/generate"
              className="w-full h-12 bg-white/10 text-white font-semibold text-base rounded hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              跳过登录，直接体验
            </Link>

            {/* WeChat -- coming soon */}
            <button
              disabled
              className="w-full h-12 bg-[#07c160]/40 text-white/50 font-bold text-base rounded flex items-center justify-center gap-2 cursor-not-allowed"
              title="微信登录即将上线"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.5 3C4.91 3 2 5.69 2 9c0 2.1 1.47 3.93 3.5 4.78.25.1.42.34.42.62 0 .13-.02.26-.08.38l-.4 1.45c-.13.47.32.85.74.61l1.64-.88c.2-.11.42-.16.64-.16.17 0 .34.03.5.08.57.2 1.2.31 1.84.31 3.59 0 6.5-2.69 6.5-6C18 5.69 15.09 3 8.5 3zM5.5 7.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z" />
              </svg>
              微信一键登录（即将上线）
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
