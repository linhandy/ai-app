import { closeDb } from '@/lib/orders'
import { closeDb as closeReferralDb } from '@/lib/referral'

jest.mock('@/lib/region', () => ({ isOverseas: false }))
jest.mock('@/lib/zenmux', () => ({
  generateRoomImage: jest.fn().mockResolvedValue(Buffer.from('fake image data')),
}))
jest.mock('@/lib/storage', () => ({
  getPublicUrl: jest.fn((path) => `https://cdn.example.com/${path}`),
  resultStoragePath: jest.fn((id) => `results/${id}.png`),
  uploadStoragePath: jest.fn((id) => `uploads/${id}`),
  uploadToStorage: jest.fn().mockResolvedValue(undefined),
  downloadFromStorage: jest.fn().mockResolvedValue(null),
}))

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  process.env.REFERRAL_SALT = 'test-salt-value'
  closeDb()
  closeReferralDb()
})

afterEach(() => {
  closeDb()
  closeReferralDb()
})

describe('generate route with referral completion', () => {
  test('generate route imports tryCompleteReferral successfully', async () => {
    const routeModule = await import('@/app/api/generate/route')
    expect(routeModule.POST).toBeDefined()
    expect(typeof routeModule.POST).toBe('function')
  })

  test('tryCompleteReferral is available from referral module', async () => {
    const { tryCompleteReferral } = await import('@/lib/referral')
    expect(tryCompleteReferral).toBeDefined()
    expect(typeof tryCompleteReferral).toBe('function')
  })

  test('referral module functions work correctly', async () => {
    // This test verifies the core referral functions work as expected
    const { tryCompleteReferral, getOrCreateRefCode } = await import('@/lib/referral')
    const { getClient } = await import('@/lib/orders')

    // Create a ref code (will initialize tables)
    const refCode = await getOrCreateRefCode('referrer_test')
    expect(refCode).toMatch(/^[a-f0-9]{8}$/)

    // Create attribution manually
    const db = await getClient()
    const userId = `test_user_${Date.now()}`
    await db.execute({
      sql: `INSERT INTO referral_attributions
            (id, referrerUserId, refereeUserId, refCode, visitorIpAtSignup, status, createdAt)
            VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      args: [
        `ref_test_${Math.random().toString(16).slice(2, 10)}`,
        'referrer_test',
        userId,
        refCode,
        '1.1.1.1',
        Date.now(),
      ],
    })

    // Try to complete referral
    const result = await tryCompleteReferral(userId)
    expect(result.completed).toBe(true)
    expect(result.referrerUserId).toBe('referrer_test')
  })
})
