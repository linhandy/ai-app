import { createClient, Client } from '@libsql/client'
import crypto from 'crypto'
import path from 'path'

// ---- DB connection (same DB as orders) ----

function dbUrl(): string {
  const raw = process.env.ORDERS_DB ?? path.join(process.cwd(), 'orders.db')
  if (raw === ':memory:') return ':memory:'
  return `file:${raw}`
}

let _client: Client | null = null

async function getClient(): Promise<Client> {
  if (_client) return _client

  _client = createClient({ url: dbUrl() })

  // phone allows NULL (WeChat users have no phone number)
  await _client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id               TEXT PRIMARY KEY,
      phone            TEXT UNIQUE,
      wechat_openid    TEXT,
      wechat_nickname  TEXT,
      wechat_avatar    TEXT,
      createdAt        INTEGER NOT NULL
    )
  `)

  await _client.execute(`
    CREATE TABLE IF NOT EXISTS codes (
      phone     TEXT NOT NULL,
      code      TEXT NOT NULL,
      expiresAt INTEGER NOT NULL
    )
  `)

  // Migrations for existing DBs
  try { await _client.execute(`ALTER TABLE users ADD COLUMN wechat_openid   TEXT`) } catch { /* already exists */ }
  try { await _client.execute(`ALTER TABLE users ADD COLUMN wechat_nickname TEXT`) } catch { /* already exists */ }
  try { await _client.execute(`ALTER TABLE users ADD COLUMN wechat_avatar   TEXT`) } catch { /* already exists */ }
  try { await _client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wechat_openid ON users (wechat_openid) WHERE wechat_openid IS NOT NULL`) } catch { /* already exists */ }

  return _client
}

// ---- Code send / verify ----

const devMode = () => process.env.DEV_SKIP_PAYMENT === 'true'

export async function sendCode(phone: string): Promise<{ success: true }> {
  const client = await getClient()
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

  // Remove old codes for this phone
  await client.execute({ sql: 'DELETE FROM codes WHERE phone = ?', args: [phone] })

  await client.execute({
    sql: 'INSERT INTO codes (phone, code, expiresAt) VALUES (?, ?, ?)',
    args: [phone, code, expiresAt],
  })

  if (devMode()) {
    console.log(`[DEV] Verification code for ${phone}: ${code}`)
  }

  return { success: true }
}

export async function verifyCode(
  phone: string,
  code: string,
): Promise<{ userId: string; phone: string } | null> {
  const client = await getClient()

  // In dev mode, any 6-digit code passes
  if (!devMode()) {
    const result = await client.execute({
      sql: 'SELECT * FROM codes WHERE phone = ? AND code = ? AND expiresAt > ?',
      args: [phone, code, Date.now()],
    })
    if (result.rows.length === 0) return null
  }

  // Clean up used codes
  await client.execute({ sql: 'DELETE FROM codes WHERE phone = ?', args: [phone] })

  // Create user if not exists
  const existing = await client.execute({
    sql: 'SELECT id FROM users WHERE phone = ?',
    args: [phone],
  })

  let userId: string
  if (existing.rows.length > 0) {
    userId = String(existing.rows[0].id)
  } else {
    userId = `usr_${crypto.randomBytes(8).toString('hex')}`
    await client.execute({
      sql: 'INSERT INTO users (id, phone, createdAt) VALUES (?, ?, ?)',
      args: [userId, phone, Date.now()],
    })
  }

  return { userId, phone }
}

export async function findOrCreateWechatUser(params: {
  openid: string
  nickname: string
  avatar: string
}): Promise<{ userId: string; openid: string; nickname: string; avatar: string }> {
  const client = await getClient()

  // Check if user with this openid already exists
  const existing = await client.execute({
    sql: 'SELECT id FROM users WHERE wechat_openid = ?',
    args: [params.openid],
  })

  let userId: string
  if (existing.rows.length > 0) {
    // User exists, update their info
    userId = String(existing.rows[0].id)
    await client.execute({
      sql: `UPDATE users SET wechat_nickname = ?, wechat_avatar = ? WHERE id = ?`,
      args: [params.nickname, params.avatar, userId],
    })
  } else {
    // Create new user
    userId = `usr_${crypto.randomBytes(8).toString('hex')}`
    await client.execute({
      sql: `INSERT INTO users (id, phone, wechat_openid, wechat_nickname, wechat_avatar, createdAt)
            VALUES (?, NULL, ?, ?, ?, ?)`,
      args: [userId, params.openid, params.nickname, params.avatar, Date.now()],
    })
  }

  return {
    userId,
    openid: params.openid,
    nickname: params.nickname,
    avatar: params.avatar,
  }
}

// ---- Session tokens (base64-encoded JSON, no JWT lib) ----

const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days

export function createSessionToken(userId: string): string {
  const payload = { userId, exp: Date.now() + SESSION_MAX_AGE }
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export function parseSessionToken(token: string): { userId: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'))
    if (!payload.userId || !payload.exp) return null
    if (Date.now() > payload.exp) return null
    return { userId: payload.userId }
  } catch {
    return null
  }
}

// ---- User lookup ----

export async function getUser(
  id: string,
): Promise<{ id: string; phone: string | null; createdAt: number } | null> {
  const client = await getClient()
  const result = await client.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [id],
  })
  if (result.rows.length === 0) return null
  const row = result.rows[0]
  return {
    id: String(row.id),
    phone: row.phone != null ? String(row.phone) : null,
    createdAt: Number(row.createdAt),
  }
}

/** Close and reset the auth DB client (used in tests). */
export function closeAuthDb(): void {
  if (_client) {
    _client.close()
    _client = null
  }
}
