import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { verifyCode, createSessionToken } from '@/lib/auth'
import { tryAttributeReferral } from '@/lib/referral'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json()

    if (!phone || !code || code.length !== 6) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 })
    }

    const result = await verifyCode(phone, code)
    if (!result) {
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 401 })
    }

    // Handle referral attribution for new users
    if (result.isNew) {
      const cookieStore = await cookies()
      const refCode = cookieStore.get('ref_code')?.value

      if (refCode) {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
        try {
          const attrResult = await tryAttributeReferral({
            refCode,
            newUserId: result.userId,
            visitorIp: ip,
          })
          if (attrResult.ok) {
            console.log(`[Referral] Successfully attributed user ${result.userId} to refCode ${refCode}`)
          } else {
            console.log(`[Referral] Failed to attribute user ${result.userId} to refCode ${refCode}: ${attrResult.reason}`)
          }
        } catch (err) {
          console.error(`[Referral] Error during attribution for user ${result.userId}:`, err)
        }
      }
    }

    const token = createSessionToken(result.userId)

    const res = NextResponse.json({ user: { id: result.userId, phone: result.phone } })
    res.cookies.set('session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    })

    return res
  } catch (err) {
    console.error('verify error:', err)
    return NextResponse.json({ error: '验证失败' }, { status: 500 })
  }
}
