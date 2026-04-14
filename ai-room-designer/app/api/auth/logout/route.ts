import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('session', '', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
  })
  return res
}
