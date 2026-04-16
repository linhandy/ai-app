import { getSubscription, upsertSubscription, incrementGenerationsUsed, closeSubscriptionDb } from '@/lib/subscription'
import { closeDb } from '@/lib/orders'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  closeDb()
  closeSubscriptionDb()
})

afterEach(() => {
  closeDb()
  closeSubscriptionDb()
})

describe('getSubscription', () => {
  it('returns free tier defaults for user with no subscription record', async () => {
    const sub = await getSubscription('user_unknown')
    expect(sub.plan).toBe('free')
    expect(sub.generationsLimit).toBe(3)
    expect(sub.generationsUsed).toBe(0)
    expect(sub.generationsLeft).toBe(3)
    expect(sub.hasWatermark).toBe(false)
  })

  it('returns unlimited for active unlimited plan', async () => {
    await upsertSubscription({
      userId: 'user_1',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      plan: 'unlimited',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const sub = await getSubscription('user_1')
    expect(sub.plan).toBe('unlimited')
    expect(sub.generationsLimit).toBe(-1)
    expect(sub.generationsLeft).toBe(Infinity)
    expect(sub.hasWatermark).toBe(false)
  })

  it('returns pro limits correctly', async () => {
    await upsertSubscription({
      userId: 'user_2',
      stripeCustomerId: 'cus_2',
      stripeSubscriptionId: 'sub_2',
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    await incrementGenerationsUsed('user_2')
    await incrementGenerationsUsed('user_2')
    const sub = await getSubscription('user_2')
    expect(sub.plan).toBe('pro')
    expect(sub.generationsLimit).toBe(150)
    expect(sub.generationsUsed).toBe(2)
    expect(sub.generationsLeft).toBe(148)
    expect(sub.hasWatermark).toBe(false)
  })

  it('treats canceled subscription as free tier', async () => {
    await upsertSubscription({
      userId: 'user_3',
      stripeCustomerId: 'cus_3',
      stripeSubscriptionId: 'sub_3',
      plan: 'pro',
      status: 'canceled',
      currentPeriodEnd: Date.now() - 1000,  // expired
    })
    const sub = await getSubscription('user_3')
    expect(sub.plan).toBe('free')
    expect(sub.hasWatermark).toBe(false)
  })
})
