import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ success: false, message: '请输入验证码' }, { status: 400 })
  }

  const normalizedCode = code.trim().toUpperCase()
  const validCodes = (process.env.VALID_CODES || 'LLD-DEMO-888,LLD-TEST-001,LLD-LOVE-2024')
    .split(',')
    .map(c => c.trim().toUpperCase())

  if (validCodes.includes(normalizedCode)) {
    const token = Buffer.from(JSON.stringify({ code: normalizedCode, ts: Date.now() })).toString('base64')
    return NextResponse.json({ success: true, token })
  }

  return NextResponse.json({ success: false, message: '验证码无效，请检查后重试' }, { status: 401 })
}
