import { NextRequest, NextResponse } from 'next/server'
import { getOrder } from '@/lib/orders'

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const order = await getOrder(params.orderId)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({
      status: order.status,
      resultUrl: order.resultUrl,
      style: order.style,
    })
  } catch (err) {
    console.error('order-status error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
