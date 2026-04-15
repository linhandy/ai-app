import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerSession } from '@/lib/auth'
import { ERR } from '@/lib/errors'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as const })

// Stripe Price IDs — set these in your Stripe dashboard, then add to env
const PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    month: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    year:  process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
  },
  unlimited: {
    month: process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID!,
    year:  process.env.STRIPE_UNLIMITED_YEARLY_PRICE_ID!,
  },
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(req)
  if (!session) return NextResponse.json({ error: ERR.authRequired }, { status: 401 })

  const { plan, interval = 'month' } = await req.json() as { plan: string; interval?: string }

  const priceId = PRICE_IDS[plan]?.[interval]
  if (!priceId) return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/account?upgraded=1`,
    cancel_url:  `${baseUrl}/pricing`,
    metadata: { userId: session.userId },
    subscription_data: { metadata: { userId: session.userId } },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
