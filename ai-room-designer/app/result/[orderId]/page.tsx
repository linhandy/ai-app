import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createHash } from 'crypto'
import type { Metadata } from 'next'
import { getOrder } from '@/lib/orders'
import { regionConfig } from '@/lib/region-config'
import { getReferralCount } from '@/lib/referral'
import ComparePanel from '@/components/ComparePanel'
import SaveToHistory from '@/components/SaveToHistory'
import SharePanel from '@/components/SharePanel'
import UnwatermarkButton from '@/components/UnwatermarkButton'
import PollingRefresh from '@/components/PollingRefresh'
import ProgressBar from '@/components/ProgressBar'
import ShareModalTrigger from '@/components/ShareModalTrigger'
import Link from 'next/link'

export async function generateMetadata(
  { params }: { params: { orderId: string } }
): Promise<Metadata> {
  const order = await getOrder(params.orderId)
  if (!order || order.status !== 'done') return { title: regionConfig.seoMeta.siteName }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const imageUrl = order.resultUrl?.startsWith('http')
    ? order.resultUrl
    : `${base}${order.resultUrl}`

  return {
    title: `${order.style} | ${regionConfig.seoMeta.siteName}`,
    description: regionConfig.seoMeta.description,
    openGraph: {
      title: `${order.style} | ${regionConfig.seoMeta.siteName}`,
      description: regionConfig.seoMeta.description,
      images: [{ url: imageUrl, width: 1024, height: 1024, alt: `${order.style} – ${regionConfig.seoMeta.siteName}` }],
    },
  }
}

export default async function ResultPage({ params }: { params: { orderId: string } }) {
  const order = await getOrder(params.orderId)

  if (!order) notFound()

  // Still generating — show progress bar with auto-refresh
  if (order.status === 'paid' || order.status === 'generating') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-8 max-w-sm w-full px-6">
          {/* Steps */}
          <div className="w-full space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-green-400 text-sm">订单已创建</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center animate-pulse shrink-0">
                <div className="w-2 h-2 bg-black rounded-full" />
              </div>
              <span className="text-amber-400 text-sm font-semibold">AI 生成中...</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-700 shrink-0" />
              <span className="text-gray-500 text-sm">生成完成</span>
            </div>
          </div>

          <ProgressBar isComplete={false} />

          <p className="text-gray-600 text-xs text-center">
            大约需要 20–30 秒&nbsp;·&nbsp;
            <a href="/history" className="text-gray-400 underline underline-offset-2 hover:text-gray-200">
              你也可以去其他页面，完成后在历史记录查看 →
            </a>
          </p>

          <PollingRefresh orderId={params.orderId} />
        </div>
      </main>
    )
  }

  // Generation failed — show error with retry link
  if (order.status === 'failed') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-sm px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-400 font-semibold text-lg">生成失败</p>
          <p className="text-gray-400 text-sm">AI 生成遇到问题，请重新尝试</p>
          <Link href="/generate" className="flex items-center justify-center gap-2 px-8 h-12 bg-amber-500 text-black font-bold text-sm rounded hover:bg-amber-400 transition-colors">
            重新生成
          </Link>
        </div>
      </main>
    )
  }

  if (order.status !== 'done' || !order.resultUrl) notFound()

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const fullResultUrl = order.resultUrl?.startsWith('http')
    ? order.resultUrl
    : `${base}${order.resultUrl}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: `${order.style}风格装修效果图`,
    description: `AI生成的${order.style}风格室内装修效果图`,
    contentUrl: fullResultUrl,
    creator: { '@type': 'Organization', name: '装AI', url: base },
    dateCreated: order.createdAt,
  }

  const beforeUrl = order.uploadId ? `/api/preview?uploadId=${encodeURIComponent(order.uploadId)}` : undefined

  // Build the full page URL for sharing
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'

  // Generate refCode from current viewer's IP for sharing
  const visitorForwarded = headersList.get('x-forwarded-for')
  const visitorIp = visitorForwarded?.split(',')[0]?.trim() ?? 'unknown'
  const refCode = createHash('sha256').update(visitorIp).digest('hex').slice(0, 6)
  const shareUrl = `${proto}://${host}/r/${order.id}?ref=${refCode}`
  const referralCount = await getReferralCount(refCode)

  return (
    <main className="min-h-screen bg-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="flex items-center px-4 md:px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">装</div>
          <span className="font-bold text-xl">装AI</span>
        </Link>
        <div className="flex-1" />
        <Link href="/history" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">历史记录</Link>
        <div className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-green-950 text-green-400 text-sm font-semibold">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          生成成功
        </div>
      </nav>

      <div className="flex flex-col items-center px-4 md:px-[120px] pt-8 md:pt-12 pb-16 gap-6 md:gap-8">
        <h1 className="text-xl md:text-3xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>
          {order.mode === 'paint_walls' ? '墙面换色效果图已生成'
            : order.mode === 'change_lighting' ? '灯光优化效果图已生成'
            : order.mode === 'virtual_staging' ? `您的${order.style}虚拟家装效果图已生成`
            : order.mode === 'add_furniture' ? `您的${order.style}家具效果图已生成`
            : `您的${order.style}装修效果图已生成`}
        </h1>

        <SaveToHistory orderId={order.id} style={order.style} quality={order.quality} mode={order.mode} createdAt={order.createdAt} />
        <ComparePanel beforeUrl={beforeUrl} afterUrl={order.resultUrl} style={order.style} />

        {/* De-watermark CTA — shown for all watermarked orders */}
        {order.isFree && (
          <div className="w-full max-w-[1100px] mt-2 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-amber-400 font-semibold text-sm">当前为预览版（含水印）</p>
              <p className="text-gray-500 text-xs mt-0.5">
                支付 ¥{order.quality === 'ultra' ? 5 : order.quality === 'premium' ? 3 : 1} 解锁无水印高清版本
              </p>
            </div>
            <UnwatermarkButton orderId={order.id} price={order.quality === 'ultra' ? 5 : order.quality === 'premium' ? 3 : 1} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-[600px]">
          <a
            href={order.resultUrl}
            download="AI装修效果图.png"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 px-8 h-14 bg-amber-500 text-black font-bold text-base rounded hover:bg-amber-400 transition-colors shadow-[0_6px_20px_rgba(255,152,0,0.3)] flex-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            下载高清效果图
          </a>
          <Link
            href="/generate"
            className="flex items-center justify-center gap-2 px-7 h-14 border border-gray-700 text-gray-400 text-base rounded hover:border-gray-500 transition-colors flex-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            再试一次
          </Link>
        </div>

        <SharePanel style={order.style} resultUrl={order.resultUrl} pageUrl={shareUrl} referralCount={referralCount} />

        {/* Info strip */}

        <div className="w-full max-w-[600px] grid grid-cols-3 divide-x divide-gray-800 rounded-lg bg-[#0A0A0A] border border-gray-800 overflow-hidden">
          {[
            { label: '装修风格', value: order.style, color: 'text-amber-500' },
            { label: '分辨率', value: order.quality === 'ultra' ? '4096×4096' : order.quality === 'premium' ? '2048×2048' : '1024×1024', color: 'text-white' },
            { label: order.isFree ? '解锁价格' : '已付费', value: order.quality === 'ultra' ? '¥5' : order.quality === 'premium' ? '¥3' : '¥1', color: order.isFree ? 'text-amber-500' : 'text-green-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center gap-1 py-4 px-2">
              <span className={`${color} text-sm font-bold truncate max-w-full text-center`}>{value}</span>
              <span className="text-gray-500 text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <ShareModalTrigger
        orderId={order.id}
        style={order.style}
        pageUrl={shareUrl}
        resultUrl={order.resultUrl}
      />
    </main>
  )
}
