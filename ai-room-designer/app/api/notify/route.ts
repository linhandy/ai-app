import { NextRequest } from 'next/server'
import { verifyAlipayCallback } from '@/lib/alipay'
import { getOrder, updateOrder } from '@/lib/orders'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = Object.fromEntries(new URLSearchParams(body))

    if (!verifyAlipayCallback(params)) {
      logger.warn('notify', 'Invalid Alipay signature')
      return new Response('fail', { status: 400 })
    }

    const { out_trade_no, trade_no, trade_status } = params

    if (trade_status === 'TRADE_SUCCESS') {
      const order = await getOrder(out_trade_no)
      if (!order) {
        logger.warn('notify', 'Order not found', { orderId: out_trade_no })
      } else if (order.alipayTradeNo === trade_no) {
        logger.info('notify', 'Duplicate callback ignored', { orderId: out_trade_no, tradeNo: trade_no })
      } else if (order.status === 'pending') {
        await updateOrder(out_trade_no, { status: 'paid', alipayTradeNo: trade_no })
        logger.info('notify', 'Payment confirmed', { orderId: out_trade_no, tradeNo: trade_no })
      }
    }

    return new Response('success')
  } catch (err) {
    logger.error('notify', 'Callback processing failed', { error: String(err) })
    return new Response('fail', { status: 500 })
  }
}
