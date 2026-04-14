import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(req: Request) {
  const appId = process.env.WECHAT_APPID
  if (!appId) {
    return NextResponse.redirect(new URL('/login?error=wechat_not_configured', req.url))
  }

  const state = crypto.randomBytes(16).toString('hex')
  const reqUrl = new URL(req.url)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `${reqUrl.protocol}//${reqUrl.host}`
  const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/wechat/callback`)

  const wechatUrl =
    `https://open.weixin.qq.com/connect/oauth2/authorize` +
    `?appid=${appId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=snsapi_userinfo` +
    `&state=${state}` +
    `#wechat_redirect`

  const res = NextResponse.redirect(wechatUrl)
  res.cookies.set('wechat_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  })
  return res
}
