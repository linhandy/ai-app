import Link from 'next/link'

const STYLES = [
  { key: '北欧简约', color: '#E8F0E9', desc: '原木 · 白墙 · 绿植' },
  { key: '现代轻奢', color: '#E8E4F0', desc: '大理石 · 金属 · 灰调' },
  { key: '新中式',   color: '#F0E8E0', desc: '禅意 · 木格 · 留白' },
  { key: '侘寂风',   color: '#E8E4DC', desc: '不完美 · 自然 · 素色' },
  { key: '工业风',   color: '#E0E0E0', desc: '裸砖 · 铁艺 · 水泥灰' },
  { key: '奶油风',   color: '#FFF8ED', desc: '米白 · 柔软 · 治愈系' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black">
      {/* Nav */}
      <nav className="flex items-center px-[120px] h-16 border-b border-gray-900">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">装</div>
          <span className="font-bold text-xl">装AI</span>
        </div>
        <div className="flex-1" />
        <span className="text-gray-500 text-sm mr-8">AI装修效果图</span>
        <Link href="/generate" className="bg-amber-500 text-black text-sm font-semibold px-5 h-9 rounded flex items-center hover:bg-amber-400 transition-colors">
          开始体验
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center px-[120px] pt-16 pb-12 gap-6">
        <div className="flex items-center gap-2 px-3.5 h-7 rounded-full bg-amber-950 border border-amber-500 text-amber-500 text-sm font-semibold">
          ✦ 限时体验价 ¥1/张
        </div>
        <h1 className="text-6xl font-bold text-center leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
          拍一张照片<br />AI秒变理想装修
        </h1>
        <p className="text-gray-400 text-lg text-center max-w-lg">
          上传任意角度的房间照片，30秒内看到专业室内设计师级别的装修效果图
        </p>
        <div className="flex items-center gap-4 mt-2">
          <Link href="/generate" className="bg-amber-500 text-black font-bold text-base px-8 rounded flex items-center gap-2 hover:bg-amber-400 transition-colors shadow-[0_8px_24px_rgba(255,152,0,0.3)]" style={{height:'52px'}}>
            ¥1 立即生成效果图
          </Link>
          <button className="text-gray-400 text-base px-7 rounded border border-gray-700 hover:border-gray-500 transition-colors" style={{height:'52px'}}>
            查看示例效果
          </button>
        </div>

        {/* Before/After preview placeholder */}
        <div className="relative w-full max-w-[1000px] h-[380px] rounded-xl overflow-hidden border border-gray-800 mt-4">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 bg-gray-800 flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-500 text-4xl mb-2">🏠</div>
                <div className="text-gray-500 text-sm">改造前</div>
              </div>
            </div>
            <div className="w-1/2 bg-gray-700 flex items-center justify-center">
              <div className="text-center">
                <div className="text-amber-500 text-4xl mb-2">✨</div>
                <div className="text-amber-500 text-sm font-semibold">AI效果图</div>
              </div>
            </div>
          </div>
          <div className="absolute top-3 left-3 bg-black/80 text-white text-xs font-semibold px-3 h-7 flex items-center rounded">改造前</div>
          <div className="absolute top-3 right-3 bg-amber-500 text-black text-xs font-bold px-3 h-7 flex items-center rounded">AI效果图</div>
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white" />
        </div>
      </section>

      {/* Styles section */}
      <section className="px-[120px] py-14 bg-[#050505] flex flex-col items-center gap-8">
        <h2 className="text-3xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>6种热门装修风格，一键切换</h2>
        <p className="text-gray-500 text-sm text-center">覆盖当下最流行的室内设计风格，精准还原每一种美学</p>
        <div className="grid grid-cols-6 gap-3 w-full">
          {STYLES.map(({ key, color, desc }) => (
            <div key={key} className="rounded-lg overflow-hidden border border-gray-800 cursor-pointer hover:border-amber-500 transition-colors group">
              <div className="h-[110px] flex items-center justify-center text-2xl" style={{ backgroundColor: color }}>
                🏡
              </div>
              <div className="bg-[#0A0A0A] px-3 py-2">
                <div className="text-white text-[13px] font-semibold">{key}</div>
                <div className="text-gray-500 text-[11px] mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-[120px] py-14 flex flex-col items-center gap-6">
        <h2 className="text-3xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>简单透明，按次收费</h2>
        <div className="w-[360px] p-8 rounded-lg bg-[#0D0D0D] border border-amber-500/40 flex flex-col gap-5">
          <div className="flex items-end gap-1">
            <span className="text-5xl font-bold text-amber-500">¥1</span>
            <span className="text-gray-500 text-lg mb-1">/张</span>
          </div>
          <p className="text-gray-400 text-sm">每张效果图仅需一元，生成后满意再付</p>
          <ul className="space-y-2.5">
            {['无需注册，扫码即付', '6种风格随意选择', '30秒出图，高清下载', '支付宝付款，安全可靠'].map(item => (
              <li key={item} className="text-gray-300 text-sm flex items-center gap-2">
                <span className="text-green-500">✓</span> {item}
              </li>
            ))}
          </ul>
          <Link href="/generate" className="flex items-center justify-center h-12 bg-amber-500 text-black font-bold text-sm rounded hover:bg-amber-400 transition-colors">
            立即上传房间照片
          </Link>
        </div>
      </section>

      <footer className="px-[120px] py-8 border-t border-gray-900 text-center text-gray-600 text-sm">
        © 2026 装AI · 由 ZenMux AI 驱动
      </footer>
    </main>
  )
}
