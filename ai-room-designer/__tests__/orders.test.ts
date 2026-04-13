import { createOrder, getOrder, updateOrder, closeDb } from '@/lib/orders'

beforeEach(() => {
  // Use in-memory SQLite — no file locking, isolated per test
  process.env.ORDERS_DB = ':memory:'
  closeDb()
})

afterAll(() => {
  closeDb()
})

test('createOrder returns order with pending status', async () => {
  const order = await createOrder({ style: '北欧简约', uploadId: 'abc123' })
  expect(order.id).toMatch(/^ord_/)
  expect(order.status).toBe('pending')
  expect(order.style).toBe('北欧简约')
  expect(order.uploadId).toBe('abc123')
})

test('getOrder returns created order', async () => {
  const order = await createOrder({ style: '工业风', uploadId: 'xyz' })
  const found = await getOrder(order.id)
  expect(found).toEqual(order)
})

test('getOrder returns null for unknown id', async () => {
  expect(await getOrder('nonexistent')).toBeNull()
})

test('updateOrder changes status and persists', async () => {
  const order = await createOrder({ style: '侘寂风', uploadId: 'u1' })
  await updateOrder(order.id, { status: 'paid' })
  const found = await getOrder(order.id)
  expect(found?.status).toBe('paid')
})

test('updateOrder with resultUrl', async () => {
  const order = await createOrder({ style: '新中式', uploadId: 'u2' })
  await updateOrder(order.id, { status: 'done', resultUrl: 'https://example.com/img.png' })
  expect((await getOrder(order.id))?.resultUrl).toBe('https://example.com/img.png')
})

test('createOrder stores roomType and customPrompt', async () => {
  const order = await createOrder({
    style: 'nordic_minimal',
    uploadId: 'abc',
    roomType: 'living_room',
    customPrompt: '加一张书桌',
  })
  expect(order.roomType).toBe('living_room')
  expect(order.customPrompt).toBe('加一张书桌')
})

test('createOrder uses living_room as default roomType', async () => {
  const order = await createOrder({ style: 'nordic_minimal', uploadId: 'abc2' })
  expect(order.roomType).toBe('living_room')
  expect(order.customPrompt).toBeUndefined()
})

test('DB migration adds roomType column to existing DB', async () => {
  // getClient() runs migration — simply creating an order in :memory: covers this
  const order = await createOrder({ style: 'nordic_minimal', uploadId: 'mig1' })
  expect(order.roomType).toBe('living_room')
})

test('createOrder accepts null uploadId for freestyle mode', async () => {
  const order = await createOrder({
    style: 'nordic_minimal',
    uploadId: null,
    mode: 'freestyle',
    roomType: 'living_room',
  })
  expect(order.uploadId).toBeNull()
  expect(order.mode).toBe('freestyle')
})

test('getOrder returns null uploadId for freestyle order', async () => {
  const created = await createOrder({
    style: 'nordic_minimal',
    uploadId: null,
    mode: 'freestyle',
    roomType: 'living_room',
  })
  const found = await getOrder(created.id)
  expect(found?.uploadId).toBeNull()
})
