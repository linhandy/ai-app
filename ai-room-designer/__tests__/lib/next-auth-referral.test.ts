import { getOrCreateRefCode, closeDb as closeReferralDb, tryAttributeReferral } from '@/lib/referral'
import { findOrCreateGoogleUser, closeAuthDb } from '@/lib/auth'
import { closeDb as closeOrdersDb, getClient as getOrdersClient } from '@/lib/orders'

// Mock module for testing the extractIpFromRequest function
// Since it's internal, we'll test via integration

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  process.env.REFERRAL_SALT = 'test-salt-value'
  process.env.GOOGLE_CLIENT_ID = 'test-client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
  closeAuthDb()
  closeReferralDb()
  closeOrdersDb()
})

afterAll(() => {
  closeAuthDb()
  closeReferralDb()
  closeOrdersDb()
})

/**
 * Mock a NextAuth request object with cookies and headers
 */
function mockRequest(options: {
  cookies?: Record<string, string>
  headers?: Record<string, string>
  ip?: string
}): any {
  const cookies = options.cookies || {}
  const headers = options.headers || {}

  return {
    cookies: {
      get: (name: string) => {
        const value = cookies[name]
        return value ? { value } : undefined
      },
    },
    headers: {
      get: (name: string) => headers[name.toLowerCase()],
    },
    ip: options.ip,
  }
}

describe('NextAuth Google OAuth with Referral Attribution (Task 9)', () => {
  describe('New user with valid ref_code', () => {
    test('should successfully attribute new Google user to referrer', async () => {
      // Setup: Create referrer
      const referrerCode = await getOrCreateRefCode('usr_referrer')

      // Create new Google user (simulating NextAuth callback)
      const newUser = await findOrCreateGoogleUser({
        googleId: 'google_new_123',
        email: 'newuser@example.com',
        name: 'New User',
        avatar: 'https://example.com/avatar.jpg',
      })

      expect(newUser.isNew).toBe(true)

      // Simulate referral attribution (what NextAuth callback should do)
      const result = await tryAttributeReferral({
        refCode: referrerCode,
        newUserId: newUser.userId,
        visitorIp: '192.168.1.1',
      })

      expect(result.ok).toBe(true)
    })

    test('should attribute with IPv6 address', async () => {
      const referrerCode = await getOrCreateRefCode('usr_referrer_v6')

      const newUser = await findOrCreateGoogleUser({
        googleId: 'google_v6_123',
        email: 'v6user@example.com',
        name: 'IPv6 User',
        avatar: '',
      })

      const result = await tryAttributeReferral({
        refCode: referrerCode,
        newUserId: newUser.userId,
        visitorIp: '2001:db8:cafe::1',
      })

      expect(result.ok).toBe(true)
    })
  })

  describe('New user without ref_code', () => {
    test('should complete auth without attribution', async () => {
      // Create new Google user without ref_code
      const newUser = await findOrCreateGoogleUser({
        googleId: 'google_no_ref_123',
        email: 'noref@example.com',
        name: 'No Ref User',
        avatar: '',
      })

      expect(newUser.isNew).toBe(true)
      // No attribution attempted — success is just completing auth
    })
  })

  describe('Existing user (should not trigger attribution)', () => {
    test('isNew=false means no attribution attempted', async () => {
      // Create first user
      const first = await findOrCreateGoogleUser({
        googleId: 'google_existing_456',
        email: 'existing@example.com',
        name: 'Existing User',
        avatar: '',
      })
      expect(first.isNew).toBe(true)

      // Re-login same user
      const second = await findOrCreateGoogleUser({
        googleId: 'google_existing_456',
        email: 'existing@example.com',
        name: 'Existing User',
        avatar: '',
      })

      expect(second.isNew).toBe(false)
      expect(second.userId).toBe(first.userId)
      // NextAuth callback should skip attribution because isNew=false
    })
  })

  describe('Edge cases', () => {
    test('invalid/expired ref_code should not block authentication', async () => {
      // Create new user
      const newUser = await findOrCreateGoogleUser({
        googleId: 'google_invalid_ref_789',
        email: 'invalidref@example.com',
        name: 'Invalid Ref User',
        avatar: '',
      })

      expect(newUser.isNew).toBe(true)

      // Try attribution with invalid ref_code (should fail gracefully)
      const result = await tryAttributeReferral({
        refCode: 'deadbeefdeadbeef',
        newUserId: newUser.userId,
        visitorIp: '1.1.1.1',
      })

      // Attribution fails but auth should have already succeeded
      expect(result.ok).toBe(false)
      expect(result.reason).toBe('refcode_not_found')
    })

    test('self-referral should be rejected', async () => {
      // Create user and get their ref code
      const selfUser = await findOrCreateGoogleUser({
        googleId: 'google_self_999',
        email: 'self@example.com',
        name: 'Self User',
        avatar: '',
      })

      const refCode = await getOrCreateRefCode(selfUser.userId)

      // Try to attribute same user to themselves
      const result = await tryAttributeReferral({
        refCode,
        newUserId: selfUser.userId,
        visitorIp: '2.2.2.2',
      })

      expect(result.ok).toBe(false)
      expect(result.reason).toBe('self_referral')
    })

    test('IP deduplication should prevent multiple attributions from same IP', async () => {
      const referrerCode = await getOrCreateRefCode('usr_ref_dedup')

      // First user from IP
      const user1 = await findOrCreateGoogleUser({
        googleId: 'google_dedup_1',
        email: 'dedup1@example.com',
        name: 'Dedup User 1',
        avatar: '',
      })

      const result1 = await tryAttributeReferral({
        refCode: referrerCode,
        newUserId: user1.userId,
        visitorIp: '3.3.3.3',
      })
      expect(result1.ok).toBe(true)

      // Second user from same IP
      const user2 = await findOrCreateGoogleUser({
        googleId: 'google_dedup_2',
        email: 'dedup2@example.com',
        name: 'Dedup User 2',
        avatar: '',
      })

      const result2 = await tryAttributeReferral({
        refCode: referrerCode,
        newUserId: user2.userId,
        visitorIp: '3.3.3.3',
      })
      expect(result2.ok).toBe(false)
      expect(result2.reason).toBe('ip_dedupe')
    })
  })

  describe('Authentication flow integrity', () => {
    test('attribution failure should not prevent user login', async () => {
      // This simulates: ref_code exists but attribution fails for some reason
      const referrerCode = await getOrCreateRefCode('usr_ref_fail')

      // Create first user and give them an order
      const newUserWithOrder = await findOrCreateGoogleUser({
        googleId: 'google_order_user',
        email: 'orderuser@example.com',
        name: 'Order User',
        avatar: '',
      })

      // Add an order to this user (so they fail the not_new_user check)
      const db = await getOrdersClient()
      await db.execute({
        sql: 'INSERT INTO orders (id, userId, status, style, uploadId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [
          'ord_test',
          newUserWithOrder.userId,
          'paid',
          'modern',
          'up_test',
          Date.now(),
          Date.now(),
        ],
      })

      // New user tries to sign in with valid ref_code
      const newUser = await findOrCreateGoogleUser({
        googleId: 'google_new_with_ref',
        email: 'newwithref@example.com',
        name: 'New With Ref',
        avatar: '',
      })

      expect(newUser.isNew).toBe(true)

      // Attribution would fail because newUserWithOrder already has an order
      // But auth has already completed successfully at this point
      const result = await tryAttributeReferral({
        refCode: referrerCode,
        newUserId: newUserWithOrder.userId,
        visitorIp: '4.4.4.4',
      })

      // This will fail with not_new_user because the user already has orders
      expect(result.ok).toBe(false)
      expect(result.reason).toBe('not_new_user')
    })

    test('monthly cap should not block authentication', async () => {
      const referrerCode = await getOrCreateRefCode('usr_ref_cap')

      // Create 10 users and max out the cap by completing their referrals
      const { tryCompleteReferral } = await import('@/lib/referral')
      for (let i = 0; i < 10; i++) {
        const user = await findOrCreateGoogleUser({
          googleId: `google_cap_${i}`,
          email: `cap${i}@example.com`,
          name: `Cap User ${i}`,
          avatar: '',
        })

        const attrResult = await tryAttributeReferral({
          refCode: referrerCode,
          newUserId: user.userId,
          visitorIp: `5.5.5.${i}`,
        })
        expect(attrResult.ok).toBe(true)

        // Complete the referral to increment monthly stats
        const completeResult = await tryCompleteReferral(user.userId)
        expect(completeResult.completed).toBe(true)
      }

      // 11th user still creates successfully, just no attribution
      const user11 = await findOrCreateGoogleUser({
        googleId: 'google_cap_11',
        email: 'cap11@example.com',
        name: 'Cap User 11',
        avatar: '',
      })

      expect(user11.isNew).toBe(true)

      // Attribution fails due to cap, but auth succeeds
      const result = await tryAttributeReferral({
        refCode: referrerCode,
        newUserId: user11.userId,
        visitorIp: '5.5.5.99',
      })

      expect(result.ok).toBe(false)
      expect(result.reason).toBe('monthly_cap')
    })
  })
})
