'use client'
import { useState } from 'react'
import Link from 'next/link'
import UploadZone from '@/components/UploadZone'
import StyleSelector from '@/components/StyleSelector'
import PaymentModal from '@/components/PaymentModal'

export default function GeneratePage() {
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [style, setStyle] = useState('北欧简约')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payModal, setPayModal] = useState<{ orderId: string; qrDataUrl: string } | null>(null)

  const handlePay = async () => {
    if (!uploadId) { setError('请先上传房间照片'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, style }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPayModal({ orderId: data.orderId, qrDataUrl: data.qrDataUrl })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '创建订单失败'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <nav className="flex items-center px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">装</div>
          <span className="font-bold text-xl">装AI</span>
        </Link>
        <div className="flex-1" />
        <span className="text-gray-600 text-sm">上传照片 → 选择风格 → 付款生成</span>
      </nav>

      <div className="flex px-[120px] pt-12 pb-16 gap-10 items-start">
        {/* Left: Upload */}
        <div className="w-[520px] flex flex-col gap-5">
          <div>
            <h2 className="text-white text-xl font-bold">上传您的房间照片</h2>
            <p className="text-gray-500 text-sm mt-1">支持 JPG / PNG，建议正面拍摄，效果更佳</p>
          </div>
          <UploadZone onUpload={(id) => setUploadId(id)} />
        </div>

        {/* Right: Style + Pay */}
        <div className="flex-1 flex flex-col gap-5">
          <div>
            <h2 className="text-white text-xl font-bold">选择装修风格</h2>
            <p className="text-gray-500 text-sm mt-1">选中一种风格，AI将按此风格重新设计您的房间</p>
          </div>
          <StyleSelector selected={style} onChange={setStyle} />

          <div className="border-t border-gray-800 pt-4 flex flex-col gap-3">
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              付款后即时生成，效果不满意可联系退款
            </div>
            <button
              onClick={handlePay}
              disabled={loading || !uploadId}
              className="flex items-center justify-center gap-2 w-full h-14 bg-amber-500 text-black font-bold text-base rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors shadow-[0_6px_20px_rgba(255,152,0,0.3)]"
            >
              {loading ? '处理中...' : '⚡ 支付 ¥1 · 立即生成效果图'}
            </button>
            <p className="text-gray-600 text-xs text-center">扫码支付宝完成付款 · 30秒内自动生成 · 高清图片下载</p>
          </div>
        </div>
      </div>

      {payModal && (
        <PaymentModal
          orderId={payModal.orderId}
          qrDataUrl={payModal.qrDataUrl}
          onClose={() => setPayModal(null)}
        />
      )}
    </main>
  )
}
