'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function CreditWidget() {
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/credits/balance')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(d => { if (d != null) setBalance(d.balance ?? 0) })
      .catch((err) => { console.error('[CreditWidget] balance fetch failed:', err) })
  }, [])

  if (balance === null) return null

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-400 text-xs font-semibold">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" />
        </svg>
        {balance} 次
      </div>
      {balance <= 1 && (
        <Link
          href="/#pricing"
          className="px-3 h-8 rounded-full bg-amber-500 text-black text-xs font-bold flex items-center hover:bg-amber-400 transition-colors"
        >
          充值
        </Link>
      )}
    </div>
  )
}
