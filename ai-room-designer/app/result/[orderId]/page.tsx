import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getOrder } from '@/lib/orders'
import ComparePanel from '@/components/ComparePanel'
import SaveToHistory from '@/components/SaveToHistory'
import SharePanel from '@/components/SharePanel'
import PollingRefresh from '@/components/PollingRefresh'
import Link from 'next/link'

export default async function ResultPage({ params }: { params: { orderId: string } }) {
  const order = await getOrder(params.orderId)

  if (!order) notFound()

  // Still generating — show spinner with auto-refresh and progress animation
  if (order.status === 'paid' || order.status === 'generating') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 max-w-sm px-6">
          {/* Animated spinner */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-amber-500/20 rounded-full" />
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
          </div>

          <div className="text-center space-y-2">
            <p className="text-white font-semibold text-xl">AI 正在生成装修效果图</p>
            <p className="text-gray-400 text-sm">AI正在分析房间结构，重新设计装修风格，请稍候...</p>
          </div>

          {/* Progress steps */}
          <div className="w-full space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-green-400 text-sm">支付成功</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 bg-black rounded-full" />
              </div>
              <span className="text-amber-400 text-sm">AI 生成中...</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center" />
              <span className="text-gray-500 text-sm">生成完成</span>
            </div>
          </div>

          <p className="text-gray-500 text-xs">大约需要 20-30 秒，页面将自动刷新</p>
          <PollingRefresh orderId={params.orderId} />
        </div>
      </main>
    )
  }

  if (order.status !== 'done' || !order.resultUrl) notFound()

  const beforeUrl = order.uploadId ? `/api/preview?uploadId=${encodeURIComponent(order.uploadId)}` : undefined

  // Build the full page URL for sharing
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const pageUrl = `${proto}://${host}/result/${order.id}`

  return (
    <main className="min-h-screen bg-black">
      <nav className="flex items-center px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">装</div>
          <span className="font-bold text-xl">装AI</span>
        </Link>
        <div className="flex-1" />
        <Link href="/history" className="text-gray-500 text-sm mr-6 hover:text-gray-300 transition-colors">历史记录</Link>
        <div className="flex items-center gap-1.5 px-3.5 h-8 rounded-full bg-green-950 text-green-400 text-sm font-semibold">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          生成成功
        </div>
      </nav>

      <div className="flex flex-col items-center px-[120px] pt-12 pb-16 gap-8">
        <h1 className="text-3xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>
          {order.mode === 'paint_walls' ? '墙面换色效果图已生成'
            : order.mode === 'change_lighting' ? '灯光优化效果图已生成'
            : order.mode === 'virtual_staging' ? `您的${order.style}虚拟家装效果图已生成`
            : order.mode === 'add_furniture' ? `您的${order.style}家具效果图已生成`
            : `您的${order.style}装修效果图已生成`}
        </h1>

        <SaveToHistory orderId={order.id} style={order.style} quality={order.quality} mode={order.mode} createdAt={order.createdAt} />
        <ComparePanel beforeUrl={beforeUrl} afterUrl={order.resultUrl} style={order.style} />

        <div className="flex items-center gap-4">
          <a
            href={order.resultUrl}
            download="AI装修效果图.png"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-8 bg-amber-500 text-black font-bold text-base rounded hover:bg-amber-400 transition-colors shadow-[0_6px_20px_rgba(255,152,0,0.3)]"
            style={{ height: '52px' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            下载高清效果图
          </a>
          <Link
            href="/generate"
            className="flex items-center gap-2 px-7 border border-gray-700 text-gray-400 text-base rounded hover:border-gray-500 transition-colors"
            style={{ height: '52px' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            换个风格再试一次
          </Link>
        </div>

        <SharePanel style={order.style} resultUrl={order.resultUrl} pageUrl={pageUrl} />

        {/* Info strip */}
        <div className="flex items-center gap-8 px-8 py-5 rounded-lg bg-[#0A0A0A] border border-gray-800">
          {[
            { label: '装修风格', value: order.style, color: 'text-amber-500' },
            { label: '图片分辨率', value: order.quality === 'ultra' ? '4096×4096' : order.quality === 'premium' ? '2048×2048' : '1024×1024', color: 'text-white' },
            { label: '本次费用', value: order.quality === 'ultra' ? '¥5.00' : order.quality === 'premium' ? '¥3.00' : '¥1.00', color: 'text-white' },
          ].map(({ label, value, color }, i) => (
            <div key={label} className="flex items-center gap-8">
              {i > 0 && <div className="w-px h-9 bg-gray-800" />}
              <div className="flex flex-col items-center gap-1">
                <span className={`${color} text-base font-bold`}>{value}</span>
                <span className="text-gray-500 text-xs">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
