jest.mock('@/lib/storage', () => ({
  downloadFromStorage: jest.fn().mockResolvedValue(null),
  uploadStoragePath: jest.fn((id: string) => `uploads/${id}`),
  uploadToStorage: jest.fn().mockResolvedValue(undefined),
  resultStoragePath: jest.fn((id: string) => `results/${id}`),
}))

import { getSubscription, upsertSubscription, closeSubscriptionDb } from '@/lib/subscription'
import { getUploadData, closeDb } from '@/lib/orders'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
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

describe('getUploadData for non-existent upload', () => {
  it('returns null when upload does not exist in DB or Storage', async () => {
    const result = await getUploadData('nonexistent-upload-id')
    expect(result).toBeNull()
  })
})
