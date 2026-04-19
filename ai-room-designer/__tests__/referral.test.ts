import {
  getOrCreateRefCode,
  lookupRefCode,
  closeDb,
  tryAttributeReferral,
  tryCompleteReferral,
  currentYearMonth,
  getMonthlyCount as getMonthlyCountLib,
  MONTHLY_CAP,
  getReferralStats,
} from '@/lib/referral'
import { closeDb as closeOrdersDb, getClient } from '@/lib/orders'

async function seedOrder(userId: string) {
  const db = await getClient()
  await db.execute({
    sql: `INSERT INTO orders (id, userId, status, style, uploadId, createdAt, updatedAt) VALUES (?, ?, 'paid', 'modern', 'up_test', ?, ?)`,
    args: [`ord_${Math.random().toString(36).slice(2)}`, userId, Date.now(), Date.now()],
  })
}

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  process.env.REFERRAL_SALT = 'test-salt-value'
  closeDb()
  closeOrdersDb()
})

afterAll(() => {
  closeDb()
  closeOrdersDb()
})

describe('getOrCreateRefCode', () => {
  test('returns 8-char hex code for user', async () => {
    const code = await getOrCreateRefCode('usr_abc')
    expect(code).toMatch(/^[a-f0-9]{8}$/)
  })

  test('is idempotent — same user returns same code', async () => {
    const a = await getOrCreateRefCode('usr_abc')
    const b = await getOrCreateRefCode('usr_abc')
    expect(a).toBe(b)
  })

  test('different users get different codes', async () => {
    const a = await getOrCreateRefCode('usr_abc')
    const b = await getOrCreateRefCode('usr_def')
    expect(a).not.toBe(b)
  })

  test('falls back to random refCode on hash collision', async () => {
    const db = await getClient()
    const cryptoMod = await import('crypto')
    const derived = cryptoMod.createHash('sha256')
      .update('usr_collision_target' + 'test-salt-value')
      .digest('hex').slice(0, 8)

    // Ensure the referral_codes table exists by calling getOrCreateRefCode for a different user first
    await getOrCreateRefCode('usr_bootstrap')

    // Insert the derived refCode under another user to force a collision
    await db.execute({
      sql: 'INSERT INTO referral_codes (refCode, userId, createdAt) VALUES (?, ?, ?)',
      args: [derived, 'usr_other', Date.now()],
    })

    // Now 'usr_collision_target' should get a random refCode, not throw
    const code = await getOrCreateRefCode('usr_collision_target')
    expect(code).toMatch(/^[a-f0-9]{8}$/)
    expect(code).not.toBe(derived)
  })
})

describe('lookupRefCode', () => {
  test('returns userId for existing refCode', async () => {
    const code = await getOrCreateRefCode('usr_abc')
    const result = await lookupRefCode(code)
    expect(result).toEqual({ userId: 'usr_abc' })
  })

  test('returns null for unknown refCode', async () => {
    const result = await lookupRefCode('deadbeef')
    expect(result).toBeNull()
  })
})

describe('tryAttributeReferral', () => {
  test('succeeds for new user with valid refCode', async () => {
    const refCode = await getOrCreateRefCode('usr_referrer')
    const result = await tryAttributeReferral({
      refCode, newUserId: 'usr_new', visitorIp: '1.2.3.4',
    })
    expect(result.ok).toBe(true)
  })

  test('fails when refCode unknown', async () => {
    const result = await tryAttributeReferral({
      refCode: 'deadbeef', newUserId: 'usr_new', visitorIp: '1.2.3.4',
    })
    expect(result).toEqual({ ok: false, reason: 'refcode_not_found' })
  })

  test('rejects self-referral', async () => {
    const refCode = await getOrCreateRefCode('usr_self')
    const result = await tryAttributeReferral({
      refCode, newUserId: 'usr_self', visitorIp: '1.2.3.4',
    })
    expect(result).toEqual({ ok: false, reason: 'self_referral' })
  })

  test('rejects user with existing order history', async () => {
    const refCode = await getOrCreateRefCode('usr_ref2')
    await seedOrder('usr_old')
    const result = await tryAttributeReferral({
      refCode, newUserId: 'usr_old', visitorIp: '1.2.3.4',
    })
    expect(result).toEqual({ ok: false, reason: 'not_new_user' })
  })

  test('rejects already-attributed user', async () => {
    const refCode = await getOrCreateRefCode('usr_ref3')
    await tryAttributeReferral({ refCode, newUserId: 'usr_a', visitorIp: '1.1.1.1' })
    const result = await tryAttributeReferral({
      refCode, newUserId: 'usr_a', visitorIp: '2.2.2.2',
    })
    expect(result).toEqual({ ok: false, reason: 'already_attributed' })
  })

  test('dedupes same IP within 24h', async () => {
    const refCode = await getOrCreateRefCode('usr_ref4')
    await tryAttributeReferral({ refCode, newUserId: 'usr_x', visitorIp: '9.9.9.9' })
    const result = await tryAttributeReferral({
      refCode, newUserId: 'usr_y', visitorIp: '9.9.9.9',
    })
    expect(result).toEqual({ ok: false, reason: 'ip_dedupe' })
  })

  test('IPv6 normalized to /64 prefix', async () => {
    const refCode = await getOrCreateRefCode('usr_ref5')
    await tryAttributeReferral({
      refCode, newUserId: 'usr_v6a', visitorIp: '2001:db8:abcd:1234:5678::1',
    })
    const result = await tryAttributeReferral({
      refCode, newUserId: 'usr_v6b', visitorIp: '2001:db8:abcd:1234:ffff::ff',
    })
    expect(result).toEqual({ ok: false, reason: 'ip_dedupe' })
  })
})

describe('tryCompleteReferral', () => {
  const seedAttribution = async (referrerUserId: string, refereeUserId: string, status = 'pending'): Promise<string> => {
    const db = await getClient()
    const refCode = await getOrCreateRefCode(referrerUserId)
    const id = `ref_${Math.random().toString(16).slice(2, 10)}`
    await db.execute({
      sql: `INSERT INTO referral_attributions
            (id, referrerUserId, refereeUserId, refCode, visitorIpAtSignup, status, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, referrerUserId, refereeUserId, refCode, '1.1.1.1', status, Date.now()],
    })
    return id
  }

  const getAttributionStatus = async (refereeUserId: string): Promise<string | null> => {
    const db = await getClient()
    const row = await db.execute({
      sql: 'SELECT status FROM referral_attributions WHERE refereeUserId = ?',
      args: [refereeUserId],
    })
    return row.rows.length > 0 ? String(row.rows[0].status) : null
  }

  test('returns completed false if no pending attribution', async () => {
    const result = await tryCompleteReferral('nonexistent_user')
    expect(result).toEqual({ completed: false })
  })

  test('marks attribution as completed and increments monthly stats', async () => {
    await seedAttribution('ref_user_1', 'new_user_1', 'pending')

    const result = await tryCompleteReferral('new_user_1')
    expect(result.completed).toBe(true)
    expect(result.referrerUserId).toBe('ref_user_1')

    const status = await getAttributionStatus('new_user_1')
    expect(status).toBe('completed')

    const month = currentYearMonth()
    const count = await getMonthlyCountLib('ref_user_1', month)
    expect(count).toBe(1)
  })

  test('idempotent: second call returns completed false', async () => {
    await seedAttribution('ref_user_2', 'new_user_2', 'pending')

    const result1 = await tryCompleteReferral('new_user_2')
    expect(result1.completed).toBe(true)

    const result2 = await tryCompleteReferral('new_user_2')
    expect(result2.completed).toBe(false)

    const month = currentYearMonth()
    const count = await getMonthlyCountLib('ref_user_2', month)
    expect(count).toBe(1)
  })

  test('voids attribution if referrer monthly cap exceeded', async () => {
    // Trigger table creation first
    await tryCompleteReferral('trigger_tables')

    const db = await getClient()
    const month = currentYearMonth()
    await db.execute({
      sql: `INSERT INTO referral_monthly_stats (referrerUserId, yearMonth, completedCount)
            VALUES (?, ?, ?)`,
      args: ['ref_user_3', month, MONTHLY_CAP],
    })

    await seedAttribution('ref_user_3', 'new_user_3', 'pending')

    const result = await tryCompleteReferral('new_user_3')
    expect(result.completed).toBe(false)
    expect(result.referrerUserId).toBe('ref_user_3')

    const status = await getAttributionStatus('new_user_3')
    expect(status).toBe('voided')
  })
})

describe('getReferralStats', () => {
  const seedAttribution = async (
    referrerUserId: string,
    refereeUserId: string,
    status: 'pending' | 'completed' | 'voided' = 'pending',
  ): Promise<string> => {
    const db = await getClient()
    const refCode = await getOrCreateRefCode(referrerUserId)
    const id = `ref_${Math.random().toString(16).slice(2, 10)}`
    const now = Date.now()
    await db.execute({
      sql: `INSERT INTO referral_attributions
            (id, referrerUserId, refereeUserId, refCode, visitorIpAtSignup, status, createdAt, completedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, referrerUserId, refereeUserId, refCode, '1.1.1.1', status, now, status === 'completed' ? now : null],
    })
    return id
  }

  test('basic stats: new user with no referrals', async () => {
    const stats = await getReferralStats('usr_new_referrer')
    expect(stats.refCode).toMatch(/^[a-f0-9]{8}$/)
    expect(stats.inviteUrl).toContain('/r/')
    expect(stats.inviteUrl).toContain(stats.refCode)
    expect(stats.thisMonthCompleted).toBe(0)
    expect(stats.totalCompleted).toBe(0)
    expect(stats.monthlyLimit).toBe(MONTHLY_CAP)
  })

  test('stats reflect base URL from env', async () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://custom.example.com'
    const stats = await getReferralStats('usr_base_url_test')
    expect(stats.inviteUrl).toMatch(/^https:\/\/custom\.example\.com\/r\/[a-f0-9]{8}$/)
  })

  test('stats with completed referrals', async () => {
    const referrerUserId = 'usr_with_referrals'

    // Create 3 completed referrals this month
    for (let i = 0; i < 3; i++) {
      const month = currentYearMonth()
      const db = await getClient()
      await seedAttribution(referrerUserId, `usr_referee_${i}`, 'completed')
      // Manually increment monthly stats to simulate completion
      await db.execute({
        sql: `INSERT INTO referral_monthly_stats (referrerUserId, yearMonth, completedCount)
              VALUES (?, ?, 1)
              ON CONFLICT(referrerUserId, yearMonth)
              DO UPDATE SET completedCount = completedCount + 1`,
        args: [referrerUserId, month],
      })
    }

    const stats = await getReferralStats(referrerUserId)
    expect(stats.thisMonthCompleted).toBe(3)
    expect(stats.totalCompleted).toBe(3)
    expect(stats.refCode).toMatch(/^[a-f0-9]{8}$/)
    expect(stats.monthlyLimit).toBe(10)
  })

  test('distinguishes this month vs total completed', async () => {
    const referrerUserId = 'usr_multi_month'
    const db = await getClient()

    // Seed old completed referral (manual entry to simulate past month)
    await db.execute({
      sql: `INSERT INTO referral_attributions
            (id, referrerUserId, refereeUserId, refCode, visitorIpAtSignup, status, createdAt, completedAt)
            VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)`,
      args: [
        `ref_old_${Math.random().toString(16).slice(2, 10)}`,
        referrerUserId,
        'usr_old_referee',
        await getOrCreateRefCode(referrerUserId),
        '1.1.1.1',
        Date.now() - 60 * 24 * 3600 * 1000, // 60 days ago
        Date.now() - 60 * 24 * 3600 * 1000,
      ],
    })

    // Create this month's monthly stats entry for the old referral
    const oldMonth = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 7)
    await db.execute({
      sql: `INSERT INTO referral_monthly_stats (referrerUserId, yearMonth, completedCount)
            VALUES (?, ?, 1)`,
      args: [referrerUserId, oldMonth],
    })

    // Create 2 completed referrals this month
    const month = currentYearMonth()
    for (let i = 0; i < 2; i++) {
      await seedAttribution(referrerUserId, `usr_new_referee_${i}`, 'completed')
      await db.execute({
        sql: `INSERT INTO referral_monthly_stats (referrerUserId, yearMonth, completedCount)
              VALUES (?, ?, 1)
              ON CONFLICT(referrerUserId, yearMonth)
              DO UPDATE SET completedCount = completedCount + 1`,
        args: [referrerUserId, month],
      })
    }

    const stats = await getReferralStats(referrerUserId)
    expect(stats.thisMonthCompleted).toBe(2)
    expect(stats.totalCompleted).toBe(3)
  })

  test('includes voided attributions in total count', async () => {
    const referrerUserId = 'usr_with_voided'

    // Create 2 completed and 1 voided
    await seedAttribution(referrerUserId, 'usr_ref_a', 'completed')
    await seedAttribution(referrerUserId, 'usr_ref_b', 'completed')
    await seedAttribution(referrerUserId, 'usr_ref_voided', 'voided')

    // Update monthly stats for completed ones
    const month = currentYearMonth()
    const db = await getClient()
    await db.execute({
      sql: `INSERT INTO referral_monthly_stats (referrerUserId, yearMonth, completedCount)
            VALUES (?, ?, 2)`,
      args: [referrerUserId, month],
    })

    const stats = await getReferralStats(referrerUserId)
    // totalCompleted should only count 'completed' status, not 'voided'
    expect(stats.totalCompleted).toBe(2)
    expect(stats.thisMonthCompleted).toBe(2)
  })

  test('returns same refCode on multiple calls (idempotent)', async () => {
    const userId = 'usr_idempotent'
    const stats1 = await getReferralStats(userId)
    const stats2 = await getReferralStats(userId)
    expect(stats1.refCode).toBe(stats2.refCode)
    expect(stats1.inviteUrl).toBe(stats2.inviteUrl)
  })
})
