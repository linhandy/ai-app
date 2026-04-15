import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerSession } from '@/lib/auth'
import { ERR } from '@/lib/errors'
import { getClient } from '@/lib/orders'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }

export async function GET(req: NextRequest) {
  const session = await getServerSession(req)
  if (!session) return NextResponse.json({ error: ERR.authRequired }, { status: 401 })

  // Look up stripeCustomerId
  const client = await getClient()
  const result = await client.execute({
    sql: 'SELECT stripeCustomerId FROM subscriptions WHERE userId = ? LIMIT 1',
    args: [session.userId],
  })
  const stripeCustomerId = result.rows[0]?.stripeCustomerId as string | undefined
  if (!stripeCustomerId) return NextResponse.redirect(new URL('/pricing', req.url))

  const stripe = getStripe()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${baseUrl}/account`,
  })

  return NextResponse.redirect(portalSession.url)
}
