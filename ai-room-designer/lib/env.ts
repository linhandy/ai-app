const REQUIRED_VARS = [
  'ZENMUX_API_KEY',
  'ALIPAY_APP_ID',
  'ALIPAY_PRIVATE_KEY',
  'ALIPAY_PUBLIC_KEY',
  'ALIPAY_NOTIFY_URL',
] as const

export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter((k) => !process.env[k])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join('\n  ')}\n\nPlease check your .env.local file.`,
    )
  }
}

/**
 * Optional WeChat environment variables.
 * Required for WeChat login to work in production.
 * Set in .env.local:
 *
 *   WECHAT_APPID=wx1234567890abcdef
 *   WECHAT_SECRET=your_appsecret_here
 *   NEXT_PUBLIC_BASE_URL=https://your-domain.com
 *
 * In WeChat Official Account backend, register the following
 * as the "网页授权域名": your-domain.com (without https://)
 */
export function warnMissingWechatEnv(): void {
  const missing = ['WECHAT_APPID', 'WECHAT_SECRET'].filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.warn(`[warn] WeChat login disabled — missing env vars: ${missing.join(', ')}`)
  }
}
