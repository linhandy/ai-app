import { NextResponse } from 'next/server'
import { verifyCode, createSessionToken } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json()

    if (!phone || !code || code.length !== 6) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 })
    }

    const result = await verifyCode(phone, code)
    if (!result) {
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 401 })
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
