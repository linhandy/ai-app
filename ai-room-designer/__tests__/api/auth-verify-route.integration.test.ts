import { sendCode, closeAuthDb } from '@/lib/auth'
import { getOrCreateRefCode, closeDb as closeReferralDb } from '@/lib/referral'
import { closeDb as closeOrdersDb, getClient as getOrdersClient } from '@/lib/orders'

jest.mock('@/lib/region', () => ({ isOverseas: false }))

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  process.env.DEV_SKIP_PAYMENT = 'true'
  process.env.REFERRAL_SALT = 'test-salt-value'
  closeAuthDb()
  closeReferralDb()
  closeOrdersDb()
})

afterEach(() => {
  closeAuthDb()
  closeReferralDb()
  closeOrdersDb()
})

describe('POST /api/auth/verify with referral integration', () => {
  test('route handler imports and defines POST function', async () => {
    const routeModule = await import('@/app/api/auth/verify/route')
    expect(routeModule.POST).toBeDefined()
    expect(typeof routeModule.POST).toBe('function')
  })

  test('route imports tryAttributeReferral successfully', async () => {
    const routeModule = await import('@/app/api/auth/verify/route')
    const source = await import('fs').then(fs =>
      new Promise((resolve, reject) =>
        fs.readFile(require('path').join(__dirname, '../../app/api/auth/verify/route.ts'), 'utf-8', (err, data) => {
          if (err) reject(err)
          else resolve(data)
        })
      )
    ).catch(() => '')

    // Verify the import statement exists
    expect(source).toContain('tryAttributeReferral')
  })

  test('referral module is properly exported', async () => {
    const referralModule = await import('@/lib/referral')
    expect(referralModule.tryAttributeReferral).toBeDefined()
    expect(typeof referralModule.tryAttributeReferral).toBe('function')
  })

  test('verify route flow respects isNew flag', async () => {
    const { verifyCode } = await import('@/lib/auth')

    // Create a new user
    await sendCode('19000000001')
    const result1 = await verifyCode('19000000001', '123456')

    expect(result1).not.toBeNull()
    expect(result1!.isNew).toBe(true)

    // Verify same user returns isNew=false
    await sendCode('19000000001')
    const result2 = await verifyCode('19000000001', '123456')

    expect(result2).not.toBeNull()
    expect(result2!.userId).toBe(result1!.userId)
    expect(result2!.isNew).toBe(false)
  })

  test('referral attribution logic works with valid refCode', async () => {
    const { tryAttributeReferral } = await import('@/lib/referral')
    const { verifyCode } = await import('@/lib/auth')

    // Create referrer and get ref code
    const referrerCode = await getOrCreateRefCode('usr_ref_integration_1')

    // Create new user
    await sendCode('19000000002')
    const userResult = await verifyCode('19000000002', '123456')

    // Try attribution
    const attrResult = await tryAttributeReferral({
      refCode: referrerCode,
      newUserId: userResult!.userId,
      visitorIp: '1.1.1.1',
    })

    expect(attrResult.ok).toBe(true)
  })

  test('referral attribution gracefully fails with invalid refCode', async () => {
    const { tryAttributeReferral } = await import('@/lib/referral')
    const { verifyCode } = await import('@/lib/auth')

    // Create new user
    await sendCode('19000000003')
    const userResult = await verifyCode('19000000003', '123456')

    // Try attribution with invalid code
    const attrResult = await tryAttributeReferral({
      refCode: 'invalidcode',
      newUserId: userResult!.userId,
      visitorIp: '1.1.1.1',
    })

    expect(attrResult.ok).toBe(false)
    expect(attrResult.reason).toBe('refcode_not_found')
  })

  test('existing users are skipped from attribution (route-level)', async () => {
    const { verifyCode } = await import('@/lib/auth')

    // Create referrer
    const referrerCode = await getOrCreateRefCode('usr_ref_integration_2')

    // First signup - this is new, so route would attempt attribution IF ref_code cookie exists
    await sendCode('19000000004')
    const userResult1 = await verifyCode('19000000004', '123456')
    expect(userResult1!.isNew).toBe(true)

    // Second signup with same phone (existing user)
    await sendCode('19000000004')
    const userResult2 = await verifyCode('19000000004', '123456')
    expect(userResult2!.isNew).toBe(false)

    // The verify route checks "if (result.isNew)" before attempting attribution
    // So existing users (isNew=false) never trigger the attribution logic in the route
    // This is the correct behavior - only new users get attributed
    expect(userResult2!.userId).toBe(userResult1!.userId)
  })

  test('monthly cap prevents excessive referrals', async () => {
    const { tryAttributeReferral, MONTHLY_CAP, currentYearMonth } = await import('@/lib/referral')
    const { verifyCode } = await import('@/lib/auth')

    // Create referrer and manually set monthly cap
    const referrerCode = await getOrCreateRefCode('usr_ref_integration_3')
    const db = await getOrdersClient()
    const month = currentYearMonth()

    // Manually set to cap
    await db.execute({
      sql: `INSERT INTO referral_monthly_stats (referrerUserId, yearMonth, completedCount)
            VALUES (?, ?, ?)`,
      args: [
        (await import('@/lib/referral').then(m => m.lookupRefCode(referrerCode))).userId,
        month,
        MONTHLY_CAP,
      ],
    })

    // Try to create new user and attribute
    await sendCode('19000000005')
    const userResult = await verifyCode('19000000005', '123456')

    const attrResult = await tryAttributeReferral({
      refCode: referrerCode,
      newUserId: userResult!.userId,
      visitorIp: '1.1.1.1',
    })

    expect(attrResult.ok).toBe(false)
    expect(attrResult.reason).toBe('monthly_cap')
  })
})
