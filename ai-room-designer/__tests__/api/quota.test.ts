import { NextRequest } from 'next/server'

jest.mock('@/lib/auth', () => ({
  parseSessionToken: jest.fn(),
  getServerSession: jest.fn(),
}))

import { getServerSession } from '@/lib/auth'
import { closeSubscriptionDb } from '@/lib/subscription'
import { closeDb } from '@/lib/orders'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  process.env.REGION = 'overseas'
  closeDb()
  closeSubscriptionDb()
  jest.clearAllMocks()
})

afterEach(() => {
  closeDb()
  closeSubscriptionDb()
  delete process.env.REGION
})

describe('GET /api/quota', () => {
  it('returns null fields for unauthenticated user', async () => {
    jest.mocked(getServerSession).mockResolvedValue(null)
    const { GET } = await import('@/app/api/quota/route')
    const req = new Request('http://localhost/api/quota') as unknown as NextRequest
    const res = await GET(req)
    const body = await res.json()
    expect(body.plan).toBeNull()
    expect(body.generationsLeft).toBeNull()
    expect(body.generationsLimit).toBeNull()
    expect(body.resetType).toBeNull()
  })

  it('returns 2 generationsLeft for free user with 1 used today', async () => {
    jest.mocked(getServerSession).mockResolvedValue({ userId: 'user_q1' } as any)
    const { incrementGenerationsUsed } = await import('@/lib/subscription')
    await incrementGenerationsUsed('user_q1')
    const { GET } = await import('@/app/api/quota/route')
    const req = new Request('http://localhost/api/quota') as unknown as NextRequest
    const res = await GET(req)
    const body = await res.json()
    expect(body.generationsLeft).toBe(2)
  })

  it('returns monthly remaining for Pro user with resetType=monthly', async () => {
    jest.mocked(getServerSession).mockResolvedValue({ userId: 'pro_q1' } as any)
    const { upsertSubscription } = await import('@/lib/subscription')
    await upsertSubscription({
      userId: 'pro_q1',
      stripeCustomerId: 'cus_x',
      stripeSubscriptionId: 'sub_x',
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const { GET } = await import('@/app/api/quota/route')
    const req = new Request('http://localhost/api/quota') as unknown as NextRequest
    const res = await GET(req)
    const body = await res.json()
    expect(body.plan).toBe('pro')
    expect(body.generationsLeft).toBe(150)
    expect(body.generationsLimit).toBe(150)
    expect(body.resetType).toBe('monthly')
    expect(body.nextResetAt).toBeNull()
  })
})
