import { recordReferralClick, getReferralCount, closeDb } from '@/lib/referral'
import { getRemainingFreeUses, consumeFreeUse, closeDb as closeFreeDb } from '@/lib/free-uses'
import { closeDb as closeOrdersDb } from '@/lib/orders'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  closeDb()
  closeFreeDb()
  closeOrdersDb()
})

afterAll(() => {
  closeDb()
  closeFreeDb()
  closeOrdersDb()
})

test('recordReferralClick returns true for new visitor', async () => {
  const rewarded = await recordReferralClick({
    refCode: 'abc123',
    sharerIp: '1.1.1.1',
    visitorIp: '2.2.2.2',
  })
  expect(rewarded).toBe(true)
})

test('recordReferralClick returns false for repeat visitor', async () => {
  await recordReferralClick({ refCode: 'abc123', sharerIp: '1.1.1.1', visitorIp: '2.2.2.2' })
  const rewarded = await recordReferralClick({ refCode: 'abc123', sharerIp: '1.1.1.1', visitorIp: '2.2.2.2' })
  expect(rewarded).toBe(false)
})

test('different visitor same refCode gets rewarded again', async () => {
  await recordReferralClick({ refCode: 'abc123', sharerIp: '1.1.1.1', visitorIp: '2.2.2.2' })
  const rewarded = await recordReferralClick({ refCode: 'abc123', sharerIp: '1.1.1.1', visitorIp: '3.3.3.3' })
  expect(rewarded).toBe(true)
})

test('getReferralCount returns number of unique visitors', async () => {
  await recordReferralClick({ refCode: 'xyz999', sharerIp: '5.5.5.5', visitorIp: '6.6.6.6' })
  await recordReferralClick({ refCode: 'xyz999', sharerIp: '5.5.5.5', visitorIp: '7.7.7.7' })
  expect(await getReferralCount('xyz999')).toBe(2)
})

test('sharer gets rewarded when visitor is new', async () => {
  // Consume all 3 free uses for sharer
  await consumeFreeUse('1.1.1.1')
  await consumeFreeUse('1.1.1.1')
  await consumeFreeUse('1.1.1.1')
  expect(await getRemainingFreeUses('1.1.1.1')).toBe(0)

  await recordReferralClick({ refCode: 'abc123', sharerIp: '1.1.1.1', visitorIp: '8.8.8.8' })

  // Sharer should have 1 free use back
  expect(await getRemainingFreeUses('1.1.1.1')).toBe(1)
})
