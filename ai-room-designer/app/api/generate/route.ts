import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { getOrder, updateOrder, setOrderResultData, getUploadData } from '@/lib/orders'
import { generateRoomImage } from '@/lib/zenmux'
import { getPublicUrl, resultStoragePath } from '@/lib/storage'
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

    // Unlock mode: mark linked free order as paid (watermark removed at serve time)
    if ((order.mode as string) === 'unlock' && order.uploadId) {
      const linkedOrderId = order.uploadId
      const linked = await getOrder(linkedOrderId)
      if (!linked) {
        await updateOrder(orderId, { status: 'failed' })
        return NextResponse.json({ error: '原订单不存在' }, { status: 404 })
      }
      // Use CDN URL if result is in Storage, else proxy endpoint (backward compat for old orders)
      const { getClient } = await import('@/lib/orders')
      const dbClient = await getClient()
      const linkedRow = await dbClient.execute({
        sql: `SELECT resultStoragePath FROM orders WHERE id = ?`,
        args: [linkedOrderId],
      })
      const hasStoragePath = !!linkedRow.rows[0]?.resultStoragePath
      const cleanUrl = hasStoragePath
        ? getPublicUrl(resultStoragePath(linkedOrderId))
        : `/api/result-image/${linkedOrderId}`
      await updateOrder(linkedOrderId, { isFree: false, resultUrl: cleanUrl })
      await updateOrder(orderId, { status: 'done', resultUrl: cleanUrl })
      return NextResponse.json({ resultUrl: cleanUrl })
    }

    const startTime = Date.now()

    // Get uploaded image — try DB first (serverless), then filesystem fallback (local dev)
    let imagePath: string | null = null
    if (order.uploadId) {
      const uploadData = await getUploadData(order.uploadId)
      if (uploadData) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true })
        imagePath = path.join(UPLOAD_DIR, order.uploadId)
        fs.writeFileSync(imagePath, uploadData)
      } else {
        const fsPath = path.join(UPLOAD_DIR, order.uploadId)
        if (fs.existsSync(fsPath)) imagePath = fsPath
      }
    }

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

    // Store result in Supabase Storage — watermark applied at serve time for free orders
    await setOrderResultData(orderId, resultBuffer)

    // Paid orders: return CDN URL directly (no proxy needed, no watermark)
    // Free orders: return proxy endpoint that applies watermark on the fly
    const resultUrl = order.isFree
      ? `/api/result-image/${orderId}`
      : getPublicUrl(resultStoragePath(orderId))

    await updateOrder(orderId, { status: 'done', resultUrl })

    return NextResponse.json({ resultUrl })
  } catch (err) {
    logger.error('generate', 'AI generation failed', { orderId, error: String(err) })
    if (orderId) await updateOrder(orderId, { status: 'failed' })
    return NextResponse.json({ error: 'AI生成失败，请稍后重试' }, { status: 500 })
  }
}
