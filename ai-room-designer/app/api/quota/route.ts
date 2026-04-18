import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { getSubscription } from '@/lib/subscription'

function tomorrowUtcMidnightMs(): number {
  const now = new Date()
  const tmr = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return tmr.getTime()
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(req)
  if (!session) {
    return NextResponse.json({
      plan: null,
      generationsLeft: null,
      generationsLimit: null,
      generationsUsed: null,
      resetType: null,
      nextResetAt: null,
    })
  }

  const sub = await getSubscription(session.userId)
  const isFree = sub.plan === 'free'
  const resetType: 'daily' | 'monthly' = isFree ? 'daily' : 'monthly'
  const nextResetAt = isFree ? tomorrowUtcMidnightMs() : null

  return NextResponse.json({
    plan: sub.plan,
    generationsLeft: sub.generationsLeft,
    generationsLimit: sub.generationsLimit,
    generationsUsed: sub.generationsUsed,
    resetType,
    nextResetAt,
  })
}
