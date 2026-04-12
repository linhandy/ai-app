import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken, getUser } from '@/lib/auth'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ user: null })
    }

    const session = parseSessionToken(token)
    if (!session) {
      return NextResponse.json({ user: null })
    }

    const user = await getUser(session.userId)
    return NextResponse.json({ user })
  } catch (err) {
    console.error('auth/me error:', err)
    return NextResponse.json({ user: null })
  }
}
