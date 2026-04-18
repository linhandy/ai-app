import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { createOrder, updateOrder, getUploadData } from '@/lib/orders'
import { getSubscription, incrementGenerationsUsedBy } from '@/lib/subscription'
import { ALL_STYLE_KEYS, ALL_ROOM_TYPE_KEYS, DESIGN_MODES } from '@/lib/design-config'
import { isRateLimited } from '@/lib/rate-limit'
import { isOverseas } from '@/lib/region'
import { ERR } from '@/lib/errors'
import { logger } from '@/lib/logger'
import type { QualityTier, DesignMode } from '@/lib/orders'

const MAX_BATCH_STYLES = 8
const MIN_BATCH_STYLES = 2

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (isRateLimited(`batch-generate:${ip}`, 5, 60_000)) {
      return NextResponse.json({ error: ERR.rateLimited }, { status: 429 })
    }

    if (!isOverseas) {
      return NextResponse.json({ error: 'Not available' }, { status: 403 })
    }

    const session = await getServerSession(req)
    if (!session) {
      return NextResponse.json({ error: ERR.authRequired, signInUrl: '/api/auth/signin' }, { status: 401 })
    }

    const body = await req.json() as {
      uploadId?: string
      styles?: string[]
      quality?: QualityTier
      mode?: DesignMode
      roomType?: string
      customPrompt?: string
    }

    const {
      uploadId,
      styles = [],
      quality = 'standard',
      mode = 'redesign',
      roomType = 'living_room',
      customPrompt,
    } = body

    if (!Array.isArray(styles) || styles.length < MIN_BATCH_STYLES || styles.length > MAX_BATCH_STYLES) {
      return NextResponse.json(
        { error: `Select between ${MIN_BATCH_STYLES} and ${MAX_BATCH_STYLES} styles` },
        { status: 400 }
      )
    }

    const invalidStyle = styles.find((s) => !ALL_STYLE_KEYS.includes(s))
    if (invalidStyle) {
      return NextResponse.json({ error: ERR.invalidStyle }, { status: 400 })
    }

    const modeConfig = DESIGN_MODES.find((m) => m.key === mode)
    if (!modeConfig || !modeConfig.needsStyle) {
      return NextResponse.json({ error: ERR.invalidMode }, { status: 400 })
    }

    if (!ALL_ROOM_TYPE_KEYS.includes(roomType)) {
      return NextResponse.json({ error: ERR.invalidRoomType }, { status: 400 })
    }

    // Check subscription before hitting storage (fail fast)
    const sub = await getSubscription(session.userId)
    if (sub.plan === 'free') {
      return NextResponse.json({ error: ERR.upgradeRequired, upgradeUrl: '/pricing' }, { status: 402 })
    }
    if (sub.generationsLeft < styles.length) {
      return NextResponse.json({ error: ERR.upgradeRequired, upgradeUrl: '/pricing' }, { status: 402 })
    }

    if (!uploadId) {
      return NextResponse.json({ error: ERR.uploadMissing }, { status: 400 })
    }
    // TODO: verify uploadData.userId === session.userId once uploads table tracks ownership
    const uploadData = await getUploadData(uploadId)
    if (!uploadData) {
      return NextResponse.json({ error: ERR.fileNotFound }, { status: 400 })
    }

    const trimmedPrompt = customPrompt?.trim().slice(0, 200) || undefined

    // Create all orders in batch; if one fails, all fail (no partial state)
    let orders
    try {
      orders = await Promise.all(
        styles.map((style) =>
          createOrder({
            style,
            uploadId,
            quality,
            mode,
            roomType,
            customPrompt: trimmedPrompt,
            isFree: false,
            userId: session.userId,
          })
        )
      )
    } catch (err) {
      logger.error('batch-generate', 'Failed to create orders', { userId: session.userId, count: styles.length, error: String(err) })
      return NextResponse.json({ error: 'Failed to create orders. Please try again.' }, { status: 500 })
    }

    // Activate orders and charge quota
    try {
      await Promise.all(orders.map((o) => updateOrder(o.id, { status: 'paid' })))
      await incrementGenerationsUsedBy(session.userId, styles.length)
    } catch (err) {
      logger.error('batch-generate', 'Failed to activate orders', { userId: session.userId, orderIds: orders.map((o) => o.id), error: String(err) })
      return NextResponse.json({ error: 'Failed to activate orders. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ orderIds: orders.map((o) => o.id) })
  } catch (err) {
    logger.error('batch-generate', 'Unexpected error in batch-generate', { error: String(err) })
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
