// app/api/credits/balance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getBalance } from '@/lib/credits'
import { parseSessionToken } from '@/lib/auth'
import { headers } from 'next/headers'

export async function GET(req: NextRequest) {
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown'
  const cookie = req.cookies.get('session')?.value
  const session = cookie ? parseSessionToken(cookie) : null
  const owner = session?.userId ?? ip
  const balance = await getBalance(owner)
  return NextResponse.json({ balance })
}
