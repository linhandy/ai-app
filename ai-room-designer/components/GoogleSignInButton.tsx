'use client'
import { signIn, signOut } from 'next-auth/react'

interface Props {
  user?: { name?: string | null; image?: string | null } | null
}

export default function GoogleSignInButton({ user }: Props) {
  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" width={24} height={24} className="rounded-full" />
        )}
        <span className="text-gray-400 text-sm">{user.name?.split(' ')[0]}</span>
        <button
          onClick={() => signOut()}
          className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
    >
      Sign in
    </button>
  )
}
