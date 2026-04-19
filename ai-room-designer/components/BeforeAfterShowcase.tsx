'use client'
import { useState } from 'react'
import BeforeAfter from './BeforeAfter'

const PAIRS = [
  { slug: 'nordic',        label: 'Scandinavian'   },
  { slug: 'japanese-muji', label: 'Japanese Muji'  },
  { slug: 'modern-luxury', label: 'Modern Luxury'  },
  { slug: 'industrial',    label: 'Industrial Loft' },
]

export default function BeforeAfterShowcase() {
  const [active, setActive] = useState(PAIRS[0].slug)
  const current = PAIRS.find((p) => p.slug === active) ?? PAIRS[0]
  const beforeUrl = `/homepage/before-after/${current.slug}-before.jpg`
  const afterUrl = `/homepage/before-after/${current.slug}-after.jpg`

  return (
    <section className="px-4 sm:px-6 lg:px-[120px] py-16 bg-black">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-6">
         <div className="text-center max-w-2xl">
           <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>
             Drag to compare <span className="text-amber-500">before & after</span>
           </h2>
           <p className="text-gray-400 text-sm md:text-base mt-3 text-center">
             Same room. Four different styles. Actual AI output — no stock photography.
           </p>
         </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {PAIRS.map((p) => (
            <button
              key={p.slug}
              onClick={() => setActive(p.slug)}
              className={`text-xs sm:text-sm font-semibold px-3 sm:px-4 h-9 rounded-full border transition-colors ${
                active === p.slug
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="w-full flex justify-center">
          <BeforeAfter
            key={active}
            beforeUrl={beforeUrl}
            afterUrl={afterUrl}
            height="min(65vw, 520px)"
          />
        </div>

        <p className="text-gray-600 text-xs text-center">
          Drag the divider to reveal. Each transformation takes ~30 seconds.
        </p>
      </div>
    </section>
  )
}
