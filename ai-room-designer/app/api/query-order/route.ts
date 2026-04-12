import { NextRequest, NextResponse } from 'next/server'
import { getOrder } from '@/lib/orders'

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const order = getOrder(orderId)
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  return NextResponse.json({
    status: order.status,
    resultUrl: order.resultUrl ?? null,
  })
}
