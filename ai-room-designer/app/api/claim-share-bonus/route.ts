import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { isOverseas } from '@/lib/region'
import { addBonusGeneration } from '@/lib/subscription'
import { getClient } from '@/lib/orders'

async function ensureShareClaimsTable(): Promise<void> {
  const db = await getClient()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS share_claims (
      userId TEXT NOT NULL,
      claimDate TEXT NOT NULL,
      PRIMARY KEY (userId, claimDate)
    )
  `)
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function POST(req: NextRequest) {
  if (!isOverseas) return NextResponse.json({ error: 'not_available' }, { status: 404 })

  const session = await getServerSession(req)
  if (!session?.userId) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  await ensureShareClaimsTable()
  const db = await getClient()
  const today = todayUtc()

  // One claim per user per day
  try {
    await db.execute({
      sql: 'INSERT INTO share_claims (userId, claimDate) VALUES (?, ?)',
      args: [session.userId, today],
    })
  } catch {
    // Already claimed today
    return NextResponse.json({ alreadyClaimed: true })
  }

  const awarded = await addBonusGeneration(session.userId)
  return NextResponse.json({ awarded })
}
