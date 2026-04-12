import { NextRequest } from 'next/server'
import { verifyAlipayCallback } from '@/lib/alipay'
import { getOrder, updateOrder } from '@/lib/orders'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = Object.fromEntries(new URLSearchParams(body))

    if (!verifyAlipayCallback(params)) {
      console.warn('[notify] Invalid Alipay signature')
      return new Response('fail', { status: 400 })
    }

    const { out_trade_no, trade_no, trade_status } = params

    if (trade_status === 'TRADE_SUCCESS') {
      const order = getOrder(out_trade_no)
      if (!order) {
        console.warn('[notify] Order not found:', out_trade_no)
      } else if (order.alipayTradeNo === trade_no) {
        console.log('[notify] Duplicate callback for trade', trade_no)
      } else if (order.status === 'pending') {
        updateOrder(out_trade_no, { status: 'paid', alipayTradeNo: trade_no })
      }
    }

    return new Response('success')
  } catch (err) {
    console.error('[notify]', err)
    return new Response('fail', { status: 500 })
  }
}
