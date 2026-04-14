import { NextRequest, NextResponse } from 'next/server'
import { PACKAGES, addCredits } from '@/lib/credits'
import { createOrder, updateOrder } from '@/lib/orders'
import { parseSessionToken } from '@/lib/auth'
import { createQROrder } from '@/lib/alipay'
import QRCode from 'qrcode'

export async function POST(req: NextRequest) {
  const { packageId } = await req.json()
  const pkg = PACKAGES.find(p => p.id === packageId)
  if (!pkg) {
    return NextResponse.json({ error: '无效的套餐' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

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
}
