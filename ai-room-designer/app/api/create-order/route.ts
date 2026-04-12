import { NextRequest, NextResponse } from 'next/server'
import { createOrder, updateOrder, type DesignMode, type QualityTier } from '@/lib/orders'
import { createQROrder } from '@/lib/alipay'
import { UPLOAD_DIR } from '@/lib/paths'
import { logger } from '@/lib/logger'
import { isRateLimited } from '@/lib/rate-limit'
import { ALL_ROOM_TYPE_KEYS, ALL_STYLE_KEYS, DESIGN_MODES } from '@/lib/design-config'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'

const QUALITY_PRICE: Record<string, number> = {
  standard: 1,
  premium: 3,
  ultra: 5,
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(`create-order:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
  }

  try {
    const {
      uploadId,
      style,
      quality = 'standard',
      mode = 'redesign',
      roomType = 'living_room',
      customPrompt,
    } = await req.json() as {
      uploadId: string
      style: string
      quality?: QualityTier
      mode?: DesignMode
      roomType?: string
      customPrompt?: string
    }

    if (!uploadId || !style) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 })
    }

    if (!ALL_ROOM_TYPE_KEYS.includes(roomType)) {
      return NextResponse.json({ error: '无效的房间类型' }, { status: 400 })
    }

    if (!ALL_STYLE_KEYS.includes(style)) {
      return NextResponse.json({ error: '无效的风格' }, { status: 400 })
    }

    const validModes: string[] = DESIGN_MODES.map((m) => m.key)
    if (!validModes.includes(mode as string)) {
      return NextResponse.json({ error: '无效的设计模式' }, { status: 400 })
    }

    const trimmedPrompt = customPrompt?.trim().slice(0, 200) || undefined

    const amount = QUALITY_PRICE[quality] ?? 1

    const uploadPath = path.resolve(path.join(UPLOAD_DIR, uploadId))
    if (!uploadPath.startsWith(path.resolve(UPLOAD_DIR))) {
      return NextResponse.json({ error: 'Invalid upload ID' }, { status: 400 })
    }
    if (!fs.existsSync(uploadPath)) {
      return NextResponse.json({ error: '上传文件不存在，请重新上传' }, { status: 400 })
    }

    const order = await createOrder({ style, uploadId, quality, mode, roomType, customPrompt: trimmedPrompt })

    logger.info('create-order', 'Order created', { orderId: order.id, style, quality, mode, roomType, amount })

    if (process.env.DEV_SKIP_PAYMENT === 'true') {
      await updateOrder(order.id, { status: 'paid' })
      logger.info('create-order', 'DEV_SKIP_PAYMENT: order auto-paid', { orderId: order.id })
      return NextResponse.json({ orderId: order.id, devSkip: true })
    }

    const qrCodeUrl = await createQROrder({ orderId: order.id, style, amount })
    const qrDataUrl = await QRCode.toDataURL(qrCodeUrl, { width: 240, margin: 2 })

    return NextResponse.json({ orderId: order.id, qrDataUrl })
  } catch (err) {
    logger.error('create-order', 'Failed to create order', { error: String(err) })
    return NextResponse.json({ error: '创建订单失败，请重试' }, { status: 500 })
  }
}
