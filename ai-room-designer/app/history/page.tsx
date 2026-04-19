'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { getHistory, clearHistory, type HistoryItem } from '@/lib/history'
import { isOverseas } from '@/lib/region'
import { DESIGN_MODES } from '@/lib/design-config'

interface OrderData {
  status: string
  resultUrl?: string
  style?: string
  quality?: string
}

function modeLabel(m?: string) {
  const key = m ?? 'redesign'
  const mode = DESIGN_MODES.find((d) => d.key === key)
  if (!mode) return isOverseas ? 'Redesign' : '风格改造'
  return isOverseas ? mode.labelEn : mode.label
}

function qualityLabel(q: string) {
  if (isOverseas) {
    if (q === 'premium') return 'HD'
    if (q === 'ultra') return '4K'
    return 'Standard'
  }
  if (q === 'premium') return '高清版'
  if (q === 'ultra') return '超清版'
  return '标准版'
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  const hour = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (isOverseas) {
    if (day > 0) return `${day}d ago`
    if (hour > 0) return `${hour}h ago`
    if (min > 0) return `${min}m ago`
    return 'just now'
  }
  if (day > 0) return `${day}天前`
  if (hour > 0) return `${hour}小时前`
  if (min > 0) return `${min}分钟前`
  return '刚刚'
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [orders, setOrders] = useState<Record<string, OrderData>>({})
  const [loading, setLoading] = useState(true)
  const [isCloud, setIsCloud] = useState(false)

  useEffect(() => {
    async function loadHistory() {
      // Try cloud history first (logged-in users)
      try {
        const res = await fetch('/api/history')
        if (res.ok) {
          const data = await res.json()
          // Cloud history items have the same shape as HistoryItem
          const cloudItems: HistoryItem[] = data.items.map((o: {
            orderId: string; style: string; mode?: string; quality?: string; createdAt: number
          }) => ({
            orderId: o.orderId,
            style: o.style,
            mode: o.mode ?? 'redesign',
            quality: o.quality ?? 'standard',
            createdAt: o.createdAt,
          }))
          setItems(cloudItems)
          setIsCloud(true)
          // Fetch order statuses for cloud items
          const results = await Promise.all(
            cloudItems.map(async (item) => {
              try {
                const r = await fetch(`/api/query-order?orderId=${item.orderId}`)
                if (!r.ok) return [item.orderId, { status: 'done', resultUrl: undefined }] as const
                return [item.orderId, await r.json()] as const
              } catch {
                return [item.orderId, { status: 'done', resultUrl: undefined }] as const
              }
            })
          )
          setOrders(Object.fromEntries(results))
          setLoading(false)
          return
        }
      } catch {
        // Not logged in or network error — fall through to localStorage
      }

      // Fallback: localStorage
      const history = getHistory()
      setItems(history)
      if (history.length === 0) {
        setLoading(false)
        return
      }
      const results = await Promise.all(
        history.map(async (item) => {
          try {
            const res = await fetch(`/api/query-order?orderId=${item.orderId}`)
            if (!res.ok) return [item.orderId, { status: 'expired' }] as const
            const data = await res.json()
            return [item.orderId, data] as const
          } catch {
            return [item.orderId, { status: 'expired' }] as const
          }
        })
      )
      setOrders(Object.fromEntries(results))
      setLoading(false)
    }

    loadHistory()
  }, [])

  // Auto-refresh generating orders every 30 seconds
  useEffect(() => {
    const generatingIds = items
      .map((item) => item.orderId)
      .filter((id) => {
        const o = orders[id]
        return !o || o.status === 'generating' || o.status === 'pending'
      })

    if (generatingIds.length === 0) return

    const intervalId = setInterval(async () => {
      const updates = await Promise.all(
        generatingIds.map(async (id) => {
          try {
            const res = await fetch(`/api/query-order?orderId=${id}`)
            if (!res.ok) return [id, orders[id]] as const
            const data = await res.json()
            if (data.status === 'done' && orders[id]?.status !== 'done') {
              toast.success(isOverseas ? 'Design ready!' : '效果图已生成！', {
                action: { label: isOverseas ? 'View' : '查看', onClick: () => { window.location.href = `/result/${id}` } },
                duration: 8000,
              })
            }
            return [id, data] as const
          } catch {
            return [id, orders[id]] as const
          }
        })
      )
      setOrders((prev) => ({ ...prev, ...Object.fromEntries(updates) }))
    }, 30000)

    return () => clearInterval(intervalId)
  }, [items, orders])

  const handleClear = () => {
    if (confirm(isOverseas ? 'Clear all design history? This cannot be undone.' : '确定清除所有历史记录？')) {
      clearHistory()
      setItems([])
      setOrders({})
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <nav className="flex items-center px-6 md:px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">{isOverseas ? 'R' : '装'}</div>
          <span className="font-bold text-xl text-white">{isOverseas ? 'RoomAI' : '装AI'}</span>
        </Link>
        <div className="flex-1" />
        <Link href="/generate" className="bg-amber-500 text-black text-sm font-semibold px-5 h-9 rounded flex items-center hover:bg-amber-400 transition-colors">
          {isOverseas ? 'New Design' : '生成新图'}
        </Link>
      </nav>

      <div className="px-6 md:px-[120px] pt-12 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>{isOverseas ? 'My Designs' : '生成历史'}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {isOverseas
                ? (isCloud ? 'Signed in — designs synced to cloud' : 'Saved locally — images expire after 7 days')
                : (isCloud ? '已登录，历史同步至云端' : '保存在本设备，图片7天后自动清理')}
            </p>
          </div>
          {items.length > 0 && (
            <button onClick={handleClear} className="text-gray-600 text-sm hover:text-gray-400 transition-colors">
              {isOverseas ? 'Clear all' : '清除全部'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500">{isOverseas ? 'No designs yet' : '还没有生成记录'}</p>
            <Link href="/generate" className="mt-2 bg-amber-500 text-black font-semibold text-sm px-6 h-10 rounded flex items-center hover:bg-amber-400 transition-colors">
              {isOverseas ? 'Generate your first design' : '立即生成第一张'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((item) => {
              const order = orders[item.orderId]
              const isDone = order?.status === 'done'
              const isExpired = !order || order.status === 'expired' || order.status === 'failed'

              return (
                <div key={item.orderId} className={`rounded-xl border overflow-hidden bg-[#0D0D0D] ${isExpired ? 'border-gray-800 opacity-50' : 'border-gray-800 hover:border-gray-600 transition-colors'}`}>
                  {/* Image preview */}
                  <div className="relative w-full bg-gray-900" style={{ aspectRatio: '4/3' }}>
                    {isDone && order.resultUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={order.resultUrl} alt={item.style} className="w-full h-full object-cover" />
                    ) : isExpired ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-700 text-xs">{isOverseas ? 'Expired' : '已过期'}</span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {/* Style badge */}
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-semibold px-2 h-5 flex items-center rounded">
                      {item.style}
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <div className="bg-amber-500/80 text-black text-[10px] font-semibold px-2 h-5 flex items-center rounded">
                        {modeLabel(item.mode)}
                      </div>
                      <div className="bg-black/70 text-gray-400 text-[10px] px-2 h-5 flex items-center rounded">
                        {qualityLabel(item.quality)}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <span className="text-gray-600 text-xs">{timeAgo(item.createdAt)}</span>
                    {isDone ? (
                      <Link href={`/result/${item.orderId}`} className="text-amber-500 text-xs font-semibold hover:text-amber-400 transition-colors">
                        {isOverseas ? 'View →' : '查看 →'}
                      </Link>
                    ) : isExpired ? (
                      <span className="text-gray-700 text-xs">{isOverseas ? 'Cleared' : '已清理'}</span>
                    ) : (
                      <Link href={`/result/${item.orderId}`} className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
                        {isOverseas ? 'View progress →' : '查看进度 →'}
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
