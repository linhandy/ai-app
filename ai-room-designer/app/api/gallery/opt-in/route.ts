import { NextRequest, NextResponse } from 'next/server'
import { getOrder, updateOrder } from '@/lib/orders'
import { isOverseas } from '@/lib/region'

export async function POST(req: NextRequest) {
  const body = await req.json() as { orderId: string; optIn: boolean }
  const { orderId, optIn } = body

  if (!orderId || typeof optIn !== 'boolean') {
    return NextResponse.json({ error: 'Missing orderId or optIn' }, { status: 400 })
  }

  const order = await getOrder(orderId)
  if (!order || order.status !== 'done') {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Verify ownership
  if (isOverseas) {
    const { auth } = await import('@/lib/next-auth')
    const session = await auth()
    if (!session?.user?.id || session.user.id !== order.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    const { parseSessionToken } = await import('@/lib/auth')
    const token = req.cookies.get('session')?.value
    const session = token ? parseSessionToken(token) : null
    if (!session?.userId || session.userId !== order.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  await updateOrder(orderId, { isPublicGallery: optIn })
  return NextResponse.json({ ok: true })
}
