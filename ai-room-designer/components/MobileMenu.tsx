'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Props {
  isLoggedIn: boolean
  userName?: string
  isOverseas: boolean
}

export default function MobileMenu({ isLoggedIn, userName, isOverseas }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5"
        aria-label={isOverseas ? 'Open menu' : '打开菜单'}
      >
        <span className="w-5 h-0.5 bg-gray-400 rounded" />
        <span className="w-5 h-0.5 bg-gray-400 rounded" />
        <span className="w-5 h-0.5 bg-gray-400 rounded" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-64 bg-[#0D0D0D] border-l border-gray-800 z-50 flex flex-col transform transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-800">
          <span className="text-white font-bold">{isOverseas ? 'Menu' : '菜单'}</span>
          <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col px-5 py-6 gap-1">
          <a href="/#examples" onClick={() => setOpen(false)} className="py-3 text-gray-400 hover:text-white transition-colors border-b border-gray-800/50">
            {isOverseas ? 'Styles' : '风格展示'}
          </a>
          <a
            href={isOverseas ? '/pricing' : '/#pricing'}
            onClick={() => setOpen(false)}
            className="py-3 text-gray-400 hover:text-white transition-colors border-b border-gray-800/50"
          >
            {isOverseas ? 'Pricing' : '价格'}
          </a>
          <a href="/#faq" onClick={() => setOpen(false)} className="py-3 text-gray-400 hover:text-white transition-colors border-b border-gray-800/50">
            {isOverseas ? 'FAQ' : '常见问题'}
          </a>
          <Link href="/history" onClick={() => setOpen(false)} className="py-3 text-gray-400 hover:text-white transition-colors border-b border-gray-800/50">
            {isOverseas ? 'History' : '历史记录'}
          </Link>
          {isLoggedIn ? (
            <div className="py-3 flex items-center justify-between border-b border-gray-800/50">
              <span className="text-gray-400 text-sm">{userName}</span>
              <form action={isOverseas ? '/api/auth/signout' : '/api/auth/logout'} method="POST">
                <button type="submit" className="text-gray-500 text-sm hover:text-gray-300">
                  {isOverseas ? 'Sign out' : '退出'}
                </button>
              </form>
            </div>
          ) : (
            <Link
              href={isOverseas ? '/api/auth/signin' : '/login'}
              onClick={() => setOpen(false)}
              className="py-3 text-gray-400 hover:text-white transition-colors border-b border-gray-800/50"
            >
              {isOverseas ? 'Sign in' : '登录/注册'}
            </Link>
          )}
        </nav>

        <div className="px-5 mt-auto pb-8">
          <Link
            href="/generate"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-full h-12 bg-amber-500 text-black font-bold rounded hover:bg-amber-400 transition-colors"
          >
            {isOverseas ? 'Get Started' : '开始体验'}
          </Link>
        </div>
      </div>
    </>
  )
}
