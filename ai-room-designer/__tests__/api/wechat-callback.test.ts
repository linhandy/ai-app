import { GET } from '@/app/api/auth/wechat/callback/route'
import { closeAuthDb } from '@/lib/auth'
import { closeDb as closeReferralDb, getOrCreateRefCode, tryAttributeReferral } from '@/lib/referral'
import { closeDb as closeOrdersDb, getClient } from '@/lib/orders'

// Mock next/server
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: string) => ({
      url,
      cookies: {
        delete: jest.fn(),
        set: jest.fn(),
      },
    }),
  },
}))

// Mock next/headers
const mockCookieStore = {
  get: jest.fn(),
}

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve(mockCookieStore)),
}))

// Mock fetch for WeChat API calls
const mockFetch = jest.fn()
global.fetch = mockFetch as any

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  process.env.REFERRAL_SALT = 'test-salt-value'
  process.env.WECHAT_APPID = 'test_app_id'
  process.env.WECHAT_SECRET = 'test_secret'
  process.env.NEXT_PUBLIC_BASE_URL = 'https://test.example.com'

  mockFetch.mockClear()
  mockCookieStore.get.mockClear()

  closeAuthDb()
  closeReferralDb()
  closeOrdersDb()

  // Reset console methods
  jest.spyOn(console, 'log').mockImplementation()
  jest.spyOn(console, 'error').mockImplementation()
})

afterAll(() => {
  jest.restoreAllMocks()
  closeAuthDb()
  closeReferralDb()
  closeOrdersDb()
})

describe('WeChat callback with referral attribution', () => {
  const mockWechatTokenResponse = {
    access_token: 'test_access_token',
    openid: 'wx_test_openid_123',
  }

  const mockWechatUserResponse = {
    openid: 'wx_test_openid_123',
    nickname: 'TestUser',
    headimgurl: 'https://example.com/avatar.jpg',
  }

  const createMockRequest = (
    code: string = 'auth_code_123',
    state: string = 'state_123',
    visitorIp: string = '192.168.1.1',
  ): Request => {
    const url = `https://test.example.com/api/auth/wechat/callback?code=${code}&state=${state}`
    const request = new Request(url)

    // Mock headers
    Object.defineProperty(request, 'headers', {
      value: {
        get: (name: string) => {
          if (name === 'x-forwarded-for') return visitorIp
          return null
        },
      },
    })

    return request
  }

  test('new WeChat user with valid ref_code → attribution succeeds, user created', async () => {
    // Setup: create a referrer
    const referrerId = 'usr_referrer_123'
    const refCode = await getOrCreateRefCode(referrerId)

    // Setup: mock cookie store with ref_code
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'wechat_state') return { value: 'state_123' }
      if (name === 'ref_code') return { value: refCode }
      return undefined
    })

    // Setup: mock WeChat API responses
    mockFetch
      .mockResolvedValueOnce({
        json: async () => mockWechatTokenResponse,
      })
      .mockResolvedValueOnce({
        json: async () => mockWechatUserResponse,
      })

    const request = createMockRequest()

    const response: any = await GET(request)

    // Verify response is a redirect
    expect(response.url).toBe('https://test.example.com')

    // Verify cookies are set/deleted
    expect(response.cookies.delete).toHaveBeenCalledWith('wechat_state')
    expect(response.cookies.delete).toHaveBeenCalledWith('ref_code')
    expect(response.cookies.set).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
      }),
    )

    // Verify attribution logging
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[referral] attributed new WeChat user'),
    )
  })

  test('new WeChat user without ref_code → signup succeeds, no attribution attempted', async () => {
    // Setup: mock cookie store without ref_code
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'wechat_state') return { value: 'state_123' }
      return undefined
    })

    // Setup: mock WeChat API responses
    mockFetch
      .mockResolvedValueOnce({
        json: async () => mockWechatTokenResponse,
      })
      .mockResolvedValueOnce({
        json: async () => mockWechatUserResponse,
      })

    const request = createMockRequest()

    const response: any = await GET(request)

    // Verify response is a redirect
    expect(response.url).toBe('https://test.example.com')

    // Verify ref_code cookie is deleted even when not present
    expect(response.cookies.delete).toHaveBeenCalledWith('ref_code')

    // Verify no attribution was logged
    expect(console.log).not.toHaveBeenCalledWith(
      expect.stringContaining('[referral] attributed'),
      expect.anything(),
    )
  })

  test('existing WeChat user with ref_code → no attribution (isNew=false)', async () => {
    // Setup: create a new user first
    const user1 = await import('@/lib/auth').then(m =>
      m.findOrCreateWechatUser({
        openid: 'wx_existing_user_123',
        nickname: 'ExistingUser',
        avatar: 'https://example.com/avatar.jpg',
      }),
    )
    expect(user1.isNew).toBe(true)

    // Setup: create a referrer
    const referrerId = 'usr_referrer_456'
    const refCode = await getOrCreateRefCode(referrerId)

    // Setup: mock cookie store with ref_code
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'wechat_state') return { value: 'state_123' }
      if (name === 'ref_code') return { value: refCode }
      return undefined
    })

    // Setup: mock WeChat API responses to return existing user
    mockFetch
      .mockResolvedValueOnce({
        json: async () => mockWechatTokenResponse,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          ...mockWechatUserResponse,
          openid: 'wx_existing_user_123',
        }),
      })

    const request = createMockRequest()

    const response: any = await GET(request)

    // Verify response is a redirect
    expect(response.url).toBe('https://test.example.com')

    // Verify no attribution was logged (isNew was false)
    expect(console.log).not.toHaveBeenCalledWith(
      expect.stringContaining('[referral] attributed'),
      expect.anything(),
    )
  })

  test('new WeChat user with invalid ref_code → login succeeds, attribution fails gracefully', async () => {
    // Setup: mock cookie store with invalid ref_code
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'wechat_state') return { value: 'state_123' }
      if (name === 'ref_code') return { value: 'invalid_ref_code_xyz' }
      return undefined
    })

    // Setup: mock WeChat API responses
    mockFetch
      .mockResolvedValueOnce({
        json: async () => mockWechatTokenResponse,
      })
      .mockResolvedValueOnce({
        json: async () => mockWechatUserResponse,
      })

    const request = createMockRequest()

    const response: any = await GET(request)

    // Verify response is a redirect (login still succeeds)
    expect(response.url).toBe('https://test.example.com')

    // Verify session cookie is set
    expect(response.cookies.set).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.anything(),
    )

    // Verify attribution failure was logged
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[referral] failed to attribute WeChat user'),
      expect.objectContaining({
        reason: 'refcode_not_found',
      }),
    )
  })

  test('new WeChat user with ref_code from self → attribution fails (self-referral), login succeeds', async () => {
    // Setup: use a known user ID in the callback
    // We'll set up the callback to return a specific openid, then create a referral code for a user
    // and try to use it as self-referral

    const userId = 'usr_self_ref_user'
    const refCode = await getOrCreateRefCode(userId)

    // Setup: mock cookie store with self-referral code
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'wechat_state') return { value: 'state_123' }
      if (name === 'ref_code') return { value: refCode }
      return undefined
    })

    // Mock the findOrCreateWechatUser to return our known userId
    const authModule = await import('@/lib/auth')
    const originalFindOrCreate = authModule.findOrCreateWechatUser
    jest.spyOn(authModule, 'findOrCreateWechatUser').mockResolvedValueOnce({
      userId,
      openid: 'wx_test_openid_123',
      nickname: 'TestUser',
      avatar: 'https://example.com/avatar.jpg',
      isNew: true,
    })

    // Setup: mock WeChat API responses
    mockFetch
      .mockResolvedValueOnce({
        json: async () => mockWechatTokenResponse,
      })
      .mockResolvedValueOnce({
        json: async () => mockWechatUserResponse,
      })

    const request = createMockRequest()

    const response: any = await GET(request)

    // Verify response is a redirect
    expect(response.url).toBe('https://test.example.com')

    // Verify session is created despite attribution failure
    expect(response.cookies.set).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.anything(),
    )

    // Verify self-referral was rejected gracefully
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[referral] failed to attribute WeChat user'),
      expect.objectContaining({
        reason: 'self_referral',
      }),
    )
  })

  test('attribution exception → logged, login still succeeds', async () => {
    // Setup: mock cookie store with ref_code
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'wechat_state') return { value: 'state_123' }
      if (name === 'ref_code') return { value: 'some_code' }
      return undefined
    })

    // Setup: mock WeChat API responses
    mockFetch
      .mockResolvedValueOnce({
        json: async () => mockWechatTokenResponse,
      })
      .mockResolvedValueOnce({
        json: async () => mockWechatUserResponse,
      })

    // Mock tryAttributeReferral to throw an error
    const referralModule = await import('@/lib/referral')
    jest.spyOn(referralModule, 'tryAttributeReferral').mockRejectedValueOnce(
      new Error('Database connection failed'),
    )

    const request = createMockRequest()

    const response: any = await GET(request)

    // Verify response is a redirect (login still succeeds despite error)
    expect(response.url).toBe('https://test.example.com')

    // Verify session is created
    expect(response.cookies.set).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.anything(),
    )

    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[referral] error during WeChat attribution'),
      expect.any(Error),
    )
  })

  test('visitor IP extracted from x-forwarded-for header', async () => {
    // Setup: create a referrer
    const referrerId = 'usr_referrer_ip_test'
    const refCode = await getOrCreateRefCode(referrerId)

    // Setup: mock cookie store with ref_code
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'wechat_state') return { value: 'state_123' }
      if (name === 'ref_code') return { value: refCode }
      return undefined
    })

    // Setup: mock WeChat API responses
    mockFetch
      .mockResolvedValueOnce({
        json: async () => mockWechatTokenResponse,
      })
      .mockResolvedValueOnce({
        json: async () => mockWechatUserResponse,
      })

    // Create a mock request with specific visitor IP
    const visitorIp = '203.0.113.42'
    const request = createMockRequest('auth_code_123', 'state_123', visitorIp)

    const response: any = await GET(request)

    // Verify response is successful
    expect(response.url).toBe('https://test.example.com')

    // Verify attribution succeeded (IP should have been passed correctly)
    // We can check the referral_attributions table to see if the IP was stored
    const db = await getClient()
    const result = await db.execute({
      sql: 'SELECT visitorIpAtSignup FROM referral_attributions LIMIT 1',
      args: [],
    })
    expect(result.rows.length).toBeGreaterThan(0)
    expect(String(result.rows[0].visitorIpAtSignup)).toBe(visitorIp)
  })

  test('ref_code cookie cleared after attribution attempt', async () => {
    // Setup: create a referrer
    const referrerId = 'usr_referrer_cookie_test'
    const refCode = await getOrCreateRefCode(referrerId)

    // Setup: mock cookie store with ref_code
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'wechat_state') return { value: 'state_123' }
      if (name === 'ref_code') return { value: refCode }
      return undefined
    })

    // Setup: mock WeChat API responses
    mockFetch
      .mockResolvedValueOnce({
        json: async () => mockWechatTokenResponse,
      })
      .mockResolvedValueOnce({
        json: async () => mockWechatUserResponse,
      })

    const request = createMockRequest()

    const response: any = await GET(request)

    // Verify ref_code cookie is deleted
    expect(response.cookies.delete).toHaveBeenCalledWith('ref_code')
  })
})
