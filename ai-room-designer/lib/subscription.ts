import { getClient } from './orders'
import crypto from 'crypto'

export type SubscriptionPlan = 'free' | 'pro' | 'unlimited'

const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  free:      3,
  pro:       150,
  unlimited: -1,   // -1 = unlimited
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

export interface SubscriptionInfo {
  plan: SubscriptionPlan
  generationsUsed: number
  generationsLimit: number    // -1 = unlimited
  generationsLeft: number     // Infinity when unlimited
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
  const client = await getClient()
  const result = await client.execute({
    sql: `SELECT plan, status, generationsUsed, currentPeriodEnd, bonusGenerations
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
  if (!isActive) return { ...FREE_DEFAULTS }

  const plan = String(row.plan) as SubscriptionPlan
  const limit = PLAN_LIMITS[plan] ?? 3
  const used = Number(row.generationsUsed ?? 0)
  const bonus = Number(row.bonusGenerations ?? 0)
  const left = limit === -1 ? Infinity : Math.max(0, (limit + bonus) - used)

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
  const client = await getClient()
  // Ensure a free subscription record exists so the counter can increment
  const existing = await client.execute({
    sql: 'SELECT id FROM subscriptions WHERE userId = ?',
    args: [userId],
  })
  if (existing.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO subscriptions
            (id, userId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd, generationsUsed, createdAt)
            VALUES (?, ?, '', '', 'free', 'active', ?, 1, ?)`,
      args: [`sub_${crypto.randomBytes(8).toString('hex')}`, userId, Date.now() + 365 * 86400_000, Date.now()],
    })
  } else {
    await client.execute({
      sql: `UPDATE subscriptions SET generationsUsed = generationsUsed + 1 WHERE userId = ?`,
      args: [userId],
    })
  }
}

const MAX_BONUS_GENERATIONS = 5

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

/** Expose for test cleanup */
export function closeSubscriptionDb(): void {
  _bonusMigrated = false
  // Subscriptions use the orders DB client — closing orders DB closes this too
}
