'use client'
import { useEffect, useState } from 'react'

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    location: 'London, UK',
    text: 'I uploaded a photo of my boring living room and got a stunning Scandinavian redesign in 30 seconds. Showed it to my partner and we both agreed immediately — this is exactly what we want.',
    style: 'Scandinavian',
    avatar: 'S',
  },
  {
    name: 'James T.',
    location: 'New York, USA',
    text: 'Used it to virtually stage my empty apartment before listing it. The Modern Luxury renders looked so good that tenants were messaging me before I even finished the listing.',
    style: 'Modern Luxury',
    avatar: 'J',
  },
  {
    name: 'Priya K.',
    location: 'Singapore',
    text: 'Tried 6 different styles in one afternoon to help decide on our renovation direction. Saved us weeks of back-and-forth with an interior designer.',
    style: 'Japanese Muji',
    avatar: 'P',
  },
]

export default function SocialProof() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setCount(d.totalOrders ?? null))
      .catch(() => {})
  }, [])

  const displayCount = count !== null
    ? `${(count).toLocaleString()}+`
    : '10,000+'

  return (
    <section className="px-6 md:px-[120px] py-12 flex flex-col items-center gap-10">
      {/* Counter strip */}
      <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-16">
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-bold text-amber-500">{displayCount}</span>
          <span className="text-gray-500 text-sm">Rooms Redesigned</span>
        </div>
        <div className="hidden sm:block w-px h-10 bg-gray-800" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-bold text-white">40+</span>
          <span className="text-gray-500 text-sm">Design Styles</span>
        </div>
        <div className="hidden sm:block w-px h-10 bg-gray-800" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-bold text-white">~30s</span>
          <span className="text-gray-500 text-sm">Generation Time</span>
        </div>
        <div className="hidden sm:block w-px h-10 bg-gray-800" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-bold text-white">25</span>
          <span className="text-gray-500 text-sm">Room Types</span>
        </div>
      </div>

      {/* Testimonials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="flex flex-col gap-3 p-5 rounded-xl bg-gray-950 border border-gray-800">
            <p className="text-gray-300 text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-800">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 font-bold text-sm flex items-center justify-center shrink-0">
                {t.avatar}
              </div>
              <div>
                <p className="text-white text-xs font-semibold">{t.name}</p>
                <p className="text-gray-600 text-xs">{t.location}</p>
              </div>
              <span className="ml-auto text-xs text-gray-600 italic">{t.style}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
