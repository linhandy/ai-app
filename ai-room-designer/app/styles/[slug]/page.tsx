import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { STYLE_CATEGORIES, findStyleByKey } from '@/lib/design-config'

const allStyles = STYLE_CATEGORIES.flatMap(c => c.styles)

export function generateStaticParams() {
  return allStyles.map(s => ({ slug: s.key }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const style = findStyleByKey(params.slug)
  if (!style) return { title: '装AI' }
  return {
    title: `${style.label}装修效果图 - AI一键生成 | 装AI`,
    description: `用AI生成${style.label}风格的装修效果图，30秒出图，1元起。上传房间照片即可体验专业室内设计。`,
    openGraph: {
      title: `${style.label}装修效果图 - AI生成`,
      description: `${style.label}风格装修效果图，AI 30秒出图`,
      images: [{ url: style.thumbnail, width: 800, height: 600 }],
    },
  }
}

export default function StylePage({ params }: { params: { slug: string } }) {
  const style = findStyleByKey(params.slug)
  if (!style) notFound()

  const category = STYLE_CATEGORIES.find(c => c.styles.some(s => s.key === params.slug))
  const relatedStyles = category?.styles.filter(s => s.key !== params.slug).slice(0, 4) ?? []

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center px-4 md:px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">装</div>
          <span className="font-bold text-xl">装AI</span>
        </Link>
      </nav>

      <div className="flex flex-col items-center px-4 md:px-[120px] pt-12 pb-16 gap-8">
        <h1 className="text-3xl md:text-5xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>
          {style.label}装修效果图
        </h1>
        <p className="text-gray-400 text-lg text-center max-w-lg">
          上传您的房间照片，AI 30秒内生成专业的{style.label}风格装修效果图
        </p>

        <div className="relative w-full max-w-[600px] rounded-xl overflow-hidden border border-gray-700">
          <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
            <Image
              src={style.thumbnail}
              alt={`${style.label}装修效果图示例`}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover"
            />
          </div>
        </div>

        <Link
          href={`/generate?style=${style.key}`}
          className="bg-amber-500 text-black font-bold text-lg px-10 rounded flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-[0_8px_24px_rgba(255,152,0,0.3)]"
          style={{ height: '56px' }}
        >
          ¥1 生成{style.label}效果图
        </Link>

        {relatedStyles.length > 0 && (
          <div className="w-full max-w-[800px] mt-8">
            <h2 className="text-xl font-bold mb-4">相关风格</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {relatedStyles.map(s => (
                <Link key={s.key} href={`/styles/${s.key}`} className="group">
                  <div className="relative rounded-lg overflow-hidden border border-gray-800 group-hover:border-amber-500/50 transition-colors">
                    <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
                      <Image src={s.thumbnail} alt={s.label} fill sizes="200px" className="object-cover" />
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <span className="text-white text-sm font-medium">{s.label}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
