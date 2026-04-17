'use client'
import { useEffect, useState } from 'react'
import { isOverseas } from '@/lib/region'

/**
 * Fake progress bar for AI generation waiting screen.
 * Runs autonomously: 0→75% over ~20s, then slows to 95%, jumps to 100% on isComplete.
 */
export default function ProgressBar({ isComplete }: { isComplete: boolean }) {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    if (isComplete) {
      setPct(100)
      return
    }
    const id = setInterval(() => {
      setPct((prev) => {
        if (prev >= 95) return prev
        // Fast phase 0→75 (about 21s at 500ms interval = 42 ticks, +1.79/tick)
        // Slow phase 75→95 (creep)
        const increment = prev < 75 ? 1.8 : 0.25
        return Math.min(prev + increment, 95)
      })
    }, 500)
    return () => clearInterval(id)
  }, [isComplete])

  const label = isOverseas
    ? (pct < 30 ? 'Analyzing room...'
      : pct < 65 ? 'AI redesigning...'
      : pct < 90 ? 'Rendering...'
      : isComplete ? 'Done!'
      : 'Almost there...')
    : (pct < 30 ? '分析房间结构...'
      : pct < 65 ? 'AI 重新设计中...'
      : pct < 90 ? '渲染效果图...'
      : isComplete ? '完成！'
      : '即将完成...')

  return (
    <div className="w-full max-w-xs space-y-2">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
