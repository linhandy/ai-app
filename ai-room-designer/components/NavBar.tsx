import { cookies } from 'next/headers'
import { parseSessionToken, getUser } from '@/lib/auth'
import { isOverseas } from '@/lib/region'
import { regionConfig } from '@/lib/region-config'
import Link from 'next/link'
import MobileMenu from '@/components/MobileMenu'

function maskPhone(phone: string): string {
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

export default async function NavBar() {
  let user: { name?: string | null; image?: string | null; wechat_nickname?: string | null; wechat_avatar?: string | null; phone?: string | null } | null = null

  if (isOverseas) {
    // NextAuth session — read via server-side auth()
    const { auth } = await import('@/lib/next-auth')
    const session = await auth()
    if (session?.user) {
      user = { name: session.user.name, image: session.user.image }
    }
  } else {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    const session = token ? parseSessionToken(token) : null
    const dbUser = session ? await getUser(session.userId).catch(() => null) : null
    if (dbUser) user = dbUser
  }

  const s = regionConfig.strings

  return (
    <nav className="flex items-center px-6 md:px-[120px] h-16 border-b border-gray-900">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">
          {isOverseas ? 'R' : '装'}
        </div>
        <span className="font-bold text-xl">{isOverseas ? 'RoomAI' : '装AI'}</span>
      </Link>
      <div className="flex-1" />

      {isOverseas ? (
        <>
          <Link href="/pricing" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">{s.navPricing}</Link>
          <Link href="/history" className="text-gray-500 text-sm mr-8 hover:text-gray-300 transition-colors hidden md:block">{s.navHistory}</Link>
          <div className="items-center gap-3 mr-6 hidden md:flex">
            {user ? (
              <>
                {user.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" width={24} height={24} className="rounded-full" />
                )}
                <span className="text-gray-400 text-sm">{user.name?.split(' ')[0]}</span>
                <Link href="/account" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">{s.navAccount}</Link>
                <form action="/api/auth/signout" method="POST">
                  <button type="submit" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">{s.navSignOut}</button>
                </form>
              </>
            ) : (
              <Link href="/api/auth/signin" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">{s.navSignIn}</Link>
            )}
          </div>
        </>
      ) : (
        <>
          <a href="#examples" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">风格展示</a>
          <a href="#pricing" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">价格</a>
          <a href="#faq" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">常见问题</a>
          <Link href="/history" className="text-gray-500 text-sm mr-8 hover:text-gray-300 transition-colors hidden md:block">历史记录</Link>
          {user ? (
            <div className="items-center gap-3 mr-6 hidden md:flex">
              {user.wechat_avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.wechat_avatar} alt={user.wechat_nickname ?? ''} width={24} height={24} className="rounded-full" />
              ) : null}
              <span className="text-gray-400 text-sm">
                {user.wechat_nickname ? user.wechat_nickname.slice(0, 8) : maskPhone(user.phone ?? '')}
              </span>
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">退出</button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="text-gray-500 text-sm mr-6 hover:text-gray-300 transition-colors hidden md:block">登录/注册</Link>
          )}
        </>
      )}

      <MobileMenu
        isLoggedIn={!!user}
        isOverseas={isOverseas}
        userName={
          isOverseas
            ? (user?.name?.split(' ')[0] ?? undefined)
            : (user?.wechat_nickname?.slice(0, 8) ?? (user?.phone ? maskPhone(user.phone) : undefined))
        }
      />

      <Link
        href="/generate"
        className="bg-amber-500 text-black text-sm font-semibold px-5 h-9 rounded items-center hover:bg-amber-400 transition-colors hidden md:flex"
      >
        {s.navGenerate}
      </Link>
    </nav>
  )
}
