import { NextRequest, NextResponse } from 'next/server'
import { createOrder } from '@/lib/orders'
import { createQROrder } from '@/lib/alipay'
import { UPLOAD_DIR } from '@/lib/paths'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'

export async function POST(req: NextRequest) {
  try {
    const { uploadId, style } = await req.json()

    if (!uploadId || !style) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 })
    }

    const uploadPath = path.join(UPLOAD_DIR, uploadId)
    if (!fs.existsSync(uploadPath)) {
      return NextResponse.json({ error: '上传文件不存在，请重新上传' }, { status: 400 })
    }

    const order = createOrder({ style, uploadId })

    const qrCodeUrl = await createQROrder({
      orderId: order.id,
      style,
      amount: 1,
    })

    const qrDataUrl = await QRCode.toDataURL(qrCodeUrl, { width: 240, margin: 2 })

    return NextResponse.json({ orderId: order.id, qrDataUrl })
  } catch (err) {
    console.error('[create-order]', err)
    return NextResponse.json({ error: '创建订单失败，请重试' }, { status: 500 })
  }
}
