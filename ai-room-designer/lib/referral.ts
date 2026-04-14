import { getClient } from '@/lib/orders'
import { rewardFreeUse } from '@/lib/free-uses'

const MAX_REFERRAL_REWARDS = 10 // max bonus uses per IP via sharing

// closeDb is a no-op here since we share the orders client
// but exported for test teardown compatibility
export function closeDb(): void {
  // no-op: uses shared getClient() from orders
}

async function ensureTables(): Promise<void> {
  const db = await getClient()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS referral_clicks (
      ref_code    TEXT NOT NULL,
      visitor_ip  TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      PRIMARY KEY (ref_code, visitor_ip)
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS referral_rewards (
      ip          TEXT PRIMARY KEY,
      reward_count INTEGER NOT NULL DEFAULT 0
    )
  `)
}

/**
 * Records a referral click and rewards both parties if the visitor is new.
 * Returns true if rewards were granted, false if this visitor already clicked.
 */
export async function recordReferralClick({
  refCode,
  sharerIp,
  visitorIp,
}: {
  refCode: string
  sharerIp: string
  visitorIp: string
}): Promise<boolean> {
  await ensureTables()
  const db = await getClient()

  // Check for duplicate
  const existing = await db.execute({
    sql: 'SELECT 1 FROM referral_clicks WHERE ref_code = ? AND visitor_ip = ?',
    args: [refCode, visitorIp],
  })
  if (existing.rows.length > 0) return false

  // Don't reward self-referral
  if (visitorIp === sharerIp) return false

  // Check sharer reward cap
  const sharerRewards = await db.execute({
    sql: 'SELECT reward_count FROM referral_rewards WHERE ip = ?',
    args: [sharerIp],
  })
  const sharerCount = sharerRewards.rows.length > 0 ? Number(sharerRewards.rows[0].reward_count) : 0
  if (sharerCount >= MAX_REFERRAL_REWARDS) {
    // Record the click but don't reward
    await db.execute({
      sql: 'INSERT INTO referral_clicks (ref_code, visitor_ip, created_at) VALUES (?, ?, ?)',
      args: [refCode, visitorIp, Date.now()],
    })
    return false
  }

  // Record click
  await db.execute({
    sql: 'INSERT INTO referral_clicks (ref_code, visitor_ip, created_at) VALUES (?, ?, ?)',
    args: [refCode, visitorIp, Date.now()],
  })

  // Reward both parties
  await Promise.all([
    rewardFreeUse(sharerIp),
    rewardFreeUse(visitorIp),
  ])

  // Increment sharer reward counter
  await db.execute({
    sql: `INSERT INTO referral_rewards (ip, reward_count) VALUES (?, 1)
          ON CONFLICT(ip) DO UPDATE SET reward_count = reward_count + 1`,
    args: [sharerIp],
  })

  return true
}

/** Returns how many unique visitors have clicked this refCode. */
export async function getReferralCount(refCode: string): Promise<number> {
  await ensureTables()
  const db = await getClient()
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as c FROM referral_clicks WHERE ref_code = ?',
    args: [refCode],
  })
  return Number(result.rows[0].c)
}
