import { NextRequest, NextResponse } from 'next/server'
import { parseSessionToken } from '@/lib/auth'
import { getOrdersByUserId } from '@/lib/orders'

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get('session')?.value
  const session = sessionToken ? parseSessionToken(sessionToken) : null

  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const orders = await getOrdersByUserId(session.userId)

  const items = orders.map((o) => ({
    orderId: o.id,
    style: o.style,
    mode: o.mode,
    quality: o.quality,
    resultUrl: o.resultUrl,
    createdAt: o.createdAt,
    status: o.status,
  }))

  return NextResponse.json({ items })
}
