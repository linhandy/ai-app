import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { recordReferralClick } from '@/lib/referral'
import { getOrder } from '@/lib/orders'
import { createHash } from 'crypto'
import { notFound } from 'next/navigation'

interface Props {
  params: { orderId: string }
  searchParams: { ref?: string }
}

export default async function ReferralPage({ params, searchParams }: Props) {
  const { orderId } = params
  const refCode = searchParams.ref ?? ''

  // Verify the order exists
  const order = await getOrder(orderId)
  if (!order) notFound()

  if (refCode && refCode.length === 6) {
    const headersList = await headers()
    const forwarded = headersList.get('x-forwarded-for')
    const visitorIp = forwarded?.split(',')[0]?.trim() ?? 'unknown'
    const visitorRefCode = createHash('sha256').update(visitorIp).digest('hex').slice(0, 6)

    // Only process if visitor is not the sharer
    if (visitorRefCode !== refCode) {
      await recordReferralClick({
        refCode,
        sharerIp: `ref:${refCode}`, // keyed by refCode as sharer identifier
        visitorIp,
      })
    }
  }

  redirect(`/result/${orderId}`)
}
