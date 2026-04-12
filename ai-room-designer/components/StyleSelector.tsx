'use client'
import Image from 'next/image'
import { useState } from 'react'
import { STYLE_CATEGORIES } from '@/lib/design-config'

// Gradient fallback colors per category key (shown while thumbnail loads or on error)
const CATEGORY_GRADIENT: Record<string, string> = {
  minimalist: 'from-slate-200 to-slate-400',
  chinese:    'from-amber-100 to-red-200',
  european:   'from-rose-100 to-pink-200',
  modern:     'from-blue-100 to-indigo-200',
  retro:      'from-orange-100 to-yellow-200',
  natural:    'from-green-100 to-emerald-200',
  industrial: 'from-zinc-200 to-zinc-400',
  creative:   'from-purple-100 to-violet-200',
}

interface Props {
  selected: string
  onChange: (styleKey: string) => void
}

export default function StyleSelector({ selected, onChange }: Props) {
  const [activeCat, setActiveCat] = useState(STYLE_CATEGORIES[0].key)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const currentCategory = STYLE_CATEGORIES.find((c) => c.key === activeCat) ?? STYLE_CATEGORIES[0]
  const gradient = CATEGORY_GRADIENT[activeCat] ?? 'from-gray-200 to-gray-400'

  return (
    <div className="flex flex-col gap-3">
      {/* Category tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {STYLE_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCat(cat.key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              activeCat === cat.key
                ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                : 'border-gray-800 text-gray-500 hover:border-gray-600'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-style grid */}
      <div className="grid grid-cols-2 gap-2">
        {currentCategory.styles.map((style) => {
          const isSelected = selected === style.key
          const imgFailed = failedImages.has(style.key)

          return (
            <button
              key={style.key}
              onClick={() => onChange(style.key)}
              className={`rounded-lg overflow-hidden border-2 text-left transition-all hover:scale-[1.02] ${
                isSelected
                  ? 'border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'border-gray-800 hover:border-gray-600'
              }`}
            >
              {/* Thumbnail with gradient fallback */}
              <div className={`relative w-full aspect-[4/3] bg-gradient-to-br ${gradient}`}>
                {!imgFailed && (
                  <Image
                    src={style.thumbnail}
                    alt={style.label}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 200px"
                    onError={() => setFailedImages((prev) => new Set(prev).add(style.key))}
                  />
                )}
                {isSelected && <div className="absolute inset-0 bg-amber-500/10" />}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className={`px-2.5 py-2 ${isSelected ? 'bg-amber-950/60' : 'bg-[#0D0D0D]'}`}>
                <div className={`text-xs font-semibold ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                  {style.label}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
