import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ROOM_TYPES, findStyleByKey } from '@/lib/design-config'
import { isOverseas } from '@/lib/region'

export function generateStaticParams() {
  return ROOM_TYPES.map(r => ({ slug: r.key }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const room = ROOM_TYPES.find(r => r.key === params.slug)
  if (!room) return { title: isOverseas ? 'RoomAI' : '装AI' }

  if (isOverseas) {
    const title = `AI ${room.labelEn} Design — Redesign in 30 Seconds | RoomAI`
    const description = `Upload a photo of your ${room.labelEn.toLowerCase()} and AI redesigns it in 30 seconds. Get 3 free HD designs on signup — no credit card needed.`
    return {
      title,
      description,
      openGraph: { title, description },
    }
  }

  return {
    title: `${room.label}装修效果图 - AI一键生成 | 装AI`,
    description: `用AI生成${room.label}的装修效果图，30秒出图，上传照片即可体验。`,
    openGraph: {
      title: `${room.label}AI装修效果图`,
      description: `${room.label}装修效果图，AI 30秒出图`,
    },
  }
}

export default function RoomPage({ params }: { params: { slug: string } }) {
  const room = ROOM_TYPES.find(r => r.key === params.slug)
  if (!room) notFound()

  const siteName = isOverseas ? 'RoomAI' : '装AI'
  const logoLetter = isOverseas ? 'R' : '装'
  const name = isOverseas ? room.labelEn : room.label

  const popularStyles = isOverseas
    ? ['nordic_minimal', 'modern_luxury', 'wabi_sabi', 'art_deco']
    : ['nordic_minimal', 'new_chinese', 'modern_luxury', 'french_romantic']

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center px-4 md:px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">{logoLetter}</div>
          <span className="font-bold text-xl">{siteName}</span>
        </Link>
      </nav>

      <div className="flex flex-col items-center px-4 md:px-[120px] pt-12 pb-16 gap-8">
        <div className="text-5xl">{room.icon}</div>

        <h1 className="text-3xl md:text-5xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>
          {isOverseas ? `AI ${name} Designer` : `AI ${name}设计`}
        </h1>

        <p className="text-gray-400 text-lg text-center max-w-lg">
          {isOverseas
            ? `Upload a photo of your ${name.toLowerCase()} and AI redesigns it in any style — results in under 30 seconds.`
            : `上传${name}照片，AI 30秒内生成专业的装修效果图`}
        </p>

        <Link
          href={`/generate?roomType=${room.key}`}
          className="bg-amber-500 text-black font-bold text-lg px-10 rounded flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-[0_8px_24px_rgba(255,152,0,0.3)]"
          style={{ height: '56px' }}
        >
          {isOverseas ? `Design my ${name} — free` : `生成${name}效果图`}
        </Link>

        <div className="w-full max-w-[800px] mt-4">
          <h2 className="text-xl font-bold mb-4">
            {isOverseas ? `Popular styles for ${name}` : `${name}热门风格`}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {popularStyles.map(styleKey => {
              const styleEntry = findStyleByKey(styleKey)
              const styleLabel = isOverseas
                ? (styleEntry?.labelEn ?? styleKey.replace(/_/g, ' '))
                : (styleEntry?.label ?? styleKey.replace(/_/g, ' '))
              return (
                <Link
                  key={styleKey}
                  href={`/generate?roomType=${room.key}&style=${styleKey}`}
                  className="group border border-gray-800 rounded-lg p-4 hover:border-amber-500/50 transition-colors text-center"
                >
                  <div className="text-sm text-gray-300 group-hover:text-amber-400 transition-colors">
                    {styleLabel}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="w-full max-w-[800px] mt-4 border-t border-gray-900 pt-8">
          <h2 className="text-xl font-bold mb-4">{isOverseas ? 'More room types' : '更多房间类型'}</h2>
          <div className="flex flex-wrap gap-3">
            {ROOM_TYPES.filter(r => r.key !== room.key).map(r => (
              <Link
                key={r.key}
                href={`/rooms/${r.key}`}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-amber-400 transition-colors border border-gray-800 hover:border-amber-500/30 rounded-full px-3 py-1.5"
              >
                <span>{r.icon}</span>
                <span>{isOverseas ? r.labelEn : r.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
