// lib/credits.ts
import { getClient } from './orders'

export const PACKAGES = [
  { id: 'pkg_5', label: '基础包', count: 5, price: 9.9, quality: 'standard' as const, badge: null },
  { id: 'pkg_10', label: '进阶包', count: 10, price: 29.9, quality: 'premium' as const, badge: '最受欢迎' },
  { id: 'pkg_50', label: '专业包', count: 50, price: 99, quality: 'ultra' as const, badge: '最划算' },
] as const

export type PackageId = typeof PACKAGES[number]['id']

export async function ensureCreditsTable() {
  const db = await getClient()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS credits (
      owner TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0,
      total_purchased INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )
  `)
}

export async function getBalance(owner: string): Promise<number> {
  await ensureCreditsTable()
  const db = await getClient()
  const row = await db.execute({ sql: 'SELECT balance FROM credits WHERE owner = ?', args: [owner] })
  return (row.rows[0]?.balance as number) ?? 0
}

export async function addCredits(owner: string, amount: number): Promise<void> {
  await ensureCreditsTable()
  const db = await getClient()
  const now = Date.now()
  await db.execute({
    sql: `INSERT INTO credits (owner, balance, total_purchased, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(owner) DO UPDATE SET
            balance = balance + ?,
            total_purchased = total_purchased + ?,
            updated_at = ?`,
    args: [owner, amount, amount, now, amount, amount, now],
  })
}

export async function consumeCredit(owner: string): Promise<boolean> {
  await ensureCreditsTable()
  const db = await getClient()
  const now = Date.now()
  const result = await db.execute({
    sql: 'UPDATE credits SET balance = balance - 1, updated_at = ? WHERE owner = ? AND balance > 0',
    args: [now, owner],
  })
  return (result.rowsAffected ?? 0) > 0
}
