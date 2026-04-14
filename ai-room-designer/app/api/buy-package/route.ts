import { NextRequest, NextResponse } from 'next/server'
import { PACKAGES, addCredits } from '@/lib/credits'
import { createOrder, updateOrder } from '@/lib/orders'
import { parseSessionToken } from '@/lib/auth'
import { createQROrder } from '@/lib/alipay'
import { isRateLimited } from '@/lib/rate-limit'
import QRCode from 'qrcode'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (isRateLimited(`buy-package:${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
    }

    const { packageId } = await req.json()
    const pkg = PACKAGES.find(p => p.id === packageId)
    if (!pkg) {
      return NextResponse.json({ error: '无效的套餐' }, { status: 400 })
    }

    const cookie = req.cookies.get('session')?.value
    const session = cookie ? parseSessionToken(cookie) : null
    const userId = session?.userId
    const owner = userId ?? ip

    // Create an order to track the package purchase
    const order = await createOrder({
      style: `package:${pkg.id}`,
      quality: pkg.quality,
      mode: 'redesign',
      roomType: 'living_room',
      uploadId: null,
      isFree: false,
      userId,
    })

    if (process.env.DEV_SKIP_PAYMENT === 'true') {
      await addCredits(owner, pkg.count)
      await updateOrder(order.id, { status: 'done' })
      return NextResponse.json({ orderId: order.id, credited: true })
    }

    const qrCodeUrl = await createQROrder({
      orderId: order.id,
      style: `装AI ${pkg.label} (${pkg.count}次)`,
      amount: pkg.price,
    })
    const qrDataUrl = await QRCode.toDataURL(qrCodeUrl, { width: 256, margin: 2 })

    return NextResponse.json({
      orderId: order.id,
      qrDataUrl,
      amount: pkg.price,
      packageId: pkg.id,
      count: pkg.count,
    })
  } catch (err) {
    console.error('buy-package error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
