import Link from 'next/link'
import Image from 'next/image'
import StyleGallery from '@/components/StyleGallery'
import NavBar from '@/components/NavBar'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black">
      <NavBar />

      {/* Hero */}
      <section className="flex flex-col items-center px-6 md:px-[120px] pt-16 pb-12 gap-6">
        <div className="flex items-center gap-2 px-3.5 h-7 rounded-full bg-amber-950 border border-amber-500 text-amber-500 text-sm font-semibold">
          ✦ 限时体验价 ¥1/张
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-center leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
          拍一张照片<br />AI秒变理想装修
        </h1>
        <p className="text-gray-400 text-lg text-center max-w-lg">
          上传任意角度的房间照片，30秒内看到专业室内设计师级别的装修效果图
        </p>
        <div className="flex items-center gap-4 mt-2">
          <Link href="/generate" className="bg-amber-500 text-black font-bold text-base px-8 rounded flex items-center gap-2 hover:bg-amber-400 transition-colors shadow-[0_8px_24px_rgba(255,152,0,0.3)]" style={{height:'52px'}}>
            ¥1 立即生成效果图
          </Link>
          <a href="#examples" className="text-gray-400 text-base px-7 rounded border border-gray-700 hover:border-gray-500 transition-colors flex items-center" style={{height:'52px'}}>
            查看示例效果
          </a>
        </div>

        {/* Before/After side-by-side direct comparison */}
        <div className="w-full max-w-[1100px] mt-8">
          <div className="grid grid-cols-2 gap-3 md:gap-5">
            <div className="relative rounded-xl overflow-hidden border border-gray-700">
              <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
                <Image
                  src="/styles/before-sample.jpg"
                  alt="改造前"
                  fill
                  className="object-cover"
                  style={{ filter: 'brightness(1.25) contrast(1.05)' }}
                />
              </div>
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-sm text-white text-xs font-semibold px-3 h-7 rounded-full border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                改造前
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden border border-amber-500/50">
              <div className="absolute inset-0 rounded-xl ring-1 ring-amber-500/30 pointer-events-none z-10" />
              <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
                <Image src="/styles/hero-after.png" alt="AI效果图" fill className="object-cover" />
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-amber-500 text-black text-xs font-bold px-3 h-7 rounded-full z-20">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                AI效果图
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-3">
            <span className="text-gray-600 text-xs">昏暗杂乱的老旧客厅</span>
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="text-amber-500 text-xs font-semibold">AI 改造成北欧简约风</span>
          </div>
        </div>
      </section>

      {/* Styles section */}
      <section id="examples" className="px-6 md:px-[120px] py-16 bg-[#050505] flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-3xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>6种热门装修风格，一键切换</h2>
          <p className="text-gray-500 text-sm text-center">覆盖当下最流行的室内设计风格 · 点击图片可放大预览</p>
        </div>
        <StyleGallery />
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 md:px-[120px] py-16 flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-3xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>选择适合你的方案</h2>
          <p className="text-gray-500 text-sm text-center">按次收费，无需订阅 · 支持支付宝扫码</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-[960px]">
          {/* Standard */}
          <div className="p-6 rounded-xl bg-[#0D0D0D] border border-gray-800 flex flex-col gap-4">
            <div>
              <h3 className="text-white text-lg font-bold">标准版</h3>
              <p className="text-gray-500 text-xs mt-1">快速体验 AI 装修设计</p>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold text-white">¥1</span>
              <span className="text-gray-500 text-sm mb-1">/张</span>
            </div>
            <ul className="space-y-2 flex-1">
              {[
                '6种热门装修风格',
                '标准画质（1024×1024）',
                '30秒快速出图',
                '支付宝扫码付款',
              ].map(item => (
                <li key={item} className="text-gray-400 text-sm flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/generate" className="flex items-center justify-center h-11 bg-white/10 text-white font-semibold text-sm rounded hover:bg-white/15 transition-colors">
              立即体验
            </Link>
          </div>

          {/* Premium */}
          <div className="p-6 rounded-xl bg-[#0D0D0D] border-2 border-amber-500 flex flex-col gap-4 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
              推荐
            </div>
            <div>
              <h3 className="text-amber-500 text-lg font-bold">高清版</h3>
              <p className="text-gray-500 text-xs mt-1">更高画质，更真实的效果</p>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold text-amber-500">¥3</span>
              <span className="text-gray-500 text-sm mb-1">/张</span>
            </div>
            <ul className="space-y-2 flex-1">
              {[
                '包含标准版全部功能',
                '高清画质（2048×2048）',
                '更逼真的光影效果',
                '细节增强处理',
                '优先生成队列',
              ].map(item => (
                <li key={item} className="text-gray-300 text-sm flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">✓</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/generate?quality=premium" className="flex items-center justify-center h-11 bg-amber-500 text-black font-bold text-sm rounded hover:bg-amber-400 transition-colors shadow-[0_4px_16px_rgba(255,152,0,0.3)]">
              选择高清版
            </Link>
          </div>

          {/* Ultra */}
          <div className="p-6 rounded-xl bg-[#0D0D0D] border border-gray-800 flex flex-col gap-4">
            <div>
              <h3 className="text-purple-400 text-lg font-bold">超清版</h3>
              <p className="text-gray-500 text-xs mt-1">专业级别的极致效果</p>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold text-purple-400">¥5</span>
              <span className="text-gray-500 text-sm mb-1">/张</span>
            </div>
            <ul className="space-y-2 flex-1">
              {[
                '包含高清版全部功能',
                '超清画质（4096×4096）',
                '照片级真实感渲染',
                '专业室内设计师级光效',
                '极速优先通道',
                '无水印高清下载',
              ].map(item => (
                <li key={item} className="text-gray-300 text-sm flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">✓</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/generate?quality=ultra" className="flex items-center justify-center h-11 bg-purple-500/20 text-purple-300 font-semibold text-sm rounded border border-purple-500/40 hover:bg-purple-500/30 transition-colors">
              选择超清版
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 md:px-[120px] py-16 bg-[#050505]">
        <div className="max-w-[800px] mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10" style={{ fontFamily: 'Georgia, serif' }}>常见问题</h2>

          <div className="space-y-4">
            {[
              {
                q: 'AI装修效果图是怎么生成的？',
                a: '我们使用最新的 AI 图像生成技术，分析您上传的房间照片的空间结构、门窗位置和整体布局，然后根据您选择的装修风格，智能生成专业级别的室内设计效果图。整个过程只需 30 秒。',
              },
              {
                q: '支持哪些类型的房间？',
                a: '目前支持客厅、卧室、书房、餐厅等常见室内空间。建议上传正面角度、光线充足的照片，AI 会保留原有的空间结构并重新设计装修风格。',
              },
              {
                q: '标准版、高清版和超清版有什么区别？',
                a: '标准版生成 1024×1024 分辨率的效果图，适合快速预览；高清版提升至 2048×2048，拥有更逼真的光影细节；超清版达到 4096×4096 专业级画质，适合打印或展示使用。画质越高，AI 渲染的细节越丰富，效果越真实。',
              },
              {
                q: '如何付款？',
                a: '我们使用支付宝当面付，点击生成按钮后会弹出支付宝二维码，使用支付宝 APP 扫码即可完成支付。付款成功后自动开始生成效果图。',
              },
              {
                q: '生成的效果图可以商用吗？',
                a: '可以。您付费生成的效果图拥有完整的使用权，可以用于个人参考、社交媒体分享、与装修公司沟通方案等任何合法用途。',
              },
              {
                q: '支持退款吗？',
                a: '由于 AI 生成服务的特殊性，每次生成都会消耗计算资源，因此付款后不支持退款。建议您先使用标准版（¥1）体验效果，满意后再选择更高画质版本。',
              },
              {
                q: '生成的图片会被保存多久？',
                a: '生成的效果图会在服务器保存 7 天，请在此期间及时下载保存。超过保存期限后图片将被自动清理。',
              },
            ].map(({ q, a }) => (
              <details key={q} className="group border border-gray-800 rounded-lg overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors">
                  <span className="text-white text-sm font-medium">{q}</span>
                  <svg className="w-4 h-4 text-gray-500 shrink-0 ml-4 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-4 text-gray-400 text-sm leading-relaxed">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-[120px] py-8 border-t border-gray-900 text-center text-gray-600 text-sm">
        © 2026 装AI · 由 ZenMux AI 驱动
      </footer>
    </main>
  )
}
