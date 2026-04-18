'use client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface BatchOrder {
  orderId: string
  status: 'pending' | 'generating' | 'done' | 'failed'
  resultUrl?: string
  style?: string
}

export default function BatchResultPage() {
  return (
    <Suspense>
      <BatchResultInner />
    </Suspense>
  )
}

function BatchResultInner() {
  const searchParams = useSearchParams()
  const orderIds = (searchParams.get('ids') ?? '').split(',').filter(Boolean)
  const [orders, setOrders] = useState<BatchOrder[]>(
    orderIds.map((id) => ({ orderId: id, status: 'pending' }))
  )
  const ordersRef = useRef<BatchOrder[]>([])
  const triggeredRef = useRef<Set<string>>(new Set())

  useEffect(() => { ordersRef.current = orders }, [orders])

  // Trigger generation for each order on mount
  useEffect(() => {
    orderIds.forEach(async (orderId) => {
      if (triggeredRef.current.has(orderId)) return
      triggeredRef.current.add(orderId)
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, status: 'generating' } : o))
      )
      try {
        await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        })
      } catch {
        setOrders((prev) =>
          prev.map((o) =>
            o.orderId === orderId ? { ...o, status: 'failed' } : o
          )
        )
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll order statuses every 3 seconds until all done/failed
  useEffect(() => {
    const timer = setInterval(async () => {
      const current = ordersRef.current
      const allSettled = current.every((o) => o.status === 'done' || o.status === 'failed')
      if (allSettled) { clearInterval(timer); return }
      const pending = current.filter((o) => o.status !== 'done' && o.status !== 'failed')
      await Promise.all(
        pending.map(async (o) => {
          try {
            const res = await fetch(`/api/order-status/${o.orderId}`)
            const data = await res.json()
            if (data.status === 'done' && data.resultUrl) {
              setOrders((prev) =>
                prev.map((x) =>
                  x.orderId === o.orderId
                    ? { ...x, status: 'done', resultUrl: data.resultUrl, style: data.style }
                    : x
                )
              )
            } else if (data.status === 'failed') {
              setOrders((prev) =>
                prev.map((x) => x.orderId === o.orderId ? { ...x, status: 'failed' } : x)
              )
            }
          } catch {
            // non-fatal — retry next tick
          }
        })
      )
    }, 3000)
    return () => clearInterval(timer)
  }, []) // runs once — reads live orders via ordersRef

  const doneCount = orders.filter((o) => o.status === 'done').length
  const totalCount = orders.length
  const allSettled = orders.every(
    (o) => o.status === 'done' || o.status === 'failed'
  )

  return (
    <main className="min-h-screen bg-black pb-16">
      <nav className="flex items-center px-4 md:px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">
            R
          </div>
          <span className="font-bold text-xl">RoomAI</span>
        </Link>
        <div className="flex-1" />
        <Link
          href="/generate"
          className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
        >
          New Design
        </Link>
      </nav>

      <div className="px-4 md:px-[120px] pt-8 pb-4">
        <h1
          className="text-2xl md:text-3xl font-bold mb-2"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {allSettled
            ? `${doneCount} of ${totalCount} designs ready`
            : 'Generating your designs…'}
        </h1>
        <p className="text-gray-500 text-sm">
          {allSettled
            ? 'Download your favorites or view full results.'
            : `${doneCount}/${totalCount} complete — takes about 20–30 seconds each`}
        </p>
      </div>

      {!allSettled && (
        <div className="px-4 md:px-[120px] mb-6">
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden max-w-[600px]">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{
                width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="px-4 md:px-[120px]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {orders.map((order) => (
            <div key={order.orderId} className="flex flex-col gap-2">
              {order.status === 'done' && order.resultUrl ? (
                <>
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-900">
                    <img
                      src={order.resultUrl}
                      alt={order.style ?? 'AI design'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <a
                      href={order.resultUrl}
                      download={`RoomAI-${order.style ?? order.orderId}.png`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center h-8 bg-amber-500 text-black text-xs font-bold rounded hover:bg-amber-400 transition-colors"
                    >
                      Download
                    </a>
                    <Link
                      href={`/result/${order.orderId}`}
                      className="flex-1 flex items-center justify-center h-8 border border-gray-700 text-gray-400 text-xs rounded hover:border-gray-500 transition-colors"
                    >
                      View
                    </Link>
                  </div>
                  {order.style && (
                    <p className="text-gray-500 text-xs text-center capitalize">
                      {order.style.replace(/_/g, ' ')}
                    </p>
                  )}
                </>
              ) : order.status === 'failed' ? (
                <div className="aspect-square rounded-lg bg-red-950/30 border border-red-900/30 flex flex-col items-center justify-center gap-2">
                  <svg
                    className="w-8 h-8 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-red-400 text-xs">Generation failed</p>
                </div>
              ) : (
                <div className="aspect-square rounded-lg bg-gray-900 border border-gray-800 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  <p className="text-gray-500 text-xs">
                    {order.status === 'pending' ? 'Queued…' : 'Designing…'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {allSettled && doneCount > 0 && (
        <div className="px-4 md:px-[120px] mt-8 flex justify-center">
          <Link
            href="/generate"
            className="flex items-center gap-2 px-7 h-12 border border-gray-700 text-gray-400 text-sm rounded hover:border-gray-500 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            New Design
          </Link>
        </div>
      )}
    </main>
  )
}
