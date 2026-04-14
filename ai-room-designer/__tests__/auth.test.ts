import { findOrCreateWechatUser, closeAuthDb } from '@/lib/auth'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  process.env.DEV_SKIP_PAYMENT = 'true'
  closeAuthDb()
})

afterAll(() => {
  closeAuthDb()
})

test('findOrCreateWechatUser creates a new user', async () => {
  const user = await findOrCreateWechatUser({
    openid: 'wx_openid_001',
    nickname: '测试用户',
    avatar: 'https://thirdwx.qlogo.cn/avatar.jpg',
  })
  expect(user.userId).toMatch(/^usr_/)
  expect(user.openid).toBe('wx_openid_001')
  expect(user.nickname).toBe('测试用户')
})

test('findOrCreateWechatUser returns same userId for same openid', async () => {
  const first = await findOrCreateWechatUser({
    openid: 'wx_openid_002',
    nickname: '用户A',
    avatar: 'https://thirdwx.qlogo.cn/a.jpg',
  })
  const second = await findOrCreateWechatUser({
    openid: 'wx_openid_002',
    nickname: '用户A改名',
    avatar: 'https://thirdwx.qlogo.cn/b.jpg',
  })
  expect(second.userId).toBe(first.userId)
  expect(second.nickname).toBe('用户A改名')
})

test('findOrCreateWechatUser creates independent user from phone user', async () => {
  const { verifyCode, sendCode } = await import('@/lib/auth')
  const wechatUser = await findOrCreateWechatUser({
    openid: 'wx_openid_003',
    nickname: '微信用户',
    avatar: '',
  })
  await sendCode('13800138000')
  const phoneResult = await verifyCode('13800138000', '123456')
  expect(phoneResult).not.toBeNull()
  expect(phoneResult!.userId).not.toBe(wechatUser.userId)
})
