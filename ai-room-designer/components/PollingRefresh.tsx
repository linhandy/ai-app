'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
            // Notify user if they've switched tabs
            if (document.visibilityState === 'hidden') {
              toast.success('效果图已生成！点击查看', {
                action: { label: '查看', onClick: () => router.push(`/result/${orderId}`) },
                duration: 10000,
              })
            }
            document.title = '✅ 效果图已生成 - 装AI'
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
