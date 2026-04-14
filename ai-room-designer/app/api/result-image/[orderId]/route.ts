import { NextRequest, NextResponse } from 'next/server'
import { getOrder, getOrderResultData } from '@/lib/orders'
import { applyWatermark } from '@/lib/watermark'
import sharp from 'sharp'

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

  // Compress large images to JPEG to stay under Vercel's 4.5 MB response limit
  let outBuffer: Buffer
  let contentType = 'image/png'
  if (data.length > 3_000_000) {
    outBuffer = await sharp(data).jpeg({ quality: 85 }).toBuffer()
    contentType = 'image/jpeg'
  } else {
    outBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
  }

  return new NextResponse(outBuffer.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
