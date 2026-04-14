'use client'
import { useState, useEffect, useRef } from 'react'

interface Props {
  orderId: string  // the original FREE order to unlock
}

type Step = 'idle' | 'loading' | 'qr' | 'polling' | 'done' | 'error'

export default function UnwatermarkButton({ orderId }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [unlockOrderId, setUnlockOrderId] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  const handleClick = async () => {
    setStep('loading')
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlockOrderId: orderId }),
      })
      const data = await res.json()
      if (!data.orderId || !data.qrDataUrl) { setStep('error'); return }
      setUnlockOrderId(data.orderId)
      setQrDataUrl(data.qrDataUrl)
      setStep('qr')
    } catch {
      setStep('error')
    }
  }

  // Poll for payment after QR is shown
  useEffect(() => {
    if (step !== 'qr' || !unlockOrderId) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/query-order?orderId=${unlockOrderId}`)
        const data = await res.json()
        if (data.status === 'paid') {
          setStep('polling')
          // Trigger generate for the unlock order
          await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: unlockOrderId }),
          })
          setStep('done')
          clearInterval(pollRef.current)
          // Reload current page to show clean image
          window.location.reload()
        }
        if (data.status === 'failed') { setStep('error'); clearInterval(pollRef.current) }
      } catch { /* ignore */ }
    }, 2000)
    return () => clearInterval(pollRef.current)
  }, [step, unlockOrderId])

  if (step === 'qr') {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4" onClick={() => setStep('idle')}>
        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-8 flex flex-col items-center gap-4 w-80" onClick={e => e.stopPropagation()}>
          <h3 className="text-white font-bold text-lg">扫码支付 ¥1</h3>
          <p className="text-gray-400 text-sm">支付后自动去除水印</p>
          {qrDataUrl && <img src={qrDataUrl} alt="支付二维码" className="w-44 h-44 rounded-xl bg-white p-1" />}
          <button onClick={() => setStep('idle')} className="text-gray-600 text-sm hover:text-gray-400 transition-colors">关闭</button>
        </div>
      </div>
    )
  }

  if (step === 'polling') {
    return <span className="shrink-0 text-amber-400 text-sm font-semibold px-5 h-10 flex items-center">处理中...</span>
  }

  return (
    <button
      onClick={handleClick}
      disabled={step === 'loading'}
      className="shrink-0 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-5 h-10 rounded-lg transition-colors disabled:opacity-50"
    >
      {step === 'loading' ? '请稍候...' : step === 'error' ? '重试' : '¥1 去水印'}
    </button>
  )
}
