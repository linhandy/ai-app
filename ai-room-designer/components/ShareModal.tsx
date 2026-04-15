'use client'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { regionConfig } from '@/lib/region-config'
import { getShareUrl, copyToClipboard, SHARE_TARGET_LABELS, SHARE_TARGET_ICONS } from '@/lib/share'
import type { ShareTarget } from '@/lib/share'

interface Props {
  orderId: string
  style: string
  pageUrl: string
  resultUrl: string
  onClose: () => void
}

export default function ShareModal({ style, pageUrl, resultUrl, onClose }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    QRCode.toDataURL(pageUrl, { width: 160, margin: 2 }).then(setQrDataUrl)
  }, [pageUrl])

  const shareTargets = regionConfig.shareTargets as readonly ShareTarget[]
  const shareTitle = regionConfig.strings.shareText
  const shareModalTitle = regionConfig.strings.shareModalTitle
  const shareSkip = regionConfig.strings.shareSkip

  const handleShareClick = async (target: ShareTarget) => {
    if (target === 'copy_link') {
      await copyToClipboard(pageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else if (target === 'wechat') {
      // WeChat: QR code is displayed inline — no action needed here
    } else {
      const url = getShareUrl(target, { url: pageUrl, title: shareTitle })
      if (url) window.open(url, '_blank', 'noopener')
    }
  }

  // Check if CN-style copy-text button is needed (douyin/xiaohongshu targets)
  const hasCNTargets = shareTargets.some(t => t === 'douyin' || t === 'xiaohongshu')
  const douyinText = `🏠 花1块钱让AI改造了我家！效果太炸了！\n\n选的是「${style}」风格，上传照片30秒出图✨\n\n${pageUrl}\n\n#AI装修 #家居改造 #${style} #室内设计`

  const copyDouyinText = () => {
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
            <p className="text-white font-bold text-lg">{shareModalTitle}</p>
            <p className="text-gray-400 text-sm mt-0.5">
              {regionConfig.currency === 'CNY'
                ? '分享给好友，每带来 1 位新访客你就多 1 次免费机会（最多 10 次）'
                : 'Share your design and earn free generations for every new visitor.'}
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
        <img src={resultUrl} alt="Result" className="w-full aspect-video object-cover rounded-xl" />

        {/* WeChat QR — shown only for CN users */}
        {shareTargets.includes('wechat') && qrDataUrl && (
          <div className="flex items-center gap-4 bg-gray-900 rounded-xl p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="微信分享二维码" className="w-16 h-16 rounded" />
            <div>
              <p className="text-white text-sm font-semibold">微信扫码分享</p>
              <p className="text-gray-500 text-xs mt-0.5">截图后发朋友圈效果更好</p>
            </div>
          </div>
        )}

        {/* Config-driven share buttons */}
        <div className="flex flex-wrap gap-2">
          {shareTargets
            .filter(t => t !== 'wechat')  // WeChat handled above via QR
            .map((target) => (
              <button
                key={target}
                onClick={() => handleShareClick(target)}
                className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <span className="text-xl">{SHARE_TARGET_ICONS[target]}</span>
                <span className="text-xs text-gray-400">
                  {target === 'copy_link' && copied
                    ? (regionConfig.currency === 'CNY' ? '已复制！' : 'Copied!')
                    : SHARE_TARGET_LABELS[target]}
                </span>
              </button>
            ))}
        </div>

        {/* CN: copy douyin/xiaohongshu text button */}
        {hasCNTargets && (
          <button
            onClick={copyDouyinText}
            className="w-full h-11 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors"
          >
            {copied ? '✅ 已复制文案+链接' : '复制分享文案（适合抖音/小红书）'}
          </button>
        )}

        {/* Skip */}
        <button onClick={onClose} className="text-gray-600 text-xs text-center hover:text-gray-400 transition-colors">
          {shareSkip}
        </button>
      </div>
    </div>
  )
}
