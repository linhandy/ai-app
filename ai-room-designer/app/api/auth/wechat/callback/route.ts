import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { findOrCreateWechatUser, createSessionToken } from '@/lib/auth'
import { tryAttributeReferral } from '@/lib/referral'

function failRedirect(baseUrl: string) {
  const res = NextResponse.redirect(`${baseUrl}/login?error=wechat_failed`)
  res.cookies.delete('wechat_state')
  return res
}

export async function GET(req: Request) {
  const reqUrl = new URL(req.url)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `${reqUrl.protocol}//${reqUrl.host}`
  const code = reqUrl.searchParams.get('code')
  const state = reqUrl.searchParams.get('state')

  const cookieStore = await cookies()
  const savedState = cookieStore.get('wechat_state')?.value

  if (!code || !state || !savedState || state !== savedState) {
    return failRedirect(baseUrl)
  }

  const appId = process.env.WECHAT_APPID
  const secret = process.env.WECHAT_SECRET
  if (!appId || !secret) return failRedirect(baseUrl)

  try {
    const tokenRes = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token` +
      `?appid=${appId}&secret=${secret}&code=${code}&grant_type=authorization_code`,
    )
    const tokenData = await tokenRes.json()
    if (tokenData.errcode) return failRedirect(baseUrl)

    const userRes = await fetch(
      `https://api.weixin.qq.com/sns/userinfo` +
      `?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`,
    )
    const userData = await userRes.json()
    if (userData.errcode) return failRedirect(baseUrl)

    const user = await findOrCreateWechatUser({
      openid: userData.openid,
      nickname: userData.nickname ?? '',
      avatar: userData.headimgurl ?? '',
    })

    // Wire referral attribution for new users
    if (user.isNew) {
      const ref_code = cookieStore.get('ref_code')?.value
      if (ref_code) {
        const visitorIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
        try {
          const attrResult = await tryAttributeReferral({
            refCode: ref_code,
            newUserId: user.userId,
            visitorIp,
          })
          if (attrResult.ok) {
            console.log(`[referral] attributed new WeChat user ${user.userId} to ref_code ${ref_code}`)
          } else {
            console.log(`[referral] failed to attribute WeChat user: ${attrResult.reason}`, {
              userId: user.userId,
              refCode: ref_code,
              reason: attrResult.reason,
            })
          }
        } catch (err) {
          console.error(`[referral] error during WeChat attribution:`, err)
        }
      }
    }

    const token = createSessionToken(user.userId)
    const res = NextResponse.redirect(baseUrl)
    res.cookies.delete('wechat_state')
    res.cookies.delete('ref_code')
    res.cookies.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
    return res
  } catch (err) {
    console.error('wechat callback error:', err)
    return failRedirect(baseUrl)
  }
}
