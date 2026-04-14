import { cookies } from 'next/headers'
import { parseSessionToken, getUser } from '@/lib/auth'
import Link from 'next/link'

function maskPhone(phone: string): string {
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

export default async function NavBar() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  const session = token ? parseSessionToken(token) : null
  const user = session ? await getUser(session.userId).catch(() => null) : null

  return (
    <nav className="flex items-center px-6 md:px-[120px] h-16 border-b border-gray-900">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">装</div>
        <span className="font-bold text-xl">装AI</span>
      </Link>
      <div className="flex-1" />
      <a href="#examples" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">风格展示</a>
      <a href="#pricing" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">价格</a>
      <a href="#faq" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">常见问题</a>
      <Link href="/history" className="text-gray-500 text-sm mr-8 hover:text-gray-300 transition-colors hidden md:block">历史记录</Link>

      {user ? (
        <div className="items-center gap-3 mr-6 hidden md:flex">
          {user.wechat_avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.wechat_avatar}
              alt={user.wechat_nickname ?? ''}
              width={24}
              height={24}
              className="rounded-full"
            />
          ) : null}
          <span className="text-gray-400 text-sm">
            {user.wechat_nickname
              ? user.wechat_nickname.slice(0, 8)
              : maskPhone(user.phone ?? '')}
          </span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
              退出
            </button>
          </form>
        </div>
      ) : (
        <Link href="/login" className="text-gray-500 text-sm mr-6 hover:text-gray-300 transition-colors hidden md:block">
          登录/注册
        </Link>
      )}

      <Link
        href="/generate"
        className="bg-amber-500 text-black text-sm font-semibold px-5 h-9 rounded flex items-center hover:bg-amber-400 transition-colors"
      >
        开始体验
      </Link>
    </nav>
  )
}
