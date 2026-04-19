import { findOrCreateWechatUser, closeAuthDb, verifyCode, sendCode } from '@/lib/auth'
import { getOrCreateRefCode, closeDb as closeReferralDb } from '@/lib/referral'
import { closeDb as closeOrdersDb, getClient as getOrdersClient } from '@/lib/orders'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  process.env.DEV_SKIP_PAYMENT = 'true'
  process.env.REFERRAL_SALT = 'test-salt-value'
  closeAuthDb()
  closeReferralDb()
  closeOrdersDb()
})

afterAll(() => {
  closeAuthDb()
  closeReferralDb()
  closeOrdersDb()
})

test('findOrCreateWechatUser creates a new user with isNew=true', async () => {
  const user = await findOrCreateWechatUser({
    openid: 'wx_openid_001',
    nickname: '测试用户',
    avatar: 'https://thirdwx.qlogo.cn/avatar.jpg',
  })
  expect(user.userId).toMatch(/^usr_/)
  expect(user.openid).toBe('wx_openid_001')
  expect(user.nickname).toBe('测试用户')
  expect(user.isNew).toBe(true)
})

test('findOrCreateWechatUser returns same userId with isNew=false for same openid', async () => {
  const first = await findOrCreateWechatUser({
    openid: 'wx_openid_002',
    nickname: '用户A',
    avatar: 'https://thirdwx.qlogo.cn/a.jpg',
  })
  expect(first.isNew).toBe(true)

  const second = await findOrCreateWechatUser({
    openid: 'wx_openid_002',
    nickname: '用户A改名',
    avatar: 'https://thirdwx.qlogo.cn/b.jpg',
  })
  expect(second.userId).toBe(first.userId)
  expect(second.nickname).toBe('用户A改名')
  expect(second.isNew).toBe(false)
})

test('findOrCreateWechatUser creates independent user from phone user', async () => {
  const wechatUser = await findOrCreateWechatUser({
    openid: 'wx_openid_003',
    nickname: '微信用户',
    avatar: '',
  })
  expect(wechatUser.isNew).toBe(true)

  await sendCode('13800138000')
  const phoneResult = await verifyCode('13800138000', '123456')
  expect(phoneResult).not.toBeNull()
  expect(phoneResult!.userId).not.toBe(wechatUser.userId)
  expect(phoneResult!.isNew).toBe(true)
})

test('verifyCode returns isNew=true for new phone user', async () => {
  await sendCode('13800138001')
  const result = await verifyCode('13800138001', '123456')
  expect(result).not.toBeNull()
  expect(result!.userId).toMatch(/^usr_/)
  expect(result!.isNew).toBe(true)
})

test('verifyCode returns isNew=false for existing phone user', async () => {
  // First login creates new user
  await sendCode('13800138002')
  const first = await verifyCode('13800138002', '123456')
  expect(first!.isNew).toBe(true)

  // Second login with same phone returns existing user
  await sendCode('13800138002')
  const second = await verifyCode('13800138002', '123456')
  expect(second!.userId).toBe(first!.userId)
  expect(second!.isNew).toBe(false)
})

test('verifyCode includes isNew flag for API route consumption', async () => {
  await sendCode('13800138003')
  const result = await verifyCode('13800138003', '123456')
  expect(result).toHaveProperty('isNew')
  expect(result).toHaveProperty('userId')
  expect(result).toHaveProperty('phone')
})
