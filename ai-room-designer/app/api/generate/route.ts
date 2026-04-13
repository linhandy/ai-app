import { NextRequest, NextResponse } from 'next/server'
import { getOrder, updateOrder } from '@/lib/orders'
import { generateRoomImage } from '@/lib/zenmux'
import { UPLOAD_DIR } from '@/lib/paths'
import { logger } from '@/lib/logger'
import path from 'path'
import fs from 'fs'

export async function POST(req: NextRequest) {
  let orderId: string | undefined

  try {
    const body = await req.json()
    orderId = body.orderId

    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

    const order = await getOrder(orderId)
    if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    if (order.status !== 'paid') {
      return NextResponse.json({ error: '订单未完成支付' }, { status: 402 })
    }

    await updateOrder(orderId, { status: 'generating' })
    logger.info('generate', 'Starting AI generation', { orderId, style: order.style, quality: order.quality })

    const startTime = Date.now()
    const imagePath = order.uploadId
      ? path.join(UPLOAD_DIR, order.uploadId)
      : null
    const resultBuffer = await generateRoomImage({
      imagePath,
      style: order.style,
      quality: order.quality,
      mode: order.mode,
      roomType: order.roomType,
      customPrompt: order.customPrompt,
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    logger.info('generate', 'AI generation complete', { orderId, duration: `${duration}s`, size: resultBuffer.length })

    // Save generated image to disk
    const resultFilename = `result-${orderId}.png`
    const resultPath = path.join(UPLOAD_DIR, resultFilename)
    fs.writeFileSync(resultPath, resultBuffer)

    // Store a URL that the preview API can serve
    const resultUrl = `/api/preview?uploadId=${encodeURIComponent(resultFilename)}`
    await updateOrder(orderId, { status: 'done', resultUrl })

    return NextResponse.json({ resultUrl })
  } catch (err) {
    logger.error('generate', 'AI generation failed', { orderId, error: String(err) })
    if (orderId) await updateOrder(orderId, { status: 'failed' })
    return NextResponse.json({ error: 'AI生成失败，请稍后重试' }, { status: 500 })
  }
}
