'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  orderId: string
  qrDataUrl: string
  amount: number
  count: number
  label: string
  onSuccess: (count: number) => void
  onClose: () => void
}

export default function PackagePurchaseModal({ orderId, qrDataUrl, amount, count, label, onSuccess, onClose }: Props) {
  const [status, setStatus] = useState<'waiting' | 'success' | 'failed'>('waiting')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/query-order?orderId=${orderId}`)
        const data = await res.json()

        if (data.status === 'done') {
          setStatus('success')
          onSuccessRef.current(count)
          return
        }

        if (data.status === 'failed') {
          setStatus('failed')
          return
        }
      } catch {
        // network error — keep polling
      }
      timerRef.current = setTimeout(poll, 2000)
    }

    timerRef.current = setTimeout(poll, 2000)
    return () => clearTimeout(timerRef.current)
  }, [orderId, count])

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={status === 'success' ? onClose : undefined}>
      <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-8 flex flex-col items-center gap-4 w-80" onClick={e => e.stopPropagation()}>
        {status === 'waiting' && (
          <>
            <h3 className="text-white font-bold text-lg">购买{label}</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="支付二维码" className="w-48 h-48 rounded-lg" />
            <div className="text-center">
              <p className="text-amber-500 text-2xl font-bold">¥{amount.toFixed(2)}</p>
              <p className="text-gray-400 text-sm mt-1">{count}次生成额度</p>
            </div>
            <p className="text-gray-500 text-xs text-center">支付后额度自动到账</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-white font-semibold">购买成功！</p>
            <p className="text-gray-400 text-sm text-center">已获得 {count} 次生成额度</p>
            <button onClick={onClose} className="w-full h-10 bg-amber-500 text-black font-bold text-sm rounded hover:bg-amber-400 transition-colors">
              开始生成
            </button>
          </>
        )}
        {status === 'failed' && (
          <>
            <p className="text-red-400 font-semibold">购买失败</p>
            <p className="text-gray-400 text-sm text-center">请联系客服处理</p>
            <button onClick={onClose} className="text-gray-400 text-sm underline">关闭</button>
          </>
        )}
      </div>
    </div>
  )
}
