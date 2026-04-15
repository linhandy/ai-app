import { isOverseas } from './region'

const REQUIRED_CN_VARS = [
  'ZENMUX_API_KEY',
  'ALIPAY_APP_ID',
  'ALIPAY_PRIVATE_KEY',
  'ALIPAY_PUBLIC_KEY',
  'ALIPAY_NOTIFY_URL',
] as const

const REQUIRED_OVERSEAS_VARS = [
  'ZENMUX_API_KEY',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const

export function validateEnv(): void {
  const vars = isOverseas ? REQUIRED_OVERSEAS_VARS : REQUIRED_CN_VARS
  const missing = (vars as readonly string[]).filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.warn(
      `[warn] Missing environment variables (some features may be disabled):\n  ${missing.join('\n  ')}`,
    )
  }
}

export function warnMissingSupabaseEnv(): void {
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(
    (k) => !process.env[k],
  )
  if (missing.length > 0) {
    console.warn(`[warn] Supabase storage disabled — missing env vars: ${missing.join(', ')}`)
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
  if (isOverseas) return  // WeChat not used overseas
  const missing = ['WECHAT_APPID', 'WECHAT_SECRET'].filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.warn(`[warn] WeChat login disabled — missing env vars: ${missing.join(', ')}`)
  }
}
