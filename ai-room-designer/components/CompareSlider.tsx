'use client'
import { useState } from 'react'
import Image from 'next/image'
import { isOverseas } from '@/lib/region'

interface Props {
  before: string
  after: string
}

export default function CompareSlider({ before, after }: Props) {
  const [position, setPosition] = useState(50)

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setPosition(pct)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.touches[0].clientX - rect.left
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setPosition(pct)
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-gray-800 cursor-ew-resize select-none"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={handleMove}
      onTouchMove={handleTouchMove}
    >
      {/* Before (full background) */}
      <Image
        src={before}
        alt={isOverseas ? 'Before' : '改造前'}
        fill
        className="object-cover"
        priority
      />

      {/* After (clipped by mask) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={after}
          alt={isOverseas ? 'AI Design' : 'AI效果图'}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Slider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg z-10"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      />

      {/* Slider handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 bg-white/95 rounded-full shadow-lg flex items-center justify-center z-10"
        style={{ left: `${position}%` }}
      >
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/75 backdrop-blur-sm text-white text-xs font-semibold px-3 h-7 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
        {isOverseas ? 'Before' : '改造前'}
      </div>
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-amber-500 text-black text-xs font-bold px-3 h-7 rounded-full">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        {isOverseas ? 'AI Design' : 'AI效果图'}
      </div>
    </div>
  )
}