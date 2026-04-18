import crypto from 'crypto'
import { getClient } from './orders'

// ---- Table bootstrap ----
let _migrated = false
async function ensureTables(): Promise<void> {
  if (_migrated) return
  const db = await getClient()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS referral_codes (
      refCode   TEXT PRIMARY KEY,
      userId    TEXT NOT NULL UNIQUE,
      createdAt INTEGER NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS referral_attributions (
      id                  TEXT PRIMARY KEY,
      referrerUserId      TEXT NOT NULL,
      refereeUserId       TEXT NOT NULL UNIQUE,
      refCode             TEXT NOT NULL,
      visitorIpAtSignup   TEXT NOT NULL,
      status              TEXT NOT NULL,
      createdAt           INTEGER NOT NULL,
      completedAt         INTEGER
    )
  `)
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_ref_attr_referrer
     ON referral_attributions(referrerUserId, status)`
  )
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_ref_attr_ip
     ON referral_attributions(visitorIpAtSignup, createdAt)`
  )
  await db.execute(`
    CREATE TABLE IF NOT EXISTS referral_monthly_stats (
      referrerUserId  TEXT NOT NULL,
      yearMonth       TEXT NOT NULL,
      completedCount  INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (referrerUserId, yearMonth)
    )
  `)
  _migrated = true
}

/** Exposed for test cleanup; no-op since we share the orders client. */
export function closeDb(): void {
  _migrated = false
}

// ---- Ref code ----
function salt(): string {
  return process.env.REFERRAL_SALT ?? 'dev-referral-salt-change-me'
}

function deriveRefCode(userId: string): string {
  return crypto.createHash('sha256').update(userId + salt()).digest('hex').slice(0, 8)
}

export async function getOrCreateRefCode(userId: string): Promise<string> {
  await ensureTables()
  const db = await getClient()
  const existing = await db.execute({
    sql: 'SELECT refCode FROM referral_codes WHERE userId = ?',
    args: [userId],
  })
  if (existing.rows.length > 0) return String(existing.rows[0].refCode)

  const refCode = deriveRefCode(userId)
  try {
    await db.execute({
      sql: 'INSERT INTO referral_codes (refCode, userId, createdAt) VALUES (?, ?, ?)',
      args: [refCode, userId, Date.now()],
    })
  } catch {
    // Race — another request inserted it; just re-fetch
    const row = await db.execute({
      sql: 'SELECT refCode FROM referral_codes WHERE userId = ?',
      args: [userId],
    })
    if (row.rows.length > 0) return String(row.rows[0].refCode)
    throw new Error('failed to create refCode')
  }
  return refCode
}

export async function lookupRefCode(refCode: string): Promise<{ userId: string } | null> {
  await ensureTables()
  const db = await getClient()
  const row = await db.execute({
    sql: 'SELECT userId FROM referral_codes WHERE refCode = ?',
    args: [refCode],
  })
  if (row.rows.length === 0) return null
  return { userId: String(row.rows[0].userId) }
}
