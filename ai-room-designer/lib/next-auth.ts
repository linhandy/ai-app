// lib/next-auth.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { findOrCreateGoogleUser } from './auth'
import { isOverseas } from './region'

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
    async signIn({ user, account }) {
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
        return true
      } catch {
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
