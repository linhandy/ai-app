import { getClient } from './orders'
import crypto from 'crypto'

export type SubscriptionPlan = 'free' | 'pro' | 'unlimited'
export type QualityKey = 'standard' | 'premium' | 'ultra'

/**
 * Overseas quality gating — Free users get 1024px only (standard);
 * Pro/Unlimited unlock 2048px (premium) and 4096px (ultra).
 */
export function getAllowedQualities(plan: SubscriptionPlan): QualityKey[] {
  if (plan === 'free') return ['standard']
  return ['standard', 'premium', 'ultra']
}

const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  free:      3,
  pro:       150,
  unlimited: 500,  // Fair use cap — marketed as "Unlimited*" with footnote
}

let _bonusMigrated = false
async function ensureBonusColumn(): Promise<void> {
  if (_bonusMigrated) return
  const client = await getClient()
  try {
    await client.execute(`ALTER TABLE subscriptions ADD COLUMN bonusGenerations INTEGER NOT NULL DEFAULT 0`)
  } catch {
    // Column already exists — ignore
  }
  _bonusMigrated = true
}

let _dailyFreeMigrated = false
async function ensureDailyFreeColumns(): Promise<void> {
  if (_dailyFreeMigrated) return
  const client = await getClient()
  try {
    await client.execute(
      `ALTER TABLE subscriptions ADD COLUMN dailyFreeUsed INTEGER NOT NULL DEFAULT 0`
    )
  } catch { // Column already exists — ignore
  }
  try {
    await client.execute(
      `ALTER TABLE subscriptions ADD COLUMN lastFreeResetDate TEXT NOT NULL DEFAULT ''`
    )
  } catch { // Column already exists — ignore
  }
  _dailyFreeMigrated = true
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface SubscriptionInfo {
  plan: SubscriptionPlan
  generationsUsed: number
  generationsLimit: number    // Hard cap for the current billing period
  generationsLeft: number     // Remaining in the current billing period
  hasWatermark: boolean
  status: string
}

const FREE_DEFAULTS: SubscriptionInfo = {
  plan: 'free',
  generationsUsed: 0,
  generationsLimit: 3,
  generationsLeft: 3,
  hasWatermark: false,  // Overseas: limit enforcement is the paywall, not watermarking
  status: 'active',
}

export async function getSubscription(userId: string): Promise<SubscriptionInfo> {
  await ensureBonusColumn()
  await ensureDailyFreeColumns()
  const client = await getClient()
  const result = await client.execute({
    sql: `SELECT plan, status, generationsUsed, currentPeriodEnd, bonusGenerations,
             dailyFreeUsed, lastFreeResetDate
          FROM subscriptions WHERE userId = ?
          ORDER BY createdAt DESC LIMIT 1`,
    args: [userId],
  })

  if (result.rows.length === 0) return { ...FREE_DEFAULTS }

  const row = result.rows[0]
  const status = String(row.status)
  const currentPeriodEnd = Number(row.currentPeriodEnd ?? 0)

  // Treat canceled/expired subscriptions as free
  const isActive = (status === 'active' || status === 'trialing') && currentPeriodEnd > Date.now()
  if (!isActive) {
    // Free / expired plan — use daily reset logic
    const lastReset = String(row.lastFreeResetDate ?? '')
    const dailyUsed = lastReset === todayUtc() ? Number(row.dailyFreeUsed ?? 0) : 0
    return {
      plan: 'free',
      generationsUsed: dailyUsed,
      generationsLimit: 3,
      generationsLeft: Math.max(0, 3 - dailyUsed),
      hasWatermark: false,
      status: 'active',
    }
  }

  const plan = String(row.plan) as SubscriptionPlan
  const limit = PLAN_LIMITS[plan] ?? 3
  const used = Number(row.generationsUsed ?? 0)
  const bonus = Number(row.bonusGenerations ?? 0)
  const left = Math.max(0, (limit + bonus) - used)

  return {
    plan,
    generationsUsed: used,
    generationsLimit: limit,
    generationsLeft: left,
    hasWatermark: false, // Overseas only: no watermark at any plan level
    status,
  }
}

export async function upsertSubscription(params: {
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  plan: SubscriptionPlan
  status: string
  currentPeriodEnd: number
  resetGenerations?: boolean
}): Promise<void> {
  const client = await getClient()
  const existing = await client.execute({
    sql: 'SELECT id FROM subscriptions WHERE userId = ?',
    args: [params.userId],
  })

  if (existing.rows.length > 0) {
    await client.execute({
      sql: `UPDATE subscriptions
            SET stripeCustomerId = ?, stripeSubscriptionId = ?, plan = ?,
                status = ?, currentPeriodEnd = ?
                ${params.resetGenerations ? ', generationsUsed = 0' : ''}
            WHERE userId = ?`,
      args: [
        params.stripeCustomerId,
        params.stripeSubscriptionId,
        params.plan,
        params.status,
        params.currentPeriodEnd,
        params.userId,
      ],
    })
  } else {
    await client.execute({
      sql: `INSERT INTO subscriptions
            (id, userId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd, generationsUsed, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      args: [
        `sub_${crypto.randomBytes(8).toString('hex')}`,
        params.userId,
        params.stripeCustomerId,
        params.stripeSubscriptionId,
        params.plan,
        params.status,
        params.currentPeriodEnd,
        Date.now(),
      ],
    })
  }
}

export async function incrementGenerationsUsed(userId: string): Promise<void> {
  await ensureDailyFreeColumns()
  const client = await getClient()
  const existing = await client.execute({
    sql: 'SELECT id, plan, status, currentPeriodEnd FROM subscriptions WHERE userId = ?',
    args: [userId],
  })

  const today = todayUtc()

  if (existing.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO subscriptions
            (id, userId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd,
             generationsUsed, dailyFreeUsed, lastFreeResetDate, createdAt)
            VALUES (?, ?, '', '', 'free', 'active', ?, 1, 1, ?, ?)`,
      args: [
        `sub_${crypto.randomBytes(8).toString('hex')}`,
        userId,
        Date.now() + 365 * 86400_000,
        today,
        Date.now(),
      ],
    })
    return
  }

  const row = existing.rows[0]
  const status = String(row.status)
  const currentPeriodEnd = Number(row.currentPeriodEnd ?? 0)
  const isActive = (status === 'active' || status === 'trialing') && currentPeriodEnd > Date.now()
  const plan = String(row.plan) as SubscriptionPlan

  if (isActive && plan !== 'free') {
    // Paid plan — track monthly generationsUsed only
    await client.execute({
      sql: `UPDATE subscriptions SET generationsUsed = generationsUsed + 1 WHERE userId = ?`,
      args: [userId],
    })
  } else {
    // Free / expired — reset dailyFreeUsed if date changed, then increment
    await client.execute({
      sql: `UPDATE subscriptions
            SET dailyFreeUsed     = CASE WHEN lastFreeResetDate = ? THEN dailyFreeUsed + 1 ELSE 1 END,
                lastFreeResetDate = ?,
                generationsUsed   = generationsUsed + 1
            WHERE userId = ?`,
      args: [today, today, userId],
    })
  }
}

export async function incrementGenerationsUsedBy(userId: string, count: number): Promise<void> {
  await ensureDailyFreeColumns()
  const client = await getClient()
  const existing = await client.execute({
    sql: 'SELECT id, plan, status, currentPeriodEnd FROM subscriptions WHERE userId = ?',
    args: [userId],
  })

  const today = todayUtc()

  if (existing.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO subscriptions
            (id, userId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd,
             generationsUsed, dailyFreeUsed, lastFreeResetDate, createdAt)
            VALUES (?, ?, '', '', 'free', 'active', ?, ?, ?, ?, ?)`,
      args: [
        `sub_${crypto.randomBytes(8).toString('hex')}`,
        userId,
        Date.now() + 365 * 86400_000,
        count,
        count,
        today,
        Date.now(),
      ],
    })
    return
  }

  const row = existing.rows[0]
  const status = String(row.status)
  const currentPeriodEnd = Number(row.currentPeriodEnd ?? 0)
  const isActive = (status === 'active' || status === 'trialing') && currentPeriodEnd > Date.now()
  const plan = String(row.plan) as SubscriptionPlan

  if (isActive && plan !== 'free') {
    await client.execute({
      sql: `UPDATE subscriptions SET generationsUsed = generationsUsed + ? WHERE userId = ?`,
      args: [count, userId],
    })
  } else {
    await client.execute({
      sql: `UPDATE subscriptions
            SET dailyFreeUsed     = CASE WHEN lastFreeResetDate = ? THEN dailyFreeUsed + ? ELSE ? END,
                lastFreeResetDate = ?,
                generationsUsed   = generationsUsed + ?
            WHERE userId = ?`,
      args: [today, count, count, today, count, userId],
    })
  }
}

export const MAX_BONUS_GENERATIONS = 30

export async function addBonusGeneration(userId: string): Promise<boolean> {
  await ensureBonusColumn()
  const client = await getClient()

  const existing = await client.execute({
    sql: 'SELECT id, bonusGenerations FROM subscriptions WHERE userId = ?',
    args: [userId],
  })

  if (existing.rows.length === 0) {
    // Create a free subscription record to store bonus
    const id = `sub_${crypto.randomBytes(8).toString('hex')}`
    await client.execute({
      sql: `INSERT INTO subscriptions
            (id, userId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd, generationsUsed, bonusGenerations, createdAt)
            VALUES (?, ?, '', '', 'free', 'active', ?, 0, 1, ?)`,
      args: [id, userId, Date.now() + 30 * 86400_000, Date.now()],
    })
    return true
  }

  const currentBonus = Number(existing.rows[0].bonusGenerations ?? 0)
  if (currentBonus >= MAX_BONUS_GENERATIONS) return false

  await client.execute({
    sql: 'UPDATE subscriptions SET bonusGenerations = bonusGenerations + 1 WHERE userId = ?',
    args: [userId],
  })
  return true
}

/**
 * Adds up to `count` bonus generations, capped at MAX_BONUS_GENERATIONS total.
 * Returns the number actually added (may be less than count if cap is reached).
 */
export async function addBonusGenerationsBy(userId: string, count: number): Promise<number> {
  if (!Number.isFinite(count) || count <= 0) return 0
  await ensureBonusColumn()
  const client = await getClient()

  const existing = await client.execute({
    sql: 'SELECT id, bonusGenerations FROM subscriptions WHERE userId = ?',
    args: [userId],
  })

  if (existing.rows.length === 0) {
    const toAdd = Math.min(count, MAX_BONUS_GENERATIONS)
    const id = `sub_${crypto.randomBytes(8).toString('hex')}`
    await client.execute({
      sql: `INSERT INTO subscriptions
            (id, userId, stripeCustomerId, stripeSubscriptionId, plan, status,
             currentPeriodEnd, generationsUsed, bonusGenerations, createdAt)
            VALUES (?, ?, '', '', 'free', 'active', ?, 0, ?, ?)`,
      args: [id, userId, Date.now() + 30 * 86400_000, toAdd, Date.now()],
    })
    return toAdd
  }

  const currentBonus = Number(existing.rows[0].bonusGenerations ?? 0)
  const remainingCap = MAX_BONUS_GENERATIONS - currentBonus
  if (remainingCap <= 0) return 0
  const toAdd = Math.min(count, remainingCap)

  await client.execute({
    sql: 'UPDATE subscriptions SET bonusGenerations = bonusGenerations + ? WHERE userId = ?',
    args: [toAdd, userId],
  })
  return toAdd
}

/** Expose for test cleanup */
export function closeSubscriptionDb(): void {
  _bonusMigrated = false
  _dailyFreeMigrated = false
  // Subscriptions use the orders DB client — closing orders DB closes this too
}
