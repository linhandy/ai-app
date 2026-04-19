import { NextResponse } from 'next/server'
import { isOverseas } from '@/lib/region'

export async function POST() {
  // Overseas should use NextAuth /api/auth/signout, CN uses this endpoint
  if (isOverseas) {
    return NextResponse.json(
      { error: 'Use /api/auth/signout for overseas' },
      { status: 400 }
    )
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set('session', '', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
  })
  return res
}
