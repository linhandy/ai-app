import { NextRequest, NextResponse } from 'next/server'
import { getOrder, updateOrder } from '@/lib/orders'
import { generateRoomImage } from '@/lib/zenmux'
import { UPLOAD_DIR } from '@/lib/paths'
import path from 'path'

export async function POST(req: NextRequest) {
  let orderId: string | undefined

  try {
    const body = await req.json()
    orderId = body.orderId

    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

    const order = getOrder(orderId)
    if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    if (order.status !== 'paid') {
      return NextResponse.json({ error: '订单未完成支付' }, { status: 402 })
    }

    updateOrder(orderId, { status: 'generating' })

    const imagePath = path.join(UPLOAD_DIR, order.uploadId)
    const resultUrl = await generateRoomImage({ imagePath, style: order.style })

    updateOrder(orderId, { status: 'done', resultUrl })

    return NextResponse.json({ resultUrl })
  } catch (err) {
    console.error('[generate]', err)
    if (orderId) updateOrder(orderId, { status: 'failed' })
    return NextResponse.json({ error: 'AI生成失败，请联系退款' }, { status: 500 })
  }
}
