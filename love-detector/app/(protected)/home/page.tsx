import Link from 'next/link'
import MobileWrapper from '@/components/MobileWrapper'
import StatusBar from '@/components/StatusBar'
import TabBar from '@/components/TabBar'

export default function HomePage() {
  return (
    <MobileWrapper>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Hero section */}
        <div className="gradient-hero pb-8">
          <StatusBar dark />
          <div className="px-5 pt-2">
            <h1 className="text-white text-2xl font-bold">恋爱测谎仪</h1>
            <p className="text-white/80 text-sm mt-1">发现 TA 说的是否是真话 🔍</p>

            {/* Pulse card */}
            <div className="mt-4 bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-3">
              <span className="pulse-heart text-2xl">💓</span>
              <div>
                <p className="text-white font-semibold text-sm">TA 的心跳正在被监测中...</p>
                <p className="text-white/60 text-xs mt-0.5">准备好开始测谎了吗？</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-3 mt-4">
              {[
                { value: '98%', label: '准确率' },
                { value: '12万+', label: '题库量' },
                { value: '3秒', label: '出结果' },
              ].map(stat => (
                <div key={stat.label} className="flex-1 bg-white/15 rounded-xl py-2 flex flex-col items-center">
                  <span className="text-white font-bold text-base">{stat.value}</span>
                  <span className="text-white/70 text-[10px]">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mode selection */}
        <div className="flex-1 px-5 pt-5 pb-2">
          <h2 className="text-gray-800 font-bold text-base mb-3">选择测谎模式</h2>

          <div className="space-y-3">
            {/* 测TA */}
            <Link href="/setup?mode=ta">
              <div className="bg-[#F5F3FF] rounded-2xl p-4 flex items-center gap-4 active:opacity-80 transition-opacity border border-purple-100">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-2xl shrink-0">
                  🔍
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 font-bold text-sm">测 TA</h3>
                  <p className="text-gray-500 text-xs mt-0.5">当面测谎，实时录音分析</p>
                </div>
                <span className="text-purple-400 text-lg">›</span>
              </div>
            </Link>

            {/* 测自己 */}
            <Link href="/setup?mode=self">
              <div className="bg-[#FFF0F6] rounded-2xl p-4 flex items-center gap-4 active:opacity-80 transition-opacity border border-pink-100">
                <div className="w-12 h-12 rounded-2xl bg-pink-600 flex items-center justify-center text-2xl shrink-0">
                  🪞
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 font-bold text-sm">测自己</h3>
                  <p className="text-gray-500 text-xs mt-0.5">自我诚实度检测</p>
                </div>
                <span className="text-pink-400 text-lg">›</span>
              </div>
            </Link>

            {/* 微信测谎 */}
            <Link href="/wechat">
              <div className="bg-[#ECFDF5] rounded-2xl p-4 flex items-center gap-4 active:opacity-80 transition-opacity border border-green-100">
                <div className="w-12 h-12 rounded-2xl bg-green-600 flex items-center justify-center text-2xl shrink-0">
                  💬
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 font-bold text-sm">微信测谎</h3>
                  <p className="text-gray-500 text-xs mt-0.5">粘贴记录/上传语音</p>
                </div>
                <span className="text-green-400 text-lg">›</span>
              </div>
            </Link>
          </div>

          {/* CTA button */}
          <Link href="/setup">
            <button className="w-full mt-5 py-4 rounded-2xl text-white font-bold text-base gradient-primary shadow-lg shadow-purple-500/30 active:opacity-90 transition-opacity">
              ✨ 开始测谎
            </button>
          </Link>

          {/* Tips */}
          <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-amber-700 text-xs font-medium mb-1">💡 使用提示</p>
            <p className="text-amber-600 text-xs leading-relaxed">
              测谎过程中请保持环境安静，让对方正常回答问题，系统将自动分析可信度。
            </p>
          </div>
        </div>

        <TabBar activeTab="home" />
      </div>
    </MobileWrapper>
  )
}
