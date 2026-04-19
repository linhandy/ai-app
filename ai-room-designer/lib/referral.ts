import crypto from 'crypto'
import { getClient } from './orders'
import { addBonusGenerationsBy } from './subscription'
import { addCredits } from './credits'
import { isOverseas } from './region'


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
    // Race or hash collision — re-fetch by userId
    const row = await db.execute({
      sql: 'SELECT refCode FROM referral_codes WHERE userId = ?',
      args: [userId],
    })
    if (row.rows.length > 0) return String(row.rows[0].refCode)

    // Hash collision with a different user. Generate a random refCode instead.
    for (let attempt = 0; attempt < 5; attempt++) {
      const randomCode = crypto.randomBytes(4).toString('hex')
      try {
        await db.execute({
          sql: 'INSERT INTO referral_codes (refCode, userId, createdAt) VALUES (?, ?, ?)',
          args: [randomCode, userId, Date.now()],
        })
        return randomCode
      } catch {
        // Rare — try again
      }
    }
    throw new Error('failed to create refCode after 5 random attempts')
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

// ---- Attribution ----

export type AttributeReason =
  | 'refcode_not_found'
  | 'self_referral'
  | 'not_new_user'
  | 'already_attributed'
  | 'ip_dedupe'
  | 'monthly_cap'

export interface AttributeResult {
  ok: boolean
  reason?: AttributeReason
}

export function normalizedIp(ip: string): string {
  // IPv4 — keep as is
  if (!ip.includes(':')) return ip
  // IPv6 — keep first 4 hextets (/64 prefix)
  const parts = ip.toLowerCase().split(':')
  const doubleColonIdx = parts.indexOf('')
  if (doubleColonIdx !== -1) {
    const before = parts.slice(0, doubleColonIdx).filter(Boolean)
    const after = parts.slice(doubleColonIdx + 1).filter(Boolean)
    const zeros = Array(8 - before.length - after.length).fill('0')
    const full = [...before, ...zeros, ...after]
    return full.slice(0, 4).join(':')
  }
  return parts.slice(0, 4).join(':')
}

export const MONTHLY_CAP = 10

export function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export async function getMonthlyCount(referrerUserId: string, yearMonth: string): Promise<number> {
  const db = await getClient()
  const row = await db.execute({
    sql: `SELECT completedCount FROM referral_monthly_stats
          WHERE referrerUserId = ? AND yearMonth = ?`,
    args: [referrerUserId, yearMonth],
  })
  return row.rows.length > 0 ? Number(row.rows[0].completedCount) : 0
}

export async function tryAttributeReferral(params: {
  refCode: string
  newUserId: string
  visitorIp: string
}): Promise<AttributeResult> {
  await ensureTables()
  const db = await getClient()

  // 1. refCode must exist
  const referrer = await lookupRefCode(params.refCode)
  if (!referrer) return { ok: false, reason: 'refcode_not_found' }

  // 2. No self-referral
  if (referrer.userId === params.newUserId) return { ok: false, reason: 'self_referral' }

  // 3. Referee must have no order history
  const hasOrders = await db.execute({
    sql: 'SELECT 1 FROM orders WHERE userId = ? LIMIT 1',
    args: [params.newUserId],
  })
  if (hasOrders.rows.length > 0) return { ok: false, reason: 'not_new_user' }

  // 4. Referee must not already be attributed
  const existing = await db.execute({
    sql: 'SELECT 1 FROM referral_attributions WHERE refereeUserId = ?',
    args: [params.newUserId],
  })
  if (existing.rows.length > 0) return { ok: false, reason: 'already_attributed' }

  // 5. Same-IP dedupe (24h)
  const ip = normalizedIp(params.visitorIp)
  const since = Date.now() - 24 * 3600 * 1000
  const ipDupe = await db.execute({
    sql: `SELECT 1 FROM referral_attributions
          WHERE visitorIpAtSignup = ? AND createdAt > ? LIMIT 1`,
    args: [ip, since],
  })
  if (ipDupe.rows.length > 0) return { ok: false, reason: 'ip_dedupe' }

  // 6. Referrer monthly cap
  const month = currentYearMonth()
  const thisMonth = await getMonthlyCount(referrer.userId, month)
  if (thisMonth >= MONTHLY_CAP) return { ok: false, reason: 'monthly_cap' }

  // All checks pass — write pending attribution
  await db.execute({
    sql: `INSERT INTO referral_attributions
          (id, referrerUserId, refereeUserId, refCode, visitorIpAtSignup, status, createdAt)
          VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    args: [
      `ref_${crypto.randomBytes(8).toString('hex')}`,
      referrer.userId,
      params.newUserId,
      params.refCode,
      ip,
      Date.now(),
    ],
  })
  return { ok: true }
}
// ---- Reward completion (Task 4) ----

async function grantBonus(userId: string, count: number): Promise<void> {
  if (isOverseas) {
    await addBonusGenerationsBy(userId, count)
  } else {
    await addCredits(userId, count)
  }
}

export interface CompleteReferralResult {
  completed: boolean
  referrerUserId?: string
}

export async function tryCompleteReferral(userId: string): Promise<CompleteReferralResult> {
  await ensureTables()
  const db = await getClient()

  // 1. Find pending attribution for this referee
  const attr = await db.execute({
    sql: `SELECT id, referrerUserId FROM referral_attributions
          WHERE refereeUserId = ? AND status = 'pending'`,
    args: [userId],
  })
  if (attr.rows.length === 0) {
    return { completed: false }
  }

  const attributionId = String(attr.rows[0].id)
  const referrerUserId = String(attr.rows[0].referrerUserId)

  // 2. Re-check referrer's monthly cap (prevent month-end explosion)
  const month = currentYearMonth()
  const thisMonth = await getMonthlyCount(referrerUserId, month)
  if (thisMonth >= MONTHLY_CAP) {
    // Cap exceeded void this attribution
    await db.execute({
      sql: `UPDATE referral_attributions SET status = 'voided' WHERE id = ?`,
      args: [attributionId],
    })
    return { completed: false, referrerUserId }
  }

  // 3. Grant bonuses
  await Promise.all([
    grantBonus(referrerUserId, 2),
    grantBonus(userId, 2),
  ])

  // 4. Mark as completed and increment monthly stats
  const now = Date.now()
  await db.execute({
    sql: `UPDATE referral_attributions SET status = 'completed', completedAt = ?
          WHERE id = ?`,
    args: [now, attributionId],
  })

  await db.execute({
    sql: `INSERT INTO referral_monthly_stats (referrerUserId, yearMonth, completedCount)
          VALUES (?, ?, 1)
          ON CONFLICT(referrerUserId, yearMonth)
          DO UPDATE SET completedCount = completedCount + 1`,
    args: [referrerUserId, month],
  })

  return { completed: true, referrerUserId }
}
