import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { upsertSubscription, type SubscriptionPlan } from '@/lib/subscription'
import { logger } from '@/lib/logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as const })

export const config = { api: { bodyParser: false } }

function planFromPriceId(priceId: string): SubscriptionPlan {
  if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID ||
      priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) return 'pro'
  if (priceId === process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID ||
      priceId === process.env.STRIPE_UNLIMITED_YEARLY_PRICE_ID) return 'unlimited'
  return 'free'
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    logger.warn('stripe-webhook', 'Signature verification failed', { error: String(err) })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const sub = event.data.object as Stripe.Subscription

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const userId = sub.metadata?.userId
    if (!userId) {
      logger.warn('stripe-webhook', 'Subscription event missing userId metadata', { subscriptionId: sub.id })
      return NextResponse.json({ received: true })
    }

    const priceId = (sub.items.data[0]?.price?.id) ?? ''
    const plan = planFromPriceId(priceId)

    // Detect billing cycle renewal: stripe sends 'updated' when period advances
    const prevPeriodEnd = (event.data.previous_attributes as Record<string, unknown>)?.current_period_end
    const periodRenewed = typeof prevPeriodEnd === 'number' && prevPeriodEnd < sub.current_period_end

    await upsertSubscription({
      userId,
      stripeCustomerId: String(sub.customer),
      stripeSubscriptionId: sub.id,
      plan,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end * 1000,  // Stripe uses seconds, we use ms
      resetGenerations: periodRenewed,
    })

    logger.info('stripe-webhook', `Handled ${event.type}`, { userId, plan, status: sub.status })
  }

  return NextResponse.json({ received: true })
}
