import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { lookupRefCode } from '@/lib/referral'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/orders'
import { isOverseas } from '@/lib/region'

export const revalidate = 0

interface Props {
  params: { refCode: string }
}

async function getPublicWorks(userId: string): Promise<Array<{ id: string; url: string }>> {
  const db = await getClient()
  const rows = await db.execute({
    sql: `SELECT id, resultStoragePath FROM orders
          WHERE owner = ? AND status = 'done' AND isPublicGallery = 1
          ORDER BY createdAt DESC LIMIT 8`,
    args: [userId],
  })
  return rows.rows.map((r) => ({
    id: String(r.id),
    url: `/api/result-image/${String(r.id)}`,
  }))
}

export default async function ReferralWelcome({ params }: Props) {
  const refCode = params.refCode
  if (!refCode || !/^[a-f0-9]{8}$/.test(refCode)) notFound()

  const referrer = await lookupRefCode(refCode)
  if (!referrer) notFound()

  // Write cookie (first-touch — do not overwrite existing)
  const cookieStore = await cookies()
  if (!cookieStore.get('ref_code')) {
    cookieStore.set('ref_code', refCode, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
  }

  const user = await getUser(referrer.userId)
  const works = await getPublicWorks(referrer.userId)
  const displayName = user?.wechat_nickname || user?.phone?.slice(-4) || 'A friend'
  const loginHref = isOverseas ? '/api/auth/signin' : '/login'

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          {user?.wechat_avatar && (
            <img src={user.wechat_avatar} alt="" className="w-10 h-10 rounded-full" />
          )}
          <div>
            <p className="text-gray-400 text-sm">
              {isOverseas ? `${displayName} invited you` : `${displayName} 邀请你来`}
            </p>
            <h1 className="text-2xl font-bold">
              {isOverseas ? 'Try AI Room Designer' : '一起用 AI 设计你的房间'}
            </h1>
          </div>
        </div>

        {works.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-8">
            {works.map((w) => (
              <img
                key={w.id}
                src={w.url}
                alt=""
                className="w-full aspect-square object-cover rounded-lg border border-gray-800"
              />
            ))}
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-lg font-semibold mb-2">
            {isOverseas
              ? 'Sign up to get +2 free generations'
              : '登录即送 +2 次免费生成'}
          </p>
          <p className="text-gray-400 text-sm mb-2">
            {isOverseas
              ? 'New users only — credited instantly after sign-in.'
              : '新用户专享，登录后立即到账'}
          </p>
          <p className="text-amber-400 text-xs font-semibold mb-5">
            {isOverseas
              ? 'Your friend also gets +2 bonus when you complete your first design'
              : '你的邀请人同样可获得 +2 次奖励'}
          </p>
          <Link
            href={loginHref}
            className="inline-block px-8 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors"
          >
            {isOverseas ? 'Sign up free' : '立即登录领取'}
          </Link>
        </div>
      </div>
    </main>
  )
}
