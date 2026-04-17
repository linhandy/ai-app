'use client'

import { useState } from 'react'

export default function GalleryOptIn({ orderId, initialOptIn }: { orderId: string; initialOptIn: boolean }) {
  const [optedIn, setOptedIn] = useState(initialOptIn)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/gallery/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, optIn: !optedIn }),
      })
      if (res.ok) setOptedIn(!optedIn)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border transition-colors ${
        optedIn
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
          : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
      }`}
    >
      <span className={`w-3 h-3 rounded-full transition-colors ${optedIn ? 'bg-amber-500' : 'bg-gray-700'}`} />
      {optedIn ? 'In public gallery' : 'Add to gallery'}
    </button>
  )
}
