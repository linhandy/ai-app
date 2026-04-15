import { findOrCreateGoogleUser, closeAuthDb } from '@/lib/auth'

// Use an in-memory SQLite DB for tests
beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  closeAuthDb()
})

afterEach(() => {
  closeAuthDb()
})

describe('findOrCreateGoogleUser', () => {
  it('creates a new user on first sign-in', async () => {
    const result = await findOrCreateGoogleUser({
      googleId: 'google_123',
      email: 'test@example.com',
      name: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
    })
    expect(result.userId).toMatch(/^usr_/)
    expect(result.googleId).toBe('google_123')
    expect(result.email).toBe('test@example.com')
  })

  it('returns existing user on subsequent sign-in', async () => {
    const first = await findOrCreateGoogleUser({
      googleId: 'google_456',
      email: 'repeat@example.com',
      name: 'Repeat User',
      avatar: '',
    })
    const second = await findOrCreateGoogleUser({
      googleId: 'google_456',
      email: 'repeat@example.com',
      name: 'Repeat User Updated',
      avatar: '',
    })
    expect(first.userId).toBe(second.userId)
  })
})
