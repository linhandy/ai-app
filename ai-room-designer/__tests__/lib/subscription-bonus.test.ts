jest.mock('@/lib/storage', () => ({
  downloadFromStorage: jest.fn().mockResolvedValue(null),
  uploadStoragePath: jest.fn((id: string) => `uploads/${id}`),
  uploadToStorage: jest.fn().mockResolvedValue(undefined),
  resultStoragePath: jest.fn((id: string) => `results/${id}`),
}))

import { getSubscription, addBonusGeneration, closeSubscriptionDb } from '@/lib/subscription'
import { closeDb } from '@/lib/orders'

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

describe('bonus generations', () => {
  it('free user gets bonus added to generationsLeft', async () => {
    const before = await getSubscription('bonus_user')
    expect(before.generationsLeft).toBe(3)

    await addBonusGeneration('bonus_user')
    const after = await getSubscription('bonus_user')
    expect(after.generationsLeft).toBe(4)
  })

  it('bonus capped at 5', async () => {
    for (let i = 0; i < 7; i++) {
      await addBonusGeneration('capped_user')
    }
    const sub = await getSubscription('capped_user')
    // Free: 3 base + 5 bonus cap = 8 max
    expect(sub.generationsLeft).toBe(8)
  })
})
