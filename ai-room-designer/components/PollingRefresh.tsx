'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Polls /api/query-order every `intervalMs` ms and hard-navigates to the
 * result page when the order is done. Falls back to a full page reload after
 * `maxAttempts` if something goes wrong.
 */
export default function PollingRefresh({
  orderId,
  intervalMs = 3000,
  maxAttempts = 40,
}: {
  orderId: string
  intervalMs?: number
  maxAttempts?: number
}) {
  const router = useRouter()

  useEffect(() => {
    let attempts = 0

    const id = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/query-order?orderId=${orderId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'done') {
            clearInterval(id)
            router.refresh()
            return
          }
          if (data.status === 'failed') {
            clearInterval(id)
            router.refresh()
            return
          }
        }
      } catch {
        // network error — keep trying
      }

      if (attempts >= maxAttempts) {
        clearInterval(id)
        window.location.reload()
      }
    }, intervalMs)

    return () => clearInterval(id)
  }, [orderId, intervalMs, maxAttempts, router])

  return null
}
