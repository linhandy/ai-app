'use client'
import { useCallback, useRef, useState } from 'react'
import { isOverseas } from '@/lib/region'

interface Props {
  beforeUrl: string
  afterUrl: string
  height?: string
}

export default function BeforeAfter({ beforeUrl, afterUrl, height = '440px' }: Props) {
  const [pos, setPos] = useState(50) // percentage
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = Math.min(95, Math.max(5, ((clientX - rect.left) / rect.width) * 100))
    setPos(pct)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[1000px] rounded-xl overflow-hidden border border-gray-800 select-none cursor-col-resize"
      style={{ height }}
      onMouseMove={(e) => handleMove(e.clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      {/* After (full width background) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={afterUrl} alt={isOverseas ? 'AI Design' : 'AI效果图'} className="absolute inset-0 w-full h-full object-cover" />

      {/* Before (clipped to left portion) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={beforeUrl} alt={isOverseas ? 'Before' : '改造前'} className="absolute inset-0 w-full h-full object-cover" />
      </div>

      {/* Divider line */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none" style={{ left: `${pos}%` }} />

      {/* Handle */}
      <div
        className="absolute w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg pointer-events-none"
        style={{ left: `${pos}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l-3 3 3 3M16 9l3 3-3 3" />
        </svg>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 bg-black/80 text-white text-xs font-semibold px-3 h-7 flex items-center rounded">{isOverseas ? 'Before' : '改造前'}</div>
      <div className="absolute top-4 right-4 bg-amber-500 text-black text-xs font-bold px-3 h-7 flex items-center rounded">{isOverseas ? '✦ AI Design' : '✦ AI效果图'}</div>
    </div>
  )
}
