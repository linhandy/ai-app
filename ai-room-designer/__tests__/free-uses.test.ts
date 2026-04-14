import { getRemainingFreeUses, consumeFreeUse, rewardFreeUse, closeDb } from '@/lib/free-uses'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  closeDb()
})

afterAll(() => {
  closeDb()
})

test('新 IP 有 3 次免费额度', async () => {
  expect(await getRemainingFreeUses('1.2.3.4')).toBe(3)
})

test('consumeFreeUse 减少额度并返回 true', async () => {
  const ok = await consumeFreeUse('1.2.3.4')
  expect(ok).toBe(true)
  expect(await getRemainingFreeUses('1.2.3.4')).toBe(2)
})

test('连续消耗 3 次后返回 false', async () => {
  await consumeFreeUse('5.6.7.8')
  await consumeFreeUse('5.6.7.8')
  await consumeFreeUse('5.6.7.8')
  expect(await consumeFreeUse('5.6.7.8')).toBe(false)
  expect(await getRemainingFreeUses('5.6.7.8')).toBe(0)
})

test('rewardFreeUse 减少 used_count（等效于 +1 次），最低到 0', async () => {
  await consumeFreeUse('9.9.9.9')
  await rewardFreeUse('9.9.9.9')
  expect(await getRemainingFreeUses('9.9.9.9')).toBe(3)
})

test('7天后额度重置', async () => {
  const { getDb } = await import('@/lib/free-uses')
  const db = await getDb()
  const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
  await db.execute({
    sql: 'INSERT OR REPLACE INTO ip_free_uses (ip, used_count, last_reset_at) VALUES (?, ?, ?)',
    args: ['2.3.4.5', 3, eightDaysAgo],
  })
  expect(await getRemainingFreeUses('2.3.4.5')).toBe(3)
})
