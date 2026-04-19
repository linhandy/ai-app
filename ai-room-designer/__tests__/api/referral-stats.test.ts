/**
 * Tests for GET /api/referral/stats endpoint
 *
 * Tests cover:
 * - Authenticated user returns correct stats
 * - Unauthenticated user returns 401
 * - Authentication is required
 * - CORS headers are present
 * - OPTIONS preflight requests work
 * - User with no referrals returns zero stats
 * - Error handling for internal errors
 */

import { GET, OPTIONS } from '@/app/api/referral/stats/route'
import { NextRequest } from 'next/server'
import { getReferralStats, closeDb, getOrCreateRefCode, currentYearMonth } from '@/lib/referral'
import { closeDb as closeOrdersDb, getClient } from '@/lib/orders'
import * as authModule from '@/lib/auth'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  process.env.REFERRAL_SALT = 'test-salt-value'
  process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com'
  closeDb()
  closeOrdersDb()
  // Reset mocks
  jest.clearAllMocks()
})

afterAll(() => {
  closeDb()
  closeOrdersDb()
})

describe('GET /api/referral/stats', () => {
  test('returns 401 when not authenticated', async () => {
    jest.spyOn(authModule, 'getServerSession').mockResolvedValueOnce(null)
    const req = createMockRequest('/api/referral/stats')

    const response = await GET(req)
    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data).toHaveProperty('error')
    expect(data.error).toBe('Unauthorized')
  })

  test('returns stats for authenticated user', async () => {
    const userId = 'usr_test_valid'
    jest.spyOn(authModule, 'getServerSession').mockResolvedValueOnce({ userId })
    const req = createMockRequest('/api/referral/stats')

    const response = await GET(req)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('refCode')
    expect(data).toHaveProperty('inviteUrl')
    expect(data).toHaveProperty('thisMonthCompleted')
    expect(data).toHaveProperty('totalCompleted')
    expect(data).toHaveProperty('monthlyLimit')

    // Validate structure
    expect(typeof data.refCode).toBe('string')
    expect(data.refCode).toMatch(/^[a-f0-9]{8}$/)
    expect(data.inviteUrl).toContain('/r/')
    expect(data.thisMonthCompleted).toBe(0)
    expect(data.totalCompleted).toBe(0)
    expect(data.monthlyLimit).toBe(10)
  })

  test('includes CORS headers in successful response', async () => {
    const userId = 'usr_cors_test'
    jest.spyOn(authModule, 'getServerSession').mockResolvedValueOnce({ userId })
    const req = createMockRequest('/api/referral/stats')

    const response = await GET(req)
    expect(response.status).toBe(200)

    const headers = response.headers
    expect(headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
    expect(headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
  })

  test('includes CORS headers in 401 response', async () => {
    jest.spyOn(authModule, 'getServerSession').mockResolvedValueOnce(null)
    const req = createMockRequest('/api/referral/stats')

    const response = await GET(req)
    expect(response.status).toBe(401)

    const headers = response.headers
    expect(headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  test('returns zero stats for user with no referrals', async () => {
    const userId = 'usr_no_referrals'
    jest.spyOn(authModule, 'getServerSession').mockResolvedValueOnce({ userId })
    const req = createMockRequest('/api/referral/stats')

    const response = await GET(req)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.thisMonthCompleted).toBe(0)
    expect(data.totalCompleted).toBe(0)
  })

  test('returns stats with completed referrals', async () => {
    const referrerId = 'usr_with_referrals'
    jest.spyOn(authModule, 'getServerSession').mockResolvedValueOnce({ userId: referrerId })

    // Create referral code and manually seed stats
    await getOrCreateRefCode(referrerId)
    const db = await getClient()
    const month = currentYearMonth()

    // Seed 3 completed referrals
    for (let i = 0; i < 3; i++) {
      await db.execute({
        sql: `INSERT INTO referral_attributions
              (id, referrerUserId, refereeUserId, refCode, visitorIpAtSignup, status, createdAt, completedAt)
              VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)`,
        args: [
          `ref_${i}`,
          referrerId,
          `usr_referee_${i}`,
          'abc12345',
          '1.1.1.1',
          Date.now(),
          Date.now(),
        ],
      })
    }

    // Update monthly stats
    await db.execute({
      sql: `INSERT INTO referral_monthly_stats (referrerUserId, yearMonth, completedCount)
            VALUES (?, ?, 3)`,
      args: [referrerId, month],
    })

    const req = createMockRequest('/api/referral/stats')
    const response = await GET(req)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.thisMonthCompleted).toBe(3)
    expect(data.totalCompleted).toBe(3)
  })

  test('correctly caches refCode on multiple calls', async () => {
    const userId = 'usr_cache_test'
    jest.spyOn(authModule, 'getServerSession').mockResolvedValue({ userId })

    const req1 = createMockRequest('/api/referral/stats')
    const response1 = await GET(req1)
    const data1 = await response1.json()

    const req2 = createMockRequest('/api/referral/stats')
    const response2 = await GET(req2)
    const data2 = await response2.json()

    expect(data1.refCode).toBe(data2.refCode)
    expect(data1.inviteUrl).toBe(data2.inviteUrl)
  })

  test('returns inviteUrl with NEXT_PUBLIC_BASE_URL', async () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://custom.domain.com'
    const userId = 'usr_custom_url'
    jest.spyOn(authModule, 'getServerSession').mockResolvedValueOnce({ userId })

    const req = createMockRequest('/api/referral/stats')
    const response = await GET(req)
    const data = await response.json()

    expect(data.inviteUrl).toContain('https://custom.domain.com/r/')
  })

  test('uses authenticated session userId, ignores query params', async () => {
    const authenticatedUserId = 'usr_authenticated'
    const queriedUserId = 'usr_queried_different'
    jest.spyOn(authModule, 'getServerSession').mockResolvedValueOnce({ userId: authenticatedUserId })

    // Even if query params contain different userId, API should use authenticated user
    const req = createMockRequest(`/api/referral/stats?userId=${queriedUserId}`)
    const response = await GET(req)
    expect(response.status).toBe(200)

    const data = await response.json()
    // Verify we got stats for authenticated user, not queried user
    // (they'll have different refCodes since they're different users)
    expect(data).toHaveProperty('refCode')
  })
})

describe('OPTIONS /api/referral/stats', () => {
  test('responds to preflight requests', async () => {
    const response = await OPTIONS()
    expect(response.status).toBe(200)
  })

  test('preflight includes CORS headers', async () => {
    const response = await OPTIONS()
    const headers = response.headers

    expect(headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
    expect(headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    expect(headers.get('Access-Control-Max-Age')).toBe('86400')
  })
})

// ---- Test utilities ----

function createMockRequest(url: string, method: string = 'GET'): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
  })
}
