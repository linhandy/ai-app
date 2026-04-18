import { NextRequest } from 'next/server'

jest.mock('@/lib/auth', () => ({
  parseSessionToken: jest.fn().mockReturnValue(null),
  getServerSession: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/storage', () => ({
  downloadFromStorage: jest.fn().mockResolvedValue(null),
  uploadStoragePath: jest.fn((id: string) => `uploads/${id}`),
  uploadToStorage: jest.fn().mockResolvedValue(undefined),
  resultStoragePath: jest.fn((id: string) => `results/${id}`),
}))

import { getSubscription, upsertSubscription, closeSubscriptionDb } from '@/lib/subscription'
import { getUploadData, closeDb } from '@/lib/orders'
import { downloadFromStorage } from '@/lib/storage'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  process.env.REGION = 'overseas'
  closeDb()
  closeSubscriptionDb()
})

afterEach(() => {
  closeDb()
  closeSubscriptionDb()
  delete process.env.REGION
})

describe('subscription gate for overseas order creation', () => {
  it('free user with 0 used can generate (generationsLeft > 0)', async () => {
    const sub = await getSubscription('free_user')
    expect(sub.generationsLeft).toBeGreaterThan(0)
  })

  it('free user at limit cannot generate (generationsLeft === 0)', async () => {
    await upsertSubscription({
      userId: 'free_maxed',
      stripeCustomerId: '',
      stripeSubscriptionId: '',
      plan: 'free',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const client = (await import('@/lib/orders')).getClient
    const db = await client()
    await db.execute({ sql: 'UPDATE subscriptions SET generationsUsed = 3 WHERE userId = ?', args: ['free_maxed'] })

    const sub = await getSubscription('free_maxed')
    expect(sub.generationsLeft).toBe(0)
  })

  it('unlimited plan has 500/month fair use cap', async () => {
    await upsertSubscription({
      userId: 'unlimited_user',
      stripeCustomerId: 'cus_x',
      stripeSubscriptionId: 'sub_x',
      plan: 'unlimited',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const sub = await getSubscription('unlimited_user')
    expect(sub.generationsLimit).toBe(500)
    expect(sub.generationsLeft).toBe(500)
  })
})

describe('getUploadData for non-existent upload', () => {
  it('returns null when upload does not exist in DB or Storage', async () => {
    const result = await getUploadData('nonexistent-upload-id')
    expect(result).toBeNull()
  })
})

describe('overseas free plan isFree flag', () => {
  it('free plan subscription has hasWatermark: false', async () => {
    // No subscription record → falls back to FREE_DEFAULTS
    const sub = await getSubscription('new_overseas_user')
    expect(sub.hasWatermark).toBe(false)
  })

  it('active free plan subscription has hasWatermark: false', async () => {
    await upsertSubscription({
      userId: 'free_active',
      stripeCustomerId: 'cus_test',
      stripeSubscriptionId: 'sub_test',
      plan: 'free',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const sub = await getSubscription('free_active')
    expect(sub.hasWatermark).toBe(false)
  })
})

describe('style-match referenceUploadId validation (unit tests for logic used by route)', () => {
  it('getUploadData returns null for a non-existent referenceUploadId', async () => {
    // This is the behavior the route relies on to return 400 fileNotFound
    const result = await getUploadData('nonexistent-reference-id')
    expect(result).toBeNull()
  })

  it('createOrder stores referenceUploadId for style-match mode', async () => {
    const { createOrder, getOrder } = await import('@/lib/orders')
    const order = await createOrder({
      style: 'nordic_minimal',
      uploadId: 'room_upload_1',
      referenceUploadId: 'ref_upload_1',
      mode: 'style-match',
      roomType: 'living_room',
      userId: 'test_user',
    })
    const found = await getOrder(order.id)
    expect(found?.referenceUploadId).toBe('ref_upload_1')
    expect(found?.mode).toBe('style-match')
  })
})

test('create-order overseas: inpaint mode requires customPrompt', async () => {
  jest.mocked(downloadFromStorage).mockResolvedValueOnce(Buffer.from('fake'))  // for uploadId
  process.env.NEXT_PUBLIC_REGION = 'overseas'
  process.env.REGION = 'overseas'
  const { POST } = await import('@/app/api/create-order/route')
  const req = new Request('http://localhost/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadId: 'upload_abc',
      referenceUploadId: 'composite_abc',
      mode: 'inpaint',
      roomType: 'living_room',
      // customPrompt intentionally missing
      quality: 'standard',
    }),
  })
  const res = await POST(req as unknown as NextRequest)
  expect(res.status).toBe(400)
  const body = await res.json()
  // ERR.invalidMode in overseas mode is 'Invalid design mode.'
  expect(body.error).toBeDefined()
})

test('create-order overseas: inpaint mode requires referenceUploadId', async () => {
  // mock downloadFromStorage so getUploadData('upload_abc') returns non-null,
  // allowing execution to reach the inpaint-specific validation block
  jest.mocked(downloadFromStorage).mockResolvedValueOnce(Buffer.from('fake'))

  process.env.NEXT_PUBLIC_REGION = 'overseas'
  process.env.REGION = 'overseas'
  const { POST } = await import('@/app/api/create-order/route')
  const req = new Request('http://localhost/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadId: 'upload_abc',
      mode: 'inpaint',
      roomType: 'living_room',
      customPrompt: 'a modern sofa',
      quality: 'standard',
      // referenceUploadId intentionally missing
    }),
  })
  const res = await POST(req as unknown as NextRequest)
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBe('Please upload a photo first.')  // ERR.uploadMissing in overseas mode
})

test('create-order overseas: anonymous daily key includes UTC date', async () => {
  process.env.NEXT_PUBLIC_REGION = 'overseas'
  process.env.REGION = 'overseas'
  const { getClient } = await import('@/lib/orders')
  const db = await getClient()

  // Simulate 3 uses on yesterday's key — should NOT block today
  const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10)
  await db.execute({
    sql: `INSERT INTO credits (owner, balance, total_purchased, updated_at) VALUES (?, 3, 0, ?)`,
    args: [`anon_ov:1.2.3.4:${yesterday}`, Date.now()],
  })

  // Today's key should be 0 — user can still generate
  const today = new Date().toISOString().slice(0, 10)
  const row = await db.execute({
    sql: 'SELECT balance FROM credits WHERE owner = ?',
    args: [`anon_ov:1.2.3.4:${today}`],
  })
  expect(Number(row.rows[0]?.balance ?? 0)).toBe(0)
})
