import { getSubscription, upsertSubscription, closeSubscriptionDb } from '@/lib/subscription'
import { closeDb } from '@/lib/orders'

beforeEach(() => {
  process.env.TURSO_DATABASE_URL = ':memory:'
  process.env.REGION = 'overseas'
  closeDb()
  closeSubscriptionDb()
})

afterEach(() => {
  closeDb()
  closeSubscriptionDb()
  delete process.env.REGION
})

describe('subscription gate for overseas order creation', () => {
  it('free user with 0 used can generate (generationsLeft > 0)', async () => {
    const sub = await getSubscription('free_user')
    expect(sub.generationsLeft).toBeGreaterThan(0)
  })

  it('free user at limit cannot generate (generationsLeft === 0)', async () => {
    await upsertSubscription({
      userId: 'free_maxed',
      stripeCustomerId: '',
      stripeSubscriptionId: '',
      plan: 'free',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const client = (await import('@/lib/orders')).getClient
    const db = await client()
    await db.execute({ sql: 'UPDATE subscriptions SET generationsUsed = 3 WHERE userId = ?', args: ['free_maxed'] })

    const sub = await getSubscription('free_maxed')
    expect(sub.generationsLeft).toBe(0)
  })

  it('unlimited plan always has generationsLeft as Infinity', async () => {
    await upsertSubscription({
      userId: 'unlimited_user',
      stripeCustomerId: 'cus_x',
      stripeSubscriptionId: 'sub_x',
      plan: 'unlimited',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const sub = await getSubscription('unlimited_user')
    expect(sub.generationsLeft).toBe(Infinity)
  })
})
