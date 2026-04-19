'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const PLANS = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    generationsBadge: '3 / day',
    features: ['3 designs / day', '1024px preview resolution', 'Watermarked output', 'For exploring the style library', 'All 40+ styles & room types'],
    cta: 'Start Free',
    ctaHref: '/generate',
    plan: null as string | null,
    badgeColor: 'bg-gray-700 text-gray-300',
    priceColor: 'text-white',
    cardClass: 'border-gray-800 bg-[#0D0D0D]',
  },
  {
    name: 'Pro',
    monthlyPrice: 9.99,
    yearlyPrice: 7.99,
    generationsBadge: '150 / month',
    features: ['150 designs / month', 'Up to 4096px Ultra resolution', 'No watermark', 'Commercial license', '⚡ Batch 8 styles at once', 'All 40+ styles & room types'],
    cta: 'Upgrade to Pro',
    ctaHref: null,
    plan: 'pro' as string | null,
    highlight: true,
    badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
    priceColor: 'text-amber-400',
    cardClass: 'border-amber-500 bg-amber-950/20',
  },
  {
    name: 'Unlimited',
    monthlyPrice: 19.99,
    yearlyPrice: 15.99,
    generationsBadge: '500 / month',
    features: ['500 designs / month', 'All Pro features', 'Priority rendering queue', 'Everything in Pro included', 'For power users'],
    footnote: '* Fair use: up to 500 generations per month',
    cta: 'Go Unlimited',
    ctaHref: null,
    plan: 'unlimited' as string | null,
    badgeColor: 'bg-purple-500/20 text-purple-400 border border-purple-500/40',
    priceColor: 'text-purple-400',
    cardClass: 'border-purple-600/50 bg-purple-950/10',
  },
]

export default function PricingCards() {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')
  const [loading, setLoading] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'unlimited' | null>(null)

  useEffect(() => {
    fetch('/api/quota')
      .then((r) => r.json())
      .then((d) => {
        if (d.plan === 'pro' || d.plan === 'unlimited' || d.plan === 'free') {
          setCurrentPlan(d.plan)
        }
      })
      .catch(() => {})
  }, [])

  const planRank: Record<string, number> = { free: 0, pro: 1, unlimited: 2 }
  const isCurrent = (plan: string | null) => !!plan && plan === currentPlan
  const isDowngrade = (plan: string | null) =>
    !!plan && !!currentPlan && planRank[plan] < planRank[currentPlan]

  async function handleUpgrade(plan: string) {
    setLoading(plan)
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, interval: billingInterval }),
    })
    const data = await res.json()
    if (data.error === 'authRequired') {
      window.location.href = '/api/auth/signin?callbackUrl=' + encodeURIComponent('/pricing')
      return
    }
    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Payment setup failed. Please try again.')
      setLoading(null)
    }
  }

  return (
    <>
      {/* Billing interval toggle */}
      <div className="flex items-center gap-1 bg-gray-900 rounded-full p-1">
        <button
          onClick={() => setBillingInterval('month')}
          className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-colors ${billingInterval === 'month' ? 'bg-white text-black' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingInterval('year')}
          className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5 ${billingInterval === 'year' ? 'bg-white text-black' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Yearly
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${billingInterval === 'year' ? 'bg-amber-500 text-black' : 'bg-amber-500/20 text-amber-400'}`}>
            −20%
          </span>
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl">
        {PLANS.map((p) => {
          const price = billingInterval === 'month' ? p.monthlyPrice : p.yearlyPrice
          return (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl p-6 border-2 gap-5 ${p.cardClass}`}
            >
              {p.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  Most Popular
                </div>
              )}

              {/* Plan name + generation badge */}
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-lg">{p.name}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.badgeColor}`}>
                  {p.generationsBadge}
                </span>
              </div>

              {/* Price */}
              <div className="flex items-end gap-1">
                <span className={`text-4xl font-bold leading-none ${p.priceColor}`}>
                  ${price}
                </span>
                {price > 0 && (
                  <span className="text-gray-500 text-sm mb-0.5">/ mo</span>
                )}
                {price === 0 && (
                  <span className="text-gray-500 text-sm mb-0.5">forever free</span>
                )}
              </div>
              {billingInterval === 'year' && price > 0 && (
                <p className="text-gray-500 text-xs -mt-3">
                  Billed ${(price * 12).toFixed(0)}/year
                </p>
              )}

              {/* Features */}
              <ul className="flex flex-col gap-2.5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className={`mt-0.5 shrink-0 ${p.highlight ? 'text-amber-500' : p.plan === 'unlimited' ? 'text-purple-400' : 'text-green-500'}`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {'footnote' in p && p.footnote && (
                <p className="text-gray-500 text-[11px] leading-snug -mt-2">{p.footnote}</p>
              )}

              {/* CTA */}
              {(() => {
                const current = isCurrent(p.plan)
                const downgrade = isDowngrade(p.plan)
                if (current) {
                  return (
                    <button
                      disabled
                      className="h-11 rounded-xl font-semibold text-sm bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-700"
                    >
                      Current Plan
                    </button>
                  )
                }
                if (downgrade) {
                  return (
                    <a
                      href="/api/stripe/portal"
                      className="flex items-center justify-center h-11 rounded-xl font-semibold text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors border border-gray-700"
                    >
                      Manage Billing
                    </a>
                  )
                }
                if (p.ctaHref) {
                  return (
                    <Link
                      href={p.ctaHref}
                      className="flex items-center justify-center h-11 rounded-xl font-semibold text-sm bg-white/10 text-white hover:bg-white/15 transition-colors"
                    >
                      {p.cta}
                    </Link>
                  )
                }
                return (
                  <button
                    onClick={() => handleUpgrade(p.plan!)}
                    disabled={loading === p.plan}
                    className={`h-11 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${
                      p.highlight
                        ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-[0_4px_16px_rgba(245,158,11,0.3)]'
                        : p.plan === 'unlimited'
                          ? 'bg-purple-600 text-white hover:bg-purple-500'
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    {loading === p.plan ? 'Loading...' : p.cta}
                  </button>
                )
              })()}
            </div>
          )
        })}
      </div>
    </>
  )
}
