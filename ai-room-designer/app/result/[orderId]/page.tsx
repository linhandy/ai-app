import { notFound } from 'next/navigation'
import { getOrder } from '@/lib/orders'
import BeforeAfter from '@/components/BeforeAfter'
import Link from 'next/link'

export default function ResultPage({ params }: { params: { orderId: string } }) {
  const order = getOrder(params.orderId)

  if (!order) notFound()

  // Still generating — show spinner with auto-refresh
  if (order.status === 'paid' || order.status === 'generating') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-semibold text-lg">AI生成中，请稍候...</p>
          <p className="text-gray-400 text-sm">约30秒，页面将自动刷新</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <meta httpEquiv="refresh" content="3" />
        </div>
      </main>
    )
  }

  if (order.status !== 'done' || !order.resultUrl) notFound()

  const beforeUrl = `/api/preview?uploadId=${encodeURIComponent(order.uploadId)}`

  return (
    <main className="min-h-screen bg-black">
      <nav className="flex items-center px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">装</div>
          <span className="font-bold text-xl">装AI</span>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 px-3.5 h-8 rounded-full bg-green-950 text-green-400 text-sm font-semibold">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          生成成功
        </div>
      </nav>

      <div className="flex flex-col items-center px-[120px] pt-12 pb-16 gap-8">
        <h1 className="text-3xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>
          您的{order.style}装修效果图已生成
        </h1>

        <BeforeAfter beforeUrl={beforeUrl} afterUrl={order.resultUrl} />

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

        {/* Info strip */}
        <div className="flex items-center gap-8 px-8 py-5 rounded-lg bg-[#0A0A0A] border border-gray-800">
          {[
            { label: '装修风格', value: order.style, color: 'text-amber-500' },
            { label: '图片分辨率', value: '1024×1024', color: 'text-white' },
            { label: '本次费用', value: '¥1.00', color: 'text-white' },
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
