'use client'
import Link from 'next/link'

const tabs = [
  { id: 'home', label: '首页', emoji: '⌂', href: '/home' },
  { id: 'test', label: '测谎', emoji: '⚡', href: '/setup' },
  { id: 'history', label: '历史', emoji: '🕐', href: '/result' },
  { id: 'profile', label: '我的', href: '/home', emoji: '👤' },
]

export default function TabBar({ activeTab }: { activeTab: string }) {
  return (
    <div className="w-full h-[84px] bg-white flex items-center px-4 pb-5 pt-3">
      <div className="w-full h-[62px] rounded-[36px] bg-gray-50 border border-gray-200 flex p-1">
        {tabs.map(tab => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`flex-1 h-full rounded-[26px] flex flex-col items-center justify-center gap-0.5 transition-all ${
              activeTab === tab.id
                ? 'bg-purple-700 text-white'
                : 'text-gray-400'
            }`}
          >
            <span className="text-[18px] leading-none">{tab.emoji}</span>
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
