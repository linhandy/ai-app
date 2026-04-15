// Tests the subscription upsert logic triggered by webhook events
import { upsertSubscription, getSubscription, closeSubscriptionDb } from '@/lib/subscription'
import { closeDb } from '@/lib/orders'

beforeEach(() => {
  process.env.TURSO_DATABASE_URL = ':memory:'
  closeDb()
  closeSubscriptionDb()
})

afterEach(() => {
  closeDb()
  closeSubscriptionDb()
})

describe('subscription upsert on webhook events', () => {
  it('creates subscription on customer.subscription.created', async () => {
    await upsertSubscription({
      userId: 'user_hook_1',
      stripeCustomerId: 'cus_hook_1',
      stripeSubscriptionId: 'sub_hook_1',
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const sub = await getSubscription('user_hook_1')
    expect(sub.plan).toBe('pro')
    expect(sub.status).toBe('active')
  })

  it('resets generationsUsed on billing cycle renewal', async () => {
    // Create subscription with some usage
    await upsertSubscription({
      userId: 'user_hook_2',
      stripeCustomerId: 'cus_hook_2',
      stripeSubscriptionId: 'sub_hook_2',
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const { incrementGenerationsUsed } = await import('@/lib/subscription')
    await incrementGenerationsUsed('user_hook_2')
    await incrementGenerationsUsed('user_hook_2')

    // Simulate renewal: update with resetGenerations=true
    await upsertSubscription({
      userId: 'user_hook_2',
      stripeCustomerId: 'cus_hook_2',
      stripeSubscriptionId: 'sub_hook_2',
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000 * 31,
      resetGenerations: true,
    })

    const sub = await getSubscription('user_hook_2')
    expect(sub.generationsUsed).toBe(0)
  })

  it('marks subscription as canceled', async () => {
    await upsertSubscription({
      userId: 'user_hook_3',
      stripeCustomerId: 'cus_hook_3',
      stripeSubscriptionId: 'sub_hook_3',
      plan: 'unlimited',
      status: 'canceled',
      currentPeriodEnd: Date.now() - 1000,
    })
    const sub = await getSubscription('user_hook_3')
    expect(sub.plan).toBe('free')  // expired → falls back to free
  })
})
