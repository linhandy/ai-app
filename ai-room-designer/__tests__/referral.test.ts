import {
  getOrCreateRefCode,
  lookupRefCode,
  closeDb,
  tryAttributeReferral,
  tryCompleteReferral,
  currentYearMonth,
  getMonthlyCount as getMonthlyCountLib,
  MONTHLY_CAP,
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
