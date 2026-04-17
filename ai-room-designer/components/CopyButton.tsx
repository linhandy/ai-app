'use client'

import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="shrink-0 bg-amber-500 text-black text-sm font-semibold px-4 h-10 rounded hover:bg-amber-400 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
