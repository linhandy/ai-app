// eslint-disable-next-line @typescript-eslint/no-require-imports
const AlipaySdk = require('alipay-sdk')

export function getAlipayClient() {
  return new AlipaySdk({
    appId: process.env.ALIPAY_APP_ID!,
    privateKey: process.env.ALIPAY_PRIVATE_KEY!,
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY!,
    gateway: 'https://openapi.alipay.com/gateway.do',
    timeout: 10000,
  })
}

export function formatAmount(yuan: number): string {
  return yuan.toFixed(2)
}

export function buildOrderSubject(style: string): string {
  return `AI装修效果图-${style}风格`
}

export async function createQROrder(params: {
  orderId: string
  style: string
  amount: number
}): Promise<string> {
  const sdk = getAlipayClient()
  const result = await sdk.exec('alipay.trade.precreate', {
    bizContent: {
      out_trade_no: params.orderId,
      total_amount: formatAmount(params.amount),
      subject: buildOrderSubject(params.style),
      timeout_express: '15m',
    },
    notifyUrl: process.env.ALIPAY_NOTIFY_URL!,
  })

  if (result.code !== '10000') {
    throw new Error(`Alipay error: ${result.sub_msg ?? result.msg}`)
  }

  return result.qr_code as string
}

export async function queryAlipayOrder(orderId: string): Promise<string> {
  const sdk = getAlipayClient()
  const result = await sdk.exec('alipay.trade.query', {
    bizContent: { out_trade_no: orderId },
  })
  return result.trade_status as string
}

export function verifyAlipayCallback(params: Record<string, string>): boolean {
  const sdk = getAlipayClient()
  return sdk.checkNotifySign(params)
}
