import { createOrder, updateOrder, closeDb } from '@/lib/orders'
import {
  getOrderStats,
  getRecentOrders,
  getGenerationMetrics,
} from '@/lib/admin-queries'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  closeDb()
})

afterAll(() => {
  closeDb()
})

async function makeOrder(style: string, status: 'done' | 'failed' | 'pending') {
  const o = await createOrder({ style, uploadId: 'u1', quality: 'standard' })
  if (status !== 'pending') {
    await updateOrder(o.id, { status, resultUrl: status === 'done' ? '/img.png' : undefined })
  }
  return o
}

test('getOrderStats returns zeros for empty DB', async () => {
  const stats = await getOrderStats()
  expect(stats.todayCount).toBe(0)
  expect(stats.totalGmv).toBe(0)
})

test('getOrderStats counts paid orders', async () => {
  await makeOrder('北欧简约', 'done')
  await makeOrder('新中式', 'done')
  await makeOrder('工业风', 'pending') // not counted
  const stats = await getOrderStats()
  expect(stats.totalCount).toBe(2)
})

test('getRecentOrders returns last 100 orders newest first', async () => {
  for (let i = 0; i < 5; i++) await makeOrder(`style${i}`, 'done')
  const orders = await getRecentOrders()
  expect(orders.length).toBe(5)
  expect(orders[0].createdAt).toBeGreaterThanOrEqual(orders[1].createdAt)
})

test('getGenerationMetrics calculates success rate', async () => {
  await makeOrder('A', 'done')
  await makeOrder('B', 'done')
  await makeOrder('C', 'failed')
  const metrics = await getGenerationMetrics()
  expect(metrics.successRate).toBeCloseTo(0.667, 2)
  expect(metrics.totalCount).toBe(3)
})
