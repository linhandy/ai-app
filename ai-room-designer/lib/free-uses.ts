// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@libsql/client') as typeof import('@libsql/client')
import type { Client } from '@libsql/client'
import path from 'path'

const FREE_USES_PER_PERIOD = 3
const RESET_PERIOD_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function dbUrl(): string {
  const raw = process.env.ORDERS_DB ?? path.join(
    process.env.VERCEL ? '/tmp' : process.cwd(),
    'orders.db',
  )
  if (raw === ':memory:') return ':memory:'
  if (raw.startsWith('libsql://') || raw.startsWith('https://')) return raw
  return `file:${raw}`
}

let _client: Client | null = null

export function closeDb(): void {
  if (_client) {
    _client.close()
    _client = null
  }
}

export async function getDb(): Promise<Client> {
  if (_client) return _client
  const url = dbUrl()
  const authToken = process.env.LIBSQL_AUTH_TOKEN
  _client = createClient(authToken && url !== ':memory:' ? { url, authToken } : { url })
  await _client.execute(`
    CREATE TABLE IF NOT EXISTS ip_free_uses (
      ip TEXT PRIMARY KEY,
      used_count INTEGER NOT NULL DEFAULT 0,
      last_reset_at INTEGER NOT NULL
    )
  `)
  return _client
}

/** Returns how many free uses this IP has left (0–3). Resets if expired. */
export async function getRemainingFreeUses(ip: string): Promise<number> {
  const db = await getDb()
  const result = await db.execute({ sql: 'SELECT used_count, last_reset_at FROM ip_free_uses WHERE ip = ?', args: [ip] })
  if (result.rows.length === 0) return FREE_USES_PER_PERIOD

  const row = result.rows[0]
  const lastReset = Number(row.last_reset_at)
  if (Date.now() - lastReset > RESET_PERIOD_MS) {
    await db.execute({ sql: 'UPDATE ip_free_uses SET used_count = 0, last_reset_at = ? WHERE ip = ?', args: [Date.now(), ip] })
    return FREE_USES_PER_PERIOD
  }
  return Math.max(0, FREE_USES_PER_PERIOD - Number(row.used_count))
}

/**
 * Attempts to consume one free use for the IP.
 * Returns true if consumed, false if quota exhausted.
 */
export async function consumeFreeUse(ip: string): Promise<boolean> {
  const remaining = await getRemainingFreeUses(ip)
  if (remaining <= 0) return false

  const db = await getDb()
  await db.execute({
    sql: `INSERT INTO ip_free_uses (ip, used_count, last_reset_at) VALUES (?, 1, ?)
          ON CONFLICT(ip) DO UPDATE SET used_count = used_count + 1`,
    args: [ip, Date.now()],
  })
  return true
}

/**
 * Rewards the IP with +1 free use (decrements used_count, min 0).
 * Used for referral bonuses.
 */
export async function rewardFreeUse(ip: string): Promise<void> {
  const db = await getDb()
  await db.execute({
    sql: `INSERT INTO ip_free_uses (ip, used_count, last_reset_at) VALUES (?, 0, ?)
          ON CONFLICT(ip) DO UPDATE SET used_count = MAX(0, used_count - 1)`,
    args: [ip, Date.now()],
  })
}
