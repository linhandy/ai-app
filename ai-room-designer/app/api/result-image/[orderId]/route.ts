import { NextRequest, NextResponse } from 'next/server'
import { getOrder, getOrderResultData } from '@/lib/orders'
import { applyWatermark } from '@/lib/watermark'

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } },
) {
  const { orderId } = params

  const order = await getOrder(orderId)
  if (!order || order.status !== 'done') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let data = await getOrderResultData(orderId)
  if (!data) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  // Apply watermark at serve time for free orders
  if (order.isFree) {
    data = await applyWatermark(data)
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
