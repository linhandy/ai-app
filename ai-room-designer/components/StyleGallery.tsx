'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

import { isOverseas } from '@/lib/region'

const STYLES = [
  { key: '北欧简约', labelEn: 'Nordic Minimal',  desc: '原木 · 白墙 · 绿植',        descEn: 'Oak wood · White walls · Greenery' },
  { key: '现代轻奢', labelEn: 'Modern Luxury',    desc: '大理石 · 金属 · 灰调',       descEn: 'Marble · Metal accents · Grey tones' },
  { key: '新中式',   labelEn: 'Neo-Chinese',      desc: '禅意 · 木格 · 留白',         descEn: 'Zen · Wood lattice · Negative space' },
  { key: '侘寂风',   labelEn: 'Wabi-Sabi',        desc: '不完美 · 自然 · 素色',       descEn: 'Imperfect · Natural · Muted tones' },
  { key: '工业风',   labelEn: 'Industrial',       desc: '裸砖 · 铁艺 · 水泥灰',       descEn: 'Exposed brick · Iron · Concrete' },
  { key: '奶油风',   labelEn: 'Cream Style',      desc: '米白 · 柔软 · 治愈系',       descEn: 'Cream white · Soft textures · Cozy' },
]

export default function StyleGallery() {
  const [active, setActive] = useState<string | null>(null)

  const close = useCallback(() => setActive(null), [])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, close])

  // Prevent body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = active ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [active])

  return (
    <>
      <div className="grid grid-cols-3 gap-4 w-full">
        {STYLES.map(({ key, desc, labelEn, descEn }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className="group rounded-xl overflow-hidden border border-gray-800 hover:border-amber-500 transition-all hover:scale-[1.02] text-left cursor-zoom-in"
          >
            <div className="relative h-[200px] w-full overflow-hidden">
              <Image
                src={`/styles/${key}.jpg`}
                alt={key}
                fill
                className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {/* Zoom hint */}
              <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
            <div className="bg-[#0A0A0A] px-4 py-3">
              <div className="text-white text-sm font-semibold">{isOverseas ? labelEn : key}</div>
              <div className="text-gray-500 text-xs mt-0.5">{isOverseas ? descEn : desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox modal */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={`/styles/${active}.jpg`}
              alt={active}
              width={900}
              height={600}
              className="object-contain max-h-[80vh] w-auto"
              priority
            />
            {/* Caption */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent px-6 py-4">
              <div className="text-white font-bold text-lg">{isOverseas ? STYLES.find(s => s.key === active)?.labelEn : active}</div>
              <div className="text-gray-400 text-sm mt-0.5">
                {isOverseas ? STYLES.find(s => s.key === active)?.descEn : STYLES.find(s => s.key === active)?.desc}
              </div>
            </div>
            {/* Close button */}
            <button
              onClick={close}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Nav arrows */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                const idx = STYLES.findIndex(s => s.key === active)
                setActive(STYLES[(idx - 1 + STYLES.length) % STYLES.length].key)
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                const idx = STYLES.findIndex(s => s.key === active)
                setActive(STYLES[(idx + 1) % STYLES.length].key)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          {/* Style name outside modal */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {STYLES.map(s => (
              <button
                key={s.key}
                onClick={(e) => { e.stopPropagation(); setActive(s.key) }}
                className={`w-2 h-2 rounded-full transition-all ${s.key === active ? 'bg-amber-500 w-4' : 'bg-gray-600 hover:bg-gray-400'}`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
