'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { isOverseas } from '@/lib/region'

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_SKIP_PAYMENT === 'true'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [isWechat, setIsWechat] = useState<boolean | undefined>(undefined)
  const [authError, setAuthError] = useState<string | null>(null)
  const overseas = isOverseas

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

  useEffect(() => {
    setIsWechat(/MicroMessenger/i.test(navigator.userAgent))
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err) setAuthError(err)
  }, [])

  if (overseas) {
    return (
      <main className="min-h-screen bg-black">
        <nav className="flex items-center px-6 md:px-[120px] h-16 border-b border-gray-900">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">R</div>
            <span className="font-bold text-xl">RoomAI</span>
          </Link>
          <div className="flex-1" />
          <Link href="/" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
            Back to home
          </Link>
        </nav>

        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="w-full max-w-sm px-6">
            <div className="flex flex-col items-center gap-3 mb-8">
              <h1 className="text-2xl font-bold text-white">Sign in to RoomAI</h1>
              <p className="text-gray-500 text-sm">Sign in with your Google account to get started</p>
            </div>

            {authError && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm">
                {authError === 'wechat_failed' ? 'Sign in failed. Please try again.' : 'Sign in is not configured. Please try again later.'}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => signIn('google', { callbackUrl: '/' })}
                className="w-full h-12 bg-white text-black font-bold text-base rounded flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </button>

              {/* Skip login */}
              <Link
                href="/generate"
                className="w-full h-12 bg-white/10 text-white font-semibold text-base rounded hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Continue without signing in
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
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

          {authError === 'wechat_failed' && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm">
              微信登录失败，请重试
            </div>
          )}
          {authError === 'wechat_not_configured' && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm">
              微信登录暂未开通
            </div>
          )}
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

            {isWechat ? (
              <a
                href="/api/auth/wechat"
                className="w-full h-12 bg-[#07c160] text-white font-bold text-base rounded flex items-center justify-center gap-2 hover:bg-[#06ad56] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.5 3C4.91 3 2 5.69 2 9c0 2.1 1.47 3.93 3.5 4.78.25.1.42.34.42.62 0 .13-.02.26-.08.38l-.4 1.45c-.13.47.32.85.74.61l1.64-.88c.2-.11.42-.16.64-.16.17 0 .34.03.5.08.57.2 1.2.31 1.84.31 3.59 0 6.5-2.69 6.5-6C18 5.69 15.09 3 8.5 3zM5.5 7.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z" />
                </svg>
                微信一键登录
              </a>
            ) : (
              <div
                className="w-full h-12 bg-[#07c160]/30 text-white/40 font-bold text-base rounded flex items-center justify-center gap-2 cursor-not-allowed select-none"
                title="请在微信中打开使用"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.5 3C4.91 3 2 5.69 2 9c0 2.1 1.47 3.93 3.5 4.78.25.1.42.34.42.62 0 .13-.02.26-.08.38l-.4 1.45c-.13.47.32.85.74.61l1.64-.88c.2-.11.42-.16.64-.16.17 0 .34.03.5.08.57.2 1.2.31 1.84.31 3.59 0 6.5-2.69 6.5-6C18 5.69 15.09 3 8.5 3zM5.5 7.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z" />
                </svg>
                微信登录（请在微信中打开）
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
