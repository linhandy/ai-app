import {
  getOrCreateRefCode,
  lookupRefCode,
  closeDb,
} from '@/lib/referral'
import { closeDb as closeOrdersDb } from '@/lib/orders'

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
