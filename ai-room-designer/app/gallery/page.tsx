import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { isOverseas } from '@/lib/region'
import { STYLE_CATEGORIES, ROOM_TYPES, findStyleByKey } from '@/lib/design-config'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = isOverseas
  ? {
      title: 'AI Interior Design Gallery — Community Designs | RoomAI',
      description: 'Browse AI-generated interior designs from the RoomAI community. Filter by style and room type.',
    }
  : {
      title: 'AI装修效果图画廊 — 社区作品 | 装AI',
      description: '浏览社区用户的AI装修效果图，按风格和房间类型筛选。',
    }

interface GalleryItem {
  id: string
  style: string
  roomType: string
  resultUrl: string
  createdAt: number
}

interface GalleryResponse {
  items: GalleryItem[]
  page: number
  totalPages: number
  total: number
}

async function fetchGallery(searchParams: Record<string, string | undefined>): Promise<GalleryResponse> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const params = new URLSearchParams()
  if (searchParams.page) params.set('page', searchParams.page)
  if (searchParams.style) params.set('style', searchParams.style)
  if (searchParams.roomType) params.set('roomType', searchParams.roomType)

  const res = await fetch(`${base}/api/gallery?${params}`, { cache: 'no-store' })
  if (!res.ok) return { items: [], page: 1, totalPages: 0, total: 0 }
  return res.json()
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  const gallery = await fetchGallery(searchParams)
  const allStyles = STYLE_CATEGORIES.flatMap(c => c.styles)

  return (
    <main className="min-h-screen bg-black">
      <NavBar />
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {isOverseas ? 'Design Gallery' : '效果图画廊'}
        </h1>
        <p className="text-gray-400 mb-8">
          {isOverseas
            ? `${gallery.total} designs shared by the community`
            : `${gallery.total} 个社区分享的设计`}
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/gallery"
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              !searchParams.style && !searchParams.roomType
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-gray-800 text-gray-500 hover:border-gray-600'
            }`}
          >
            {isOverseas ? 'All' : '全部'}
          </Link>
          {allStyles.slice(0, 8).map(s => (
            <Link
              key={s.key}
              href={`/gallery?style=${s.key}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                searchParams.style === s.key
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                  : 'border-gray-800 text-gray-500 hover:border-gray-600'
              }`}
            >
              {isOverseas ? s.labelEn : s.label}
            </Link>
          ))}
        </div>

        {/* Grid */}
        {gallery.items.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-500 text-lg mb-4">
              {isOverseas ? 'No designs yet. Be the first!' : '暂无作品，快来分享吧！'}
            </p>
            <Link
              href="/generate"
              className="inline-flex items-center bg-amber-500 text-black font-bold px-6 h-10 rounded hover:bg-amber-400 transition-colors"
            >
              {isOverseas ? 'Create a design →' : '开始设计 →'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {gallery.items.map(item => {
              const styleEntry = findStyleByKey(item.style)
              const styleLabel = isOverseas
                ? (styleEntry?.labelEn ?? item.style.replace(/_/g, ' '))
                : (styleEntry?.label ?? item.style)
              const roomEntry = ROOM_TYPES.find(r => r.key === item.roomType)
              const roomLabel = isOverseas
                ? (roomEntry?.labelEn ?? item.roomType.replace(/_/g, ' '))
                : (roomEntry?.label ?? item.roomType)

              return (
                <Link key={item.id} href={`/result/${item.id}`} className="group">
                  <div className="relative rounded-lg overflow-hidden border border-gray-800 group-hover:border-amber-500/40 transition-colors">
                    <div className="relative w-full" style={{ aspectRatio: '1' }}>
                      <Image
                        src={item.resultUrl}
                        alt={`${styleLabel} ${roomLabel}`}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <span className="text-white text-xs font-medium">{styleLabel}</span>
                      <span className="text-gray-400 text-xs ml-1">· {roomLabel}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {gallery.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: Math.min(gallery.totalPages, 10) }, (_, i) => i + 1).map(p => (
              <Link
                key={p}
                href={`/gallery?page=${p}${searchParams.style ? `&style=${searchParams.style}` : ''}${searchParams.roomType ? `&roomType=${searchParams.roomType}` : ''}`}
                className={`w-9 h-9 flex items-center justify-center rounded text-sm transition-colors ${
                  p === gallery.page
                    ? 'bg-amber-500 text-black font-bold'
                    : 'text-gray-500 hover:text-white border border-gray-800 hover:border-gray-600'
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
