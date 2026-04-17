import { NextRequest, NextResponse } from 'next/server'
import { parseSessionToken, getServerSession } from '@/lib/auth'
import { createOrder, getOrder, updateOrder, getUploadData, type DesignMode, type QualityTier } from '@/lib/orders'
import { createQROrder } from '@/lib/alipay'
import { logger } from '@/lib/logger'
import { isRateLimited } from '@/lib/rate-limit'
import { getBalance, consumeCredit } from '@/lib/credits'
import { ALL_ROOM_TYPE_KEYS, ALL_STYLE_KEYS, DESIGN_MODES } from '@/lib/design-config'
import { isOverseas } from '@/lib/region'
import { ERR } from '@/lib/errors'
import { getSubscription, incrementGenerationsUsed } from '@/lib/subscription'
import QRCode from 'qrcode'

const QUALITY_PRICE: Record<string, number> = {
  standard: 1,
  premium: 3,
  ultra: 5,
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(`create-order:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: ERR.rateLimited }, { status: 429 })
  }

  try {
    // Read body once — used by both CN and overseas paths
    const body = await req.json() as {
      uploadId?: string
      referenceUploadId?: string
      style?: string
      quality?: QualityTier
      mode?: DesignMode
      roomType?: string
      customPrompt?: string
      unlockOrderId?: string
    }
    const {
      uploadId,
      referenceUploadId,
      style = '',
      quality = 'standard',
      mode = 'redesign',
      roomType = 'living_room',
      customPrompt,
      unlockOrderId,
    } = body

    // ── OVERSEAS PATH ──────────────────────────────────────────────────────────
    if (isOverseas) {
      const session = await getServerSession(req)
      if (!session) return NextResponse.json({ error: ERR.authRequired }, { status: 401 })

      const validModes: string[] = DESIGN_MODES.map((m) => m.key)
      if (!validModes.includes(mode as string)) return NextResponse.json({ error: ERR.invalidMode }, { status: 400 })
      const modeConfig = DESIGN_MODES.find((m) => m.key === mode)!
      if (modeConfig.needsStyle && !ALL_STYLE_KEYS.includes(style)) return NextResponse.json({ error: ERR.invalidStyle }, { status: 400 })
      if (!ALL_ROOM_TYPE_KEYS.includes(roomType)) return NextResponse.json({ error: ERR.invalidRoomType }, { status: 400 })
      if (modeConfig.needsUpload && !uploadId) return NextResponse.json({ error: ERR.uploadMissing }, { status: 400 })

      if (modeConfig.needsUpload && uploadId) {
        const uploadData = await getUploadData(uploadId)
        if (!uploadData) return NextResponse.json({ error: ERR.fileNotFound }, { status: 400 })
      }

      // style-match requires a reference upload
      if (mode === 'style-match') {
        if (!referenceUploadId) return NextResponse.json({ error: ERR.uploadMissing }, { status: 400 })
        const refData = await getUploadData(referenceUploadId)
        if (!refData) return NextResponse.json({ error: ERR.fileNotFound }, { status: 400 })
      }

      const sub = await getSubscription(session.userId)
      if (sub.generationsLeft === 0) {
        return NextResponse.json({ error: ERR.upgradeRequired, upgradeUrl: '/pricing' }, { status: 402 })
      }

      const trimmedPrompt = customPrompt?.trim().slice(0, 200) || undefined
      const isFree = false  // Overseas: generation limit is the paywall; no watermarks

      const order = await createOrder({
        style,
        uploadId: uploadId ?? null,
        referenceUploadId: referenceUploadId ?? undefined,
        quality,
        mode,
        roomType,
        customPrompt: trimmedPrompt,
        isFree,
        userId: session.userId,
      })
      await updateOrder(order.id, { status: 'paid' })
      await incrementGenerationsUsed(session.userId)
      logger.info('create-order', 'Overseas order created', { orderId: order.id, plan: sub.plan })
      return NextResponse.json({ orderId: order.id })
    }
    // ── END OVERSEAS PATH ──────────────────────────────────────────────────────

    // Unlock flow (CN only)
    if (unlockOrderId) {
      const targetOrder = await getOrder(unlockOrderId)
      if (!targetOrder || !targetOrder.isFree || targetOrder.status !== 'done') {
        return NextResponse.json({ error: ERR.invalidUnlock }, { status: 400 })
      }
      const unlockAmount = QUALITY_PRICE[targetOrder.quality] ?? 1
      const unlockOrder = await createOrder({
        style: 'unlock',
        uploadId: unlockOrderId,
        quality: targetOrder.quality,
        mode: 'unlock' as DesignMode,
        roomType: 'living_room',
      })
      const qrCodeUrl = await createQROrder({ orderId: unlockOrder.id, style: '去水印', amount: unlockAmount })
      const qrDataUrl = await QRCode.toDataURL(qrCodeUrl, { width: 240, margin: 2 })
      return NextResponse.json({ orderId: unlockOrder.id, qrDataUrl })
    }

    const validModes: string[] = DESIGN_MODES.map((m) => m.key)
    if ((mode as string) !== 'unlock' && !validModes.includes(mode as string)) {
      return NextResponse.json({ error: ERR.invalidMode }, { status: 400 })
    }

    const modeConfig = DESIGN_MODES.find((m) => m.key === mode)!

    if (modeConfig.needsUpload && !uploadId) {
      return NextResponse.json({ error: ERR.uploadMissing }, { status: 400 })
    }

    if (!ALL_ROOM_TYPE_KEYS.includes(roomType)) {
      return NextResponse.json({ error: ERR.invalidRoomType }, { status: 400 })
    }

    if (modeConfig.needsStyle && !ALL_STYLE_KEYS.includes(style)) {
      return NextResponse.json({ error: ERR.invalidStyle }, { status: 400 })
    }

    const trimmedPrompt = customPrompt?.trim().slice(0, 200) || undefined

    if (modeConfig.needsUpload && uploadId) {
      const uploadData = await getUploadData(uploadId)
      if (!uploadData) return NextResponse.json({ error: ERR.fileNotFound }, { status: 400 })
    }

    const sessionToken = req.cookies.get('session')?.value
    const session = sessionToken ? parseSessionToken(sessionToken) : null
    const userId = session?.userId

    const owner = session?.userId ?? ip
    const creditBalance = await getBalance(owner)
    if (creditBalance > 0) {
      const consumed = await consumeCredit(owner)
      if (consumed) {
        const order = await createOrder({ style, uploadId: uploadId ?? null, quality, mode, roomType, customPrompt: trimmedPrompt, userId: session?.userId, isFree: false })
        await updateOrder(order.id, { status: 'paid' })
        return NextResponse.json({ orderId: order.id, creditUsed: true })
      }
    }

    const order = await createOrder({
      style, uploadId: uploadId ?? null, quality, mode, roomType, customPrompt: trimmedPrompt,
      isFree: true, userId,
    })

    await updateOrder(order.id, { status: 'paid' })
    logger.info('create-order', 'Order created (free generation)', { orderId: order.id, style, quality, mode, roomType })

    return NextResponse.json({ orderId: order.id })
  } catch (err) {
    logger.error('create-order', 'Failed to create order', { error: String(err) })
    return NextResponse.json({ error: ERR.orderFailed }, { status: 500 })
  }
}
