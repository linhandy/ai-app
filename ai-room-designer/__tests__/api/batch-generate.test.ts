import { closeDb } from '@/lib/orders'
import { closeSubscriptionDb } from '@/lib/subscription'

jest.mock('@/lib/region', () => ({ isOverseas: true }))

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  process.env.LIBSQL_AUTH_TOKEN = ''
  closeDb()
  closeSubscriptionDb()
})

afterEach(() => {
  closeDb()
  closeSubscriptionDb()
})

test('incrementGenerationsUsedBy increments by given count for paid plan', async () => {
  const { upsertSubscription, getSubscription, incrementGenerationsUsedBy } = await import('@/lib/subscription')
  const userId = 'user_batch_test'
  await upsertSubscription({
    userId,
    stripeCustomerId: 'cus_test',
    stripeSubscriptionId: 'sub_test',
    plan: 'pro',
    status: 'active',
    currentPeriodEnd: Date.now() + 86400_000,
    resetGenerations: true,
  })

  await incrementGenerationsUsedBy(userId, 4)
  const sub = await getSubscription(userId)
  expect(sub.generationsUsed).toBe(4)
})

test('incrementGenerationsUsedBy creates row if user has no subscription', async () => {
  const { getSubscription, incrementGenerationsUsedBy } = await import('@/lib/subscription')
  const userId = 'user_batch_new'
  await incrementGenerationsUsedBy(userId, 2)
  const sub = await getSubscription(userId)
  expect(sub.generationsUsed).toBe(2)
})

test('POST /api/batch-generate returns 401 when not authenticated', async () => {
  jest.resetModules()
  jest.mock('@/lib/auth', () => ({
    getServerSession: jest.fn().mockResolvedValue(null),
  }))
  const { POST } = await import('@/app/api/batch-generate/route')
  const req = new Request('http://localhost/api/batch-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify({ uploadId: 'up_abc', styles: ['nordic_minimal', 'japanese_muji'], quality: 'standard', mode: 'redesign', roomType: 'living_room' }),
  })
  const res = await POST(req as any)
  expect(res.status).toBe(401)
})

test('POST /api/batch-generate returns 400 when fewer than 2 styles', async () => {
  jest.resetModules()
  jest.mock('@/lib/auth', () => ({
    getServerSession: jest.fn().mockResolvedValue({ userId: 'user_x' }),
  }))
  jest.mock('@/lib/subscription', () => ({
    getSubscription: jest.fn().mockResolvedValue({ plan: 'pro', generationsLeft: 50 }),
    incrementGenerationsUsedBy: jest.fn(),
  }))
  const { POST } = await import('@/app/api/batch-generate/route')
  const req = new Request('http://localhost/api/batch-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify({ uploadId: 'up_abc', styles: ['nordic_minimal'], quality: 'standard', mode: 'redesign', roomType: 'living_room' }),
  })
  const res = await POST(req as any)
  expect(res.status).toBe(400)
})

test('POST /api/batch-generate returns 402 when free plan', async () => {
  jest.resetModules()
  jest.mock('@/lib/auth', () => ({
    getServerSession: jest.fn().mockResolvedValue({ userId: 'user_free' }),
  }))
  jest.mock('@/lib/subscription', () => ({
    getSubscription: jest.fn().mockResolvedValue({ plan: 'free', generationsLeft: 3 }),
    incrementGenerationsUsedBy: jest.fn(),
  }))
  const { POST } = await import('@/app/api/batch-generate/route')
  const req = new Request('http://localhost/api/batch-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify({ uploadId: 'up_abc', styles: ['nordic_minimal', 'japanese_muji'], quality: 'standard', mode: 'redesign', roomType: 'living_room' }),
  })
  const res = await POST(req as any)
  expect(res.status).toBe(402)
})
