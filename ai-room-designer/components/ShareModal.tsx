'use client'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  orderId: string
  style: string
  pageUrl: string
  resultUrl: string
  onClose: () => void
}

export default function ShareModal({ style, pageUrl, resultUrl, onClose }: Omit<Props, 'orderId'> & { orderId: string }) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    QRCode.toDataURL(pageUrl, { width: 160, margin: 2 }).then(setQrDataUrl)
  }, [pageUrl])

  const douyinText = `🏠 花1块钱让AI改造了我家！效果太炸了！\n\n选的是「${style}」风格，上传照片30秒出图✨\n\n${pageUrl}\n\n#AI装修 #家居改造 #${style} #室内设计`

  const copyLink = () => {
    navigator.clipboard.writeText(douyinText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#0D0D0D] border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white font-bold text-lg">✨ 效果图已生成！</p>
            <p className="text-gray-400 text-sm mt-0.5">
              分享给好友，每带来 1 位新访客你就多 1 次免费机会（最多 10 次）
            </p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 ml-3 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Result thumbnail */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resultUrl} alt="效果图" className="w-full aspect-video object-cover rounded-xl" />

        {/* WeChat QR */}
        {qrDataUrl && (
          <div className="flex items-center gap-4 bg-gray-900 rounded-xl p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="微信分享二维码" className="w-16 h-16 rounded" />
            <div>
              <p className="text-white text-sm font-semibold">微信扫码分享</p>
              <p className="text-gray-500 text-xs mt-0.5">截图后发朋友圈效果更好</p>
            </div>
          </div>
        )}

        {/* Copy text button */}
        <button
          onClick={copyLink}
          className="w-full h-11 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors"
        >
          {copied ? '✅ 已复制文案+链接' : '复制分享文案（适合抖音/小红书）'}
        </button>

        {/* Skip */}
        <button onClick={onClose} className="text-gray-600 text-xs text-center hover:text-gray-400 transition-colors">
          跳过，直接下载
        </button>
      </div>
    </div>
  )
}
