import NavBar from '@/components/NavBar'
import { getSubscription } from '@/lib/subscription'
import { getReferralStats } from '@/lib/referral'
import { isOverseas } from '@/lib/region'
import { redirect } from 'next/navigation'
import ReferralDisplay from '@/components/ReferralDisplay'

export default async function AccountPage() {
  if (!isOverseas) redirect('/')

  // Read session server-side via NextAuth
  const { auth } = await import('@/lib/next-auth')
  const nextAuthSession = await auth()
  const sub_session = nextAuthSession?.user?.id
    ? { userId: nextAuthSession.user.id }
    : null

  if (!sub_session) redirect('/api/auth/signin')

  const subscription = await getSubscription(sub_session.userId)

  // 获取推荐统计数据
  let referralStats = {
    refCode: '',
    inviteUrl: '',
    thisMonthCompleted: 0,
    totalCompleted: 0,
    monthlyLimit: 10,
  }
  let referralError: string | null = null

  try {
    referralStats = await getReferralStats(sub_session.userId)
  } catch (error) {
    console.error('Failed to fetch referral stats:', error)
    referralError = 'Failed to load referral stats'
  }

  const planLabel: Record<string, string> = {
    free: 'Free',
    pro: 'Pro',
    unlimited: 'Unlimited',
  }

  const usagePercent = subscription.generationsLimit === -1
    ? 100
    : Math.round((subscription.generationsUsed / subscription.generationsLimit) * 100)

  return (
    <main className="min-h-screen bg-black">
      <NavBar />
      <div className="max-w-xl mx-auto px-6 pt-16 pb-24">
        <h1 className="text-2xl font-bold mb-8">Account</h1>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm">Current plan</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${subscription.plan === 'unlimited' ? 'bg-purple-900 text-purple-300' : subscription.plan === 'pro' ? 'bg-amber-900 text-amber-400' : 'bg-gray-800 text-gray-400'}`}>
              {planLabel[subscription.plan]}
            </span>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Generations this month</span>
              <span>
                {subscription.plan === 'unlimited'
                  ? 'Unlimited'
                  : `${subscription.generationsUsed} / ${subscription.generationsLimit}`}
              </span>
            </div>
            {subscription.plan !== 'unlimited' && (
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {subscription.plan !== 'unlimited' && (
            <a
              href="/pricing"
              className="block w-full py-3 bg-amber-500 text-black font-semibold text-sm text-center rounded-lg hover:bg-amber-400 transition-colors"
            >
              Upgrade Plan
            </a>
          )}
          {subscription.plan !== 'free' && (
            <a
              href="/api/stripe/portal"
              className="block w-full py-3 bg-gray-800 text-white font-semibold text-sm text-center rounded-lg hover:bg-gray-700 transition-colors"
            >
              Manage Billing
            </a>
          )}
        </div>

        {/* Referral section - using new ReferralDisplay component */}
        <ReferralDisplay
          refCode={referralStats.refCode}
          inviteUrl={referralStats.inviteUrl}
          thisMonthCompleted={referralStats.thisMonthCompleted}
          totalCompleted={referralStats.totalCompleted}
          monthlyLimit={referralStats.monthlyLimit}
          error={referralError}
        />
      </div>
    </main>
  )
}
