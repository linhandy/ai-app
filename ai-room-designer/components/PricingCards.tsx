'use client'
import { useState } from 'react'

const PLANS = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    generations: '3/month',
    watermark: true,
    features: ['3 generations per month', 'Watermarked results', 'All room types', 'All 40+ styles'],
    cta: 'Get Started',
    plan: null as string | null,
  },
  {
    name: 'Pro',
    monthlyPrice: 9.99,
    yearlyPrice: 7.99,
    generations: '30/month',
    watermark: false,
    features: ['30 generations per month', 'No watermark', 'All room types', 'All 40+ styles', 'High-res downloads'],
    cta: 'Upgrade to Pro',
    plan: 'pro' as string | null,
    highlight: true,
  },
  {
    name: 'Unlimited',
    monthlyPrice: 19.99,
    yearlyPrice: 15.99,
    generations: 'Unlimited',
    watermark: false,
    features: ['Unlimited generations', 'No watermark', 'All room types', 'All 40+ styles', 'High-res downloads', 'Priority generation'],
    cta: 'Go Unlimited',
    plan: 'unlimited' as string | null,
  },
]

export default function PricingCards() {
  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const [loading, setLoading] = useState<string | null>(null)

  async function handleUpgrade(plan: string) {
    setLoading(plan)
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, interval }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(null)
  }

  return (
    <>
      {/* Interval toggle */}
      <div className="flex items-center gap-3 bg-gray-900 rounded-full p-1">
        <button
          onClick={() => setInterval('month')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${interval === 'month' ? 'bg-white text-black' : 'text-gray-400'}`}
        >Monthly</button>
        <button
          onClick={() => setInterval('year')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${interval === 'year' ? 'bg-white text-black' : 'text-gray-400'}`}
        >Yearly <span className="text-amber-500 text-xs">–20%</span></button>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-2xl p-6 border ${p.highlight ? 'border-amber-500 bg-amber-950/20' : 'border-gray-800 bg-gray-900'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-lg">{p.name}</span>
              {p.highlight && <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded-full font-semibold">Popular</span>}
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold">
                ${interval === 'month' ? p.monthlyPrice : p.yearlyPrice}
              </span>
              {p.monthlyPrice > 0 && <span className="text-gray-400 text-sm">/mo</span>}
            </div>
            <ul className="flex flex-col gap-2 mb-6 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-amber-500">✓</span> {f}
                </li>
              ))}
            </ul>
            {p.plan ? (
              <button
                onClick={() => handleUpgrade(p.plan!)}
                disabled={loading === p.plan}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${p.highlight ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-gray-700 text-white hover:bg-gray-600'} disabled:opacity-50`}
              >
                {loading === p.plan ? 'Loading...' : p.cta}
              </button>
            ) : (
              <button className="w-full py-2.5 rounded-lg font-semibold text-sm bg-gray-800 text-gray-300 cursor-default">
                {p.cta}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
