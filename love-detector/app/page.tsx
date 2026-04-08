'use client'

import { useState } from 'react'
import Link from 'next/link'
import MobileWrapper from '@/components/MobileWrapper'
import StatusBar from '@/components/StatusBar'

const APPS = [
  {
    id: 'love-detector',
    name: '恋爱测谎仪',
    description: '通过选择题综合判断 TA 的真实心理',
    icon: '🔍',
    tag: 'AI 测谎',
    meta: '50题 · 3分钟',
    gradient: 'from-purple-600 to-pink-600',
    shadow: 'shadow-purple-500/30',
    href: '/love-detector',
    external: false,
  },
  {
    id: 'getreelestate',
    name: 'GetReelEstate',
    description: '一键把房产照片变成病毒式传播的短视频 Reel',
    icon: '🎬',
    tag: 'AI 视频',
    meta: '60秒出片 · 免费',
    gradient: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/30',
    href: process.env.NEXT_PUBLIC_GETREELESTATE_URL || 'https://app.handyai.cc',
    external: true,
  },
  {
    id: 'hourse-designer',
    name: '自建房设计大师',
    description: 'AI 自动生成专业 CAD 户型图，支持快捷设计、草图识别、AI 评分优化',
    icon: '🏠',
    tag: 'AI 建房',
    meta: '专业CAD · 免费',
    gradient: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/30',
    href: process.env.NEXT_PUBLIC_HOURSE_DESIGNER_URL || 'https://hourse-designer.vercel.app',
    external: true,
  },
]

export default function AppStorePage() {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? APPS.filter(app =>
        app.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        app.tag.toLowerCase().includes(search.trim().toLowerCase()) ||
        app.description.toLowerCase().includes(search.trim().toLowerCase())
      )
    : APPS

  return (
    <MobileWrapper>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-purple-700 to-pink-600 pb-6">
          <StatusBar dark />
          <div className="px-5 pt-2">
            <h1 className="text-white text-2xl font-bold">AI 应用广场</h1>
            <p className="text-white/80 text-sm mt-1">发现有趣的 AI 小工具</p>
            {/* Search bar */}
            <div className="mt-4 flex items-center gap-3 bg-white/20 rounded-full px-4 py-2.5">
              <span className="text-white/70 text-base">🔎</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索应用..."
                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/50 outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-white/60 text-sm">
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-5 pt-5 pb-6 space-y-5">
          {/* Apps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-800 font-bold text-base">
                {search.trim() ? `搜索结果 (${filtered.length})` : '热门应用'}
              </h2>
              {!search.trim() && <span className="text-purple-600 text-sm">查看全部 →</span>}
            </div>

            <div className="space-y-3">
              {filtered.map(app => (
                <a
                  key={app.id}
                  href={app.href}
                  target={app.external ? '_blank' : undefined}
                  rel={app.external ? 'noopener noreferrer' : undefined}
                >
                  <div className={`bg-gradient-to-br ${app.gradient} rounded-2xl p-5 shadow-lg ${app.shadow} active:opacity-90 transition-opacity`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
                        {app.icon}
                      </div>
                      <div className="flex items-center gap-2">
                        {app.external && (
                          <span className="text-white/60 text-xs">↗</span>
                        )}
                        <div className="bg-white/20 rounded-full px-3 py-1">
                          <span className="text-white text-xs font-semibold">{app.tag}</span>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-white font-bold text-xl">{app.name}</h3>
                    <p className="text-white/80 text-sm mt-1">{app.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-white font-semibold text-sm">立即体验 →</span>
                      <span className="text-white/70 text-xs">{app.meta}</span>
                    </div>
                  </div>
                </a>
              ))}

              {search.trim() && filtered.length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                  <span className="text-3xl">🔍</span>
                  <p className="text-gray-500 text-sm mt-3">没有找到「{search}」相关的应用</p>
                  <p className="text-gray-400 text-xs mt-1">试试其他关键词？</p>
                </div>
              )}

              {/* Coming soon placeholder */}
              {!search.trim() && (
                <div className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-gray-100">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">
                    🌟
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-500 font-semibold text-sm">更多应用</p>
                    <p className="text-gray-400 text-xs mt-0.5">即将上线...</p>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    ›
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent usage */}
          {!search.trim() && (
            <div>
              <h2 className="text-gray-800 font-bold text-base mb-3">最近使用</h2>
              <Link href="/love-detector">
                <div className="bg-white rounded-2xl p-4 flex items-center gap-4 active:opacity-80 transition-opacity">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xl">
                    🔍
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 font-semibold text-sm">恋爱测谎仪</p>
                    <p className="text-gray-400 text-xs mt-0.5">上次使用：今天</p>
                  </div>
                  <span className="text-gray-300 text-lg">›</span>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Bottom Tab Bar */}
        <div className="w-full h-[84px] bg-white flex items-center px-5 pb-5 pt-3">
          <div className="w-full h-[62px] rounded-[36px] bg-gray-50 border border-gray-200 flex p-1">
            {[
              { id: 'home', label: '广场', emoji: '⊞', active: true },
              { id: 'history', label: '历史', emoji: '🕐', active: false },
              { id: 'profile', label: '我的', emoji: '👤', active: false },
            ].map(tab => (
              <div
                key={tab.id}
                className={`flex-1 h-full rounded-[26px] flex flex-col items-center justify-center gap-0.5 ${
                  tab.active ? 'bg-purple-700 text-white' : 'text-gray-400'
                }`}
              >
                <span className="text-[18px] leading-none">{tab.emoji}</span>
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MobileWrapper>
  )
}
