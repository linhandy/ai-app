'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface QuotaResponse {
  plan: 'free' | 'pro' | 'unlimited' | null
  generationsLeft: number | null
  generationsLimit: number | null
  generationsUsed: number | null
  resetType: 'daily' | 'monthly' | null
  nextResetAt: number | null
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'resetting soon'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `resets in ${h}h ${m}m`
  return `resets in ${m}m`
}

export default function FreeQuotaBanner() {
  const [data, setData] = useState<QuotaResponse | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    let cancelled = false
    fetch('/api/quota')
      .then((r) => r.json())
      .then((d: QuotaResponse) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {})
    const tick = setInterval(() => setNow(Date.now()), 60_000)
    return () => {
      cancelled = true
      clearInterval(tick)
    }
  }, [])

  if (!data || data.plan !== 'free' || data.generationsLeft == null || data.generationsLimit == null) {
    return null
  }

  const { generationsLeft, generationsLimit, nextResetAt } = data
  const used = generationsLimit - generationsLeft
  const pct = Math.min(100, Math.max(0, (used / generationsLimit) * 100))
  const exhausted = generationsLeft === 0

  return (
    <div
      role="status"
      aria-label="Daily free quota"
      className={`rounded-xl border px-4 py-3 mb-4 flex items-center gap-4 ${
        exhausted
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-gray-800 bg-[#0D0D0D]'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="text-sm text-gray-200 font-medium">
            {exhausted
              ? "Today's free quota used up"
              : `Today's free: ${generationsLeft} / ${generationsLimit}`}
          </span>
          {nextResetAt && (
            <span className="text-[11px] text-gray-500 whitespace-nowrap">
              {formatCountdown(nextResetAt - now)}
            </span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-gray-900 overflow-hidden">
          <div
            className={`h-full transition-all ${exhausted ? 'bg-amber-500' : 'bg-green-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {exhausted && (
        <Link
          href="/pricing"
          className="bg-amber-500 text-black text-xs font-semibold px-3 h-8 rounded-lg flex items-center hover:bg-amber-400 transition-colors whitespace-nowrap"
        >
          Upgrade
        </Link>
      )}
    </div>
  )
}
