'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
  qrDataUrl: string
  onClose: () => void
}

export default function PaymentModal({ orderId, qrDataUrl, onClose }: Props) {
  const [status, setStatus] = useState<'waiting' | 'generating' | 'failed'>('waiting')
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/query-order?orderId=${orderId}`)
        const data = await res.json()

        if (data.status === 'paid') {
          setStatus('generating')
          await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId }),
          })
          router.push(`/result/${orderId}`)
          return
        }

        if (data.status === 'done') {
          router.push(`/result/${orderId}`)
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
  }, [orderId, router])

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-8 flex flex-col items-center gap-4 w-80" onClick={e => e.stopPropagation()}>
        {status === 'waiting' && (
          <>
            <h3 className="text-white font-bold text-lg">支付宝扫码付款</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="支付二维码" className="w-48 h-48 rounded-lg" />
            <div className="text-center">
              <p className="text-amber-500 text-2xl font-bold">¥1.00</p>
              <p className="text-gray-400 text-sm mt-1">AI装修效果图生成费</p>
            </div>
            <p className="text-gray-500 text-xs text-center">付款后自动生成，约30秒</p>
          </>
        )}
        {status === 'generating' && (
          <>
            <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-semibold">AI生成中，请稍候...</p>
            <p className="text-gray-400 text-sm">约30秒</p>
          </>
        )}
        {status === 'failed' && (
          <>
            <p className="text-red-400 font-semibold">生成失败</p>
            <p className="text-gray-400 text-sm text-center">请联系客服退款</p>
            <button onClick={onClose} className="text-gray-400 text-sm underline">关闭</button>
          </>
        )}
      </div>
    </div>
  )
}
