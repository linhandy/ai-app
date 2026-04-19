import { getSubscription, upsertSubscription, incrementGenerationsUsed, closeSubscriptionDb, addBonusGenerationsBy, MAX_BONUS_GENERATIONS } from '@/lib/subscription'
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

  it('returns 500/month cap for active unlimited plan (fair use)', async () => {
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
    expect(sub.generationsLimit).toBe(500)
    expect(sub.generationsLeft).toBe(500)
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

  it('persists dailyFreeUsed and lastFreeResetDate columns after first call', async () => {
    await getSubscription('user_col_test')
    const { getClient } = await import('@/lib/orders')
    const db = await getClient()
    const result = await db.execute({
      sql: 'SELECT dailyFreeUsed, lastFreeResetDate FROM subscriptions WHERE userId = ?',
      args: ['user_col_test'],
    })
    expect(result.columns).toContain('dailyFreeUsed')
    expect(result.columns).toContain('lastFreeResetDate')
  })

  it('free user with no record today gets 3 generations left', async () => {
    const sub = await getSubscription('user_daily_new')
    expect(sub.plan).toBe('free')
    expect(sub.generationsLeft).toBe(3)
    expect(sub.generationsLimit).toBe(3)
  })

  it('free user who used 2 today has 1 left', async () => {
    // Trigger migration to create columns
    await getSubscription('user_temp')
    const client = await (await import('@/lib/orders')).getClient()
    const today = new Date().toISOString().slice(0, 10)
    await client.execute({
      sql: `INSERT INTO subscriptions
            (id, userId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd,
             generationsUsed, dailyFreeUsed, lastFreeResetDate, createdAt)
            VALUES ('sub_d1', 'user_daily_used2', '', '', 'free', 'active', ?, 2, 2, ?, ?)`,
      args: [Date.now() - 1000, today, Date.now()],
    })
    const sub = await getSubscription('user_daily_used2')
    expect(sub.generationsLeft).toBe(1)
    expect(sub.generationsUsed).toBe(2)
  })

  it('free user with stale date (yesterday) gets full 3 today', async () => {
    // Trigger migration to create columns
    await getSubscription('user_temp2')
    const client = await (await import('@/lib/orders')).getClient()
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10)
    await client.execute({
      sql: `INSERT INTO subscriptions
            (id, userId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd,
             generationsUsed, dailyFreeUsed, lastFreeResetDate, createdAt)
            VALUES ('sub_d2', 'user_daily_stale', '', '', 'free', 'active', ?, 3, 3, ?, ?)`,
      args: [Date.now() - 1000, yesterday, Date.now()],
    })
    const sub = await getSubscription('user_daily_stale')
    expect(sub.generationsLeft).toBe(3)
    expect(sub.generationsUsed).toBe(0)
  })
})

describe('incrementGenerationsUsed daily', () => {
  it('new free user starts at 1 used after first increment', async () => {
    await incrementGenerationsUsed('user_inc_new')
    const sub = await getSubscription('user_inc_new')
    expect(sub.generationsUsed).toBe(1)
    expect(sub.generationsLeft).toBe(2)
  })

  it('free user increments dailyFreeUsed within same day', async () => {
    await incrementGenerationsUsed('user_inc_same')
    await incrementGenerationsUsed('user_inc_same')
    const sub = await getSubscription('user_inc_same')
    expect(sub.generationsUsed).toBe(2)
    expect(sub.generationsLeft).toBe(1)
  })

  it('free user gets dailyFreeUsed reset to 1 when date changes', async () => {
    // Trigger migration to create columns
    await getSubscription('user_temp3')
    const client = await (await import('@/lib/orders')).getClient()
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10)
    await client.execute({
      sql: `INSERT INTO subscriptions
            (id, userId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd,
             generationsUsed, dailyFreeUsed, lastFreeResetDate, createdAt)
            VALUES ('sub_inc_stale', 'user_inc_stale', '', '', 'free', 'active', ?, 3, 3, ?, ?)`,
      args: [Date.now() - 1000, yesterday, Date.now()],
    })
    await incrementGenerationsUsed('user_inc_stale')
    const sub = await getSubscription('user_inc_stale')
    expect(sub.generationsUsed).toBe(1)
    expect(sub.generationsLeft).toBe(2)
  })
})

describe('addBonusGenerationsBy', () => {
  test('adds N bonus generations and returns N', async () => {
    const added = await addBonusGenerationsBy('usr_bonus1', 2)
    expect(added).toBe(2)
    const sub = await getSubscription('usr_bonus1')
    expect(sub.generationsLeft).toBe(3 + 2) // free 3 + bonus 2
  })

  test('stops at MAX cap (30) and returns actual count added', async () => {
    const first = await addBonusGenerationsBy('usr_bonus2', MAX_BONUS_GENERATIONS - 2)
    expect(first).toBe(MAX_BONUS_GENERATIONS - 2)
    const second = await addBonusGenerationsBy('usr_bonus2', 5)
    expect(second).toBe(2) // cap is MAX_BONUS_GENERATIONS, we only add 2 more
  })

  test('returns 0 when already at cap', async () => {
    await addBonusGenerationsBy('usr_bonus3', MAX_BONUS_GENERATIONS)
    const added = await addBonusGenerationsBy('usr_bonus3', 3)
    expect(added).toBe(0)
  })

  test('returns 0 and does not mutate for non-positive or non-finite count', async () => {
    const a = await addBonusGenerationsBy('usr_bonus4', 0)
    const b = await addBonusGenerationsBy('usr_bonus4', -5)
    const c = await addBonusGenerationsBy('usr_bonus4', Number.NaN)
    const d = await addBonusGenerationsBy('usr_bonus4', Number.POSITIVE_INFINITY)
    expect(a).toBe(0)
    expect(b).toBe(0)
    expect(c).toBe(0)
    expect(d).toBe(0)

    // Verify no subscription row was created (no side effects)
    const sub = await getSubscription('usr_bonus4')
    expect(sub.plan).toBe('free')
    expect(sub.generationsLeft).toBe(3) // default free tier
  })
})
