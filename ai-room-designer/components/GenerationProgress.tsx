'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Props {
  active: boolean
  estimatedSeconds?: number
}

export default function GenerationProgress({ active, estimatedSeconds = 30 }: Props) {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('Analyzing room structure...')

  useEffect(() => {
    if (!active) {
      setProgress(0)
      setPhase('Analyzing room structure...')
      return
    }
    const start = Date.now()
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      const pct = Math.min(95, Math.round((elapsed / estimatedSeconds) * 95))
      setProgress(pct)
      if (elapsed < estimatedSeconds * 0.33) setPhase('Analyzing room structure...')
      else if (elapsed < estimatedSeconds * 0.73) setPhase('Applying selected style...')
      else setPhase('Rendering final design...')
    }, 400)
    return () => clearInterval(id)
  }, [active, estimatedSeconds])

  if (!active) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="w-full max-w-md flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
        <h3 className="text-white text-lg font-bold">AI is redesigning your room</h3>
        <p className="text-gray-400 text-sm">{phase}</p>
        <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-500 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-gray-500 text-xs">~{estimatedSeconds}s · {progress}%</p>
        <p className="text-gray-500 text-xs mt-3 leading-relaxed">
          Your designs are saved automatically.<br />
          Close this page anytime — find results in{' '}
          <Link href="/history" className="text-amber-400 underline hover:text-amber-300">History</Link>.
        </p>
      </div>
    </div>
  )
}
