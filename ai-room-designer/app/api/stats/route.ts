// ai-room-designer/app/api/stats/route.ts
import { NextResponse } from 'next/server'
import { getClient } from '@/lib/orders'

export async function GET() {
  try {
    const db = await getClient()
    const result = await db.execute(
      `SELECT COUNT(*) as total FROM orders WHERE status = 'done'`
    )
    const raw = Number(result.rows[0]?.total ?? 0)
    const total = Math.floor(raw / 100) * 100
    return NextResponse.json(
      { totalOrders: total },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
    )
  } catch (err) {
    console.error('[api/stats] DB query failed:', err)
    return NextResponse.json(
      { totalOrders: 12000 },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
    )
  }
}
