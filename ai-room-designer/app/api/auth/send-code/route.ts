import { NextResponse } from 'next/server'
import { sendCode } from '@/lib/auth'
import { isRateLimited } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const { phone } = await req.json()

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 })
    }

    if (isRateLimited(`send-code:${phone}`, 3, 60_000)) {
      return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
    }

    const result = await sendCode(phone)
    return NextResponse.json(result)
  } catch (err) {
    console.error('send-code error:', err)
    return NextResponse.json({ error: '发送验证码失败' }, { status: 500 })
  }
}
