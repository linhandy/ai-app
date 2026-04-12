import { createOrder, getOrder, updateOrder, Order } from '@/lib/orders'
import fs from 'fs'
import path from 'path'

const TEST_DB = path.join('/tmp', 'test-orders.json')

beforeEach(() => {
  process.env.ORDERS_FILE = TEST_DB
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB)
})

afterAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB)
})

test('createOrder returns order with pending status', () => {
  const order = createOrder({ style: '北欧简约', uploadId: 'abc123' })
  expect(order.id).toMatch(/^ord_/)
  expect(order.status).toBe('pending')
  expect(order.style).toBe('北欧简约')
  expect(order.uploadId).toBe('abc123')
})

test('getOrder returns created order', () => {
  const order = createOrder({ style: '工业风', uploadId: 'xyz' })
  const found = getOrder(order.id)
  expect(found).toEqual(order)
})

test('getOrder returns null for unknown id', () => {
  expect(getOrder('nonexistent')).toBeNull()
})

test('updateOrder changes status and persists', () => {
  const order = createOrder({ style: '侘寂风', uploadId: 'u1' })
  updateOrder(order.id, { status: 'paid' })
  const found = getOrder(order.id)
  expect(found?.status).toBe('paid')
})

test('updateOrder with resultUrl', () => {
  const order = createOrder({ style: '新中式', uploadId: 'u2' })
  updateOrder(order.id, { status: 'done', resultUrl: 'https://example.com/img.png' })
  expect(getOrder(order.id)?.resultUrl).toBe('https://example.com/img.png')
})
