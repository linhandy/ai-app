import { NextRequest, NextResponse } from 'next/server'
import { parseSessionToken } from '@/lib/auth'
import { createOrder, getOrder, updateOrder, type DesignMode, type QualityTier } from '@/lib/orders'
import { createQROrder } from '@/lib/alipay'
import { getRemainingFreeUses, consumeFreeUse } from '@/lib/free-uses'
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
      style = '',
      quality = 'standard',
      mode = 'redesign',
      roomType = 'living_room',
      customPrompt,
      unlockOrderId,          // new: orderId of the free order to unlock
    } = await req.json() as {
      uploadId?: string
      style?: string
      quality?: QualityTier
      mode?: DesignMode
      roomType?: string
      customPrompt?: string
      unlockOrderId?: string  // new
    }

    // Unlock flow: pay ¥1 to remove watermark from a free order
    if (unlockOrderId) {
      const targetOrder = await getOrder(unlockOrderId)
      if (!targetOrder || !targetOrder.isFree || targetOrder.status !== 'done') {
        return NextResponse.json({ error: '无效的解锁订单' }, { status: 400 })
      }
      const unlockOrder = await createOrder({
        style: 'unlock',
        uploadId: unlockOrderId,
        quality: 'standard',
        mode: 'unlock' as DesignMode,
        roomType: 'living_room',
      })
      const qrCodeUrl = await createQROrder({ orderId: unlockOrder.id, style: '去水印', amount: 1 })
      const qrDataUrl = await QRCode.toDataURL(qrCodeUrl, { width: 240, margin: 2 })
      return NextResponse.json({ orderId: unlockOrder.id, qrDataUrl })
    }

    const validModes: string[] = DESIGN_MODES.map((m) => m.key)
    if ((mode as string) !== 'unlock' && !validModes.includes(mode as string)) {
      return NextResponse.json({ error: '无效的设计模式' }, { status: 400 })
    }

    const modeConfig = DESIGN_MODES.find((m) => m.key === mode)!

    // uploadId required for all modes that need an upload
    if (modeConfig.needsUpload && !uploadId) {
      return NextResponse.json({ error: '请先上传图片' }, { status: 400 })
    }

    if (!ALL_ROOM_TYPE_KEYS.includes(roomType)) {
      return NextResponse.json({ error: '无效的房间类型' }, { status: 400 })
    }

    // style only validated when this mode requires a style selection
    if (modeConfig.needsStyle && !ALL_STYLE_KEYS.includes(style)) {
      return NextResponse.json({ error: '无效的风格' }, { status: 400 })
    }

    const trimmedPrompt = customPrompt?.trim().slice(0, 200) || undefined

    const amount = QUALITY_PRICE[quality] ?? 1

    // File existence check only when an upload is required
    if (modeConfig.needsUpload && uploadId) {
      const uploadPath = path.resolve(path.join(UPLOAD_DIR, uploadId))
      if (!uploadPath.startsWith(path.resolve(UPLOAD_DIR))) {
        return NextResponse.json({ error: 'Invalid upload ID' }, { status: 400 })
      }
      if (!fs.existsSync(uploadPath)) {
        return NextResponse.json({ error: '上传文件不存在，请重新上传' }, { status: 400 })
      }
    }

    // Extract userId from session cookie (optional — guests have no userId)
    const sessionToken = req.cookies.get('session')?.value
    const session = sessionToken ? parseSessionToken(sessionToken) : null
    const userId = session?.userId

    // Free tier check: if IP has quota, skip Alipay
    const remaining = await getRemainingFreeUses(ip)
    const isFree = remaining > 0

    if (isFree) {
      await consumeFreeUse(ip)
    }

    const order = await createOrder({
      style,
      uploadId: uploadId ?? null,
      quality,
      mode,
      roomType,
      customPrompt: trimmedPrompt,
      isFree,
      userId,
    })

    logger.info('create-order', 'Order created', { orderId: order.id, style, quality, mode, roomType, amount })

    if (process.env.DEV_SKIP_PAYMENT === 'true') {
      await updateOrder(order.id, { status: 'paid' })
      logger.info('create-order', 'DEV_SKIP_PAYMENT: order auto-paid', { orderId: order.id })
      return NextResponse.json({ orderId: order.id, devSkip: true })
    }

    if (isFree) {
      await updateOrder(order.id, { status: 'paid' })
      return NextResponse.json({ orderId: order.id, isFree: true })
    }

    const qrCodeUrl = await createQROrder({ orderId: order.id, style, amount })
    const qrDataUrl = await QRCode.toDataURL(qrCodeUrl, { width: 240, margin: 2 })

    return NextResponse.json({ orderId: order.id, qrDataUrl, remainingFreeUses: Math.max(0, remaining - 1) })
  } catch (err) {
    logger.error('create-order', 'Failed to create order', { error: String(err) })
    const e = err as Error
    return NextResponse.json({ error: '创建订单失败，请重试', _d: String(err), _stack: e.stack?.split('\n').slice(0,5) }, { status: 500 })
  }
}
