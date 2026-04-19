// lib/next-auth.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { findOrCreateGoogleUser } from './auth'
import { isOverseas } from './region'
import { tryAttributeReferral } from './referral'

declare module 'next-auth' {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null }
  }
}

declare module '@auth/core/jwt' {
  interface JWT { userId?: string }
}

export const { handlers: { GET, POST }, handlers, auth, signIn, signOut } = NextAuth({
  providers: isOverseas
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ]
    : [],
  callbacks: {
    async signIn({ user, account, request }) {
      if (!isOverseas) return false
      if (account?.provider !== 'google') return false
      if (!user.email) return false
      try {
        const dbUser = await findOrCreateGoogleUser({
          googleId: account.providerAccountId,
          email: user.email,
          name: user.name ?? '',
          avatar: user.image ?? '',
        })
        user.id = dbUser.userId

        // Task 9: Wire referral attribution for new Google users
        if (dbUser.isNew) {
          try {
            // Extract ref_code cookie if present
            const refCode = request?.cookies?.get('ref_code')?.value
            if (refCode) {
              // Extract IP from request headers
              const ip = extractIpFromRequest(request)
              if (ip) {
                const result = await tryAttributeReferral({
                  refCode,
                  newUserId: dbUser.userId,
                  visitorIp: ip,
                })
                if (result.ok) {
                  console.log(`[Referral] Attributed user ${dbUser.userId} to referrer via refCode ${refCode}`)
                } else {
                  console.log(
                    `[Referral] Attribution failed for user ${dbUser.userId}: ${result.reason}`,
                  )
                }
              } else {
                console.warn('[Referral] Could not extract IP from request')
              }
            }
          } catch (err) {
            // Log but don't fail auth if attribution fails
            console.error('[Referral] Error during attribution:', err)
          }
        }

        return true
      } catch (err) {
        console.error('[NextAuth signIn] Failed to create/find Google user:', err)
        return false
      }
    },
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id
      return token
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string
      return session
    },
  },
})

/**
 * Extract visitor IP from NextAuth request headers.
 * Checks X-Forwarded-For (for proxies/load balancers) and falls back to connection IP.
 */
function extractIpFromRequest(request?: any): string | null {
  if (!request) return null

  // Try X-Forwarded-For header (first IP if multiple)
  const forwardedFor = request.headers?.get?.('x-forwarded-for')
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0]?.trim()
    if (ip) return ip
  }

  // Try other common headers
  const cfConnectingIp = request.headers?.get?.('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp

  // Fallback to connection IP
  const ip = request.ip || request.socket?.remoteAddress
  if (ip) return ip

  return null
}
