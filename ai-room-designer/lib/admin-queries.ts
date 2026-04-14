import { getClient } from '@/lib/orders'

const QUALITY_PRICE: Record<string, number> = {
  standard: 1,
  premium: 3,
  ultra: 5,
}

export interface OrderStats {
  todayCount: number
  weekCount: number
  monthCount: number
  totalCount: number
  totalGmv: number
  todayGmv: number
}

export interface RecentOrder {
  id: string
  status: string
  style: string
  quality: string
  mode: string
  createdAt: number
  amount: number
}

export interface GenerationMetrics {
  successRate: number
  avgDurationMs: number
  totalCount: number
  failedCount: number
}

export interface UserStats {
  totalUsers: number
  todayNewUsers: number
}

function dayStart(offsetDays = 0): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - offsetDays)
  return d.getTime()
}

export async function getOrderStats(): Promise<OrderStats> {
  const db = await getClient()
  const todayTs = dayStart()
  const weekTs = dayStart(7)
  const monthTs = dayStart(30)

  const [today, week, month, total] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) as c FROM orders WHERE status = 'done' AND createdAt >= ?`, args: [todayTs] }),
    db.execute({ sql: `SELECT COUNT(*) as c FROM orders WHERE status = 'done' AND createdAt >= ?`, args: [weekTs] }),
    db.execute({ sql: `SELECT COUNT(*) as c FROM orders WHERE status = 'done' AND createdAt >= ?`, args: [monthTs] }),
    db.execute({ sql: `SELECT COUNT(*) as c FROM orders WHERE status = 'done'`, args: [] }),
  ])

  const allDone = await db.execute({ sql: `SELECT quality FROM orders WHERE status = 'done'`, args: [] })
  const totalGmv = allDone.rows.reduce((sum, r) => sum + (QUALITY_PRICE[String(r.quality)] ?? 1), 0)

  const todayDone = await db.execute({ sql: `SELECT quality FROM orders WHERE status = 'done' AND createdAt >= ?`, args: [todayTs] })
  const todayGmv = todayDone.rows.reduce((sum, r) => sum + (QUALITY_PRICE[String(r.quality)] ?? 1), 0)

  return {
    todayCount: Number(today.rows[0].c),
    weekCount: Number(week.rows[0].c),
    monthCount: Number(month.rows[0].c),
    totalCount: Number(total.rows[0].c),
    totalGmv,
    todayGmv,
  }
}

export async function getRecentOrders(limit = 100): Promise<RecentOrder[]> {
  const db = await getClient()
  const result = await db.execute({
    sql: `SELECT id, status, style, quality, mode, createdAt FROM orders ORDER BY createdAt DESC LIMIT ?`,
    args: [limit],
  })
  return result.rows.map((r) => ({
    id: String(r.id),
    status: String(r.status),
    style: String(r.style),
    quality: String(r.quality ?? 'standard'),
    mode: String(r.mode ?? 'redesign'),
    createdAt: Number(r.createdAt),
    amount: QUALITY_PRICE[String(r.quality ?? 'standard')] ?? 1,
  }))
}

export async function getGenerationMetrics(): Promise<GenerationMetrics> {
  const db = await getClient()
  const result = await db.execute({
    sql: `SELECT status, createdAt, updatedAt FROM orders WHERE status IN ('done', 'failed') AND createdAt >= ?`,
    args: [dayStart(7)],
  })

  const rows = result.rows
  const total = rows.length
  const failed = rows.filter((r) => r.status === 'failed').length
  const done = rows.filter((r) => r.status === 'done')

  const avgDurationMs = done.length > 0
    ? done.reduce((sum, r) => sum + (Number(r.updatedAt) - Number(r.createdAt)), 0) / done.length
    : 0

  return {
    successRate: total > 0 ? (total - failed) / total : 0,
    avgDurationMs,
    totalCount: total,
    failedCount: failed,
  }
}

export async function getUserStats(): Promise<UserStats> {
  const db = await getClient()
  const todayTs = dayStart()

  try {
    const [total, today] = await Promise.all([
      db.execute({ sql: `SELECT COUNT(*) as c FROM users`, args: [] }),
      db.execute({ sql: `SELECT COUNT(*) as c FROM users WHERE createdAt >= ?`, args: [todayTs] }),
    ])
    return { totalUsers: Number(total.rows[0].c), todayNewUsers: Number(today.rows[0].c) }
  } catch {
    return { totalUsers: 0, todayNewUsers: 0 }
  }
}
