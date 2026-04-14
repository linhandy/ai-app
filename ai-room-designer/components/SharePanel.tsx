'use client'
import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

interface Props {
  style: string
  resultUrl: string    // relative /api/preview?... URL for the result image
  pageUrl?: string     // full URL of the result page (passed from server)
}

type Modal = 'wechat' | 'douyin' | 'xiaohongshu' | null

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }
  return { copied, copy }
}

export default function SharePanel({ style, pageUrl }: Props) {
  const [modal, setModal] = useState<Modal>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [canNativeShare, setCanNativeShare] = useState(false)
  const { copied, copy } = useCopy()

  const shareUrl = pageUrl ?? (typeof window !== 'undefined' ? window.location.href : '')

  const douyinText = `🏠 花1块钱让AI改造了我家！效果太炸了！\n\n选的是「${style}」风格，上传照片30秒出图✨\n\n${shareUrl}\n\n#AI装修 #家居改造 #${style} #室内设计 #装修灵感`

  const redText = `✨ 我用AI改造了我家，只要1块钱！\n\n👉 上传房间照片 → 选风格 → 30秒出效果图\n\n这次选的「${style}」风格，对比效果真的太好了！强烈推荐想装修的姐妹试试～\n\n🔗 ${shareUrl}\n\n#AI装修效果图 #家居改造 #${style} #装修灵感 #室内设计 #家居好物`

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share)
  }, [])

  const openWechat = async () => {
    if (!qrDataUrl) {
      const url = await QRCode.toDataURL(shareUrl, { width: 200, margin: 2, color: { dark: '#000', light: '#fff' } })
      setQrDataUrl(url)
    }
    setModal('wechat')
  }

  const handleNativeShare = () => {
    navigator.share({
      title: `AI装修效果图 · ${style}风格`,
      text: `花1块钱让AI改造了我家！${style}风格，上传照片30秒出图～`,
      url: shareUrl,
    }).catch(() => {/* user cancelled */})
  }

  const BUTTONS = [
    ...(canNativeShare ? [{
      key: 'native',
      label: '一键分享',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      ),
      bg: 'bg-amber-500 hover:bg-amber-400 text-black',
      onClick: handleNativeShare,
    }] : []),
    {
      key: 'wechat',
      label: '微信',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.49.49 0 01.177-.554C22.979 18.222 24 16.614 24 14.811c0-3.218-2.959-5.951-7.063-5.953zM14.5 13.478c-.535 0-.969-.44-.969-.983 0-.543.434-.983.969-.983s.969.44.969.983-.434.983-.969.983zm4.762 0c-.535 0-.969-.44-.969-.983 0-.543.434-.983.969-.983s.969.44.969.983-.434.983-.969.983z" />
        </svg>
      ),
      bg: 'bg-[#07C160] hover:bg-[#06AD56] text-white',
      onClick: openWechat,
    },
    {
      key: 'douyin',
      label: '抖音',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.28 8.28 0 004.83 1.54v-3.4a4.85 4.85 0 01-1.06-.14z" />
        </svg>
      ),
      bg: 'bg-[#161823] hover:bg-[#2a2d3e] text-white border border-gray-700',
      onClick: () => setModal('douyin'),
    },
    {
      key: 'xiaohongshu',
      label: '小红书',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.5 7.5h-2.25v1.5h2.25V10.5h-2.25V12h2.25v1.5H14.25V12h-1.5v1.5H11.25v-1.5H9v-1.5h2.25V9h-2.25V7.5H11.25v1.5h1.5V7.5h1.5V9h1.5V7.5h.75zM7.5 15h9v1.5h-9V15zm0 3h9v1.5h-9V18z" />
        </svg>
      ),
      bg: 'bg-[#FF2442] hover:bg-[#e01e3a] text-white',
      onClick: () => setModal('xiaohongshu'),
    },
    {
      key: 'link',
      label: copied === 'link' ? '已复制！' : '复制链接',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      bg: copied === 'link' ? 'bg-green-900 text-green-400 border border-green-800' : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-700',
      onClick: () => copy(shareUrl, 'link'),
    },
  ]

  return (
    <>
      <div className="w-full max-w-[1100px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-gray-500 text-sm shrink-0">分享效果图：</span>
          <div className="flex flex-wrap gap-2">
            {BUTTONS.map(({ key, label, icon, bg, onClick }) => (
              <button
                key={key}
                onClick={onClick}
                className={`flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-semibold transition-colors ${bg}`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* WeChat QR modal */}
      {modal === 'wechat' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4" onClick={() => setModal(null)}>
          <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-8 flex flex-col items-center gap-4 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg">微信扫码分享</h3>
            {qrDataUrl && <img src={qrDataUrl} alt="分享二维码" className="w-44 h-44 rounded-xl bg-white p-1" />}
            <p className="text-gray-400 text-sm text-center">用微信扫描二维码<br />打开后可分享到朋友圈 / 好友</p>
            <button onClick={() => setModal(null)} className="text-gray-600 text-sm hover:text-gray-400 transition-colors mt-1">关闭</button>
          </div>
        </div>
      )}

      {/* Douyin copywriting modal */}
      {modal === 'douyin' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4" onClick={() => setModal(null)}>
          <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6 flex flex-col gap-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center border border-gray-700">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.28 8.28 0 004.83 1.54v-3.4a4.85 4.85 0 01-1.06-.14z" />
                </svg>
              </div>
              <h3 className="text-white font-bold">分享到抖音</h3>
            </div>
            <p className="text-gray-500 text-xs">复制下方文案，发布抖音视频/图文时粘贴使用</p>
            <div className="bg-black rounded-lg p-4 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap border border-gray-800">
              {douyinText}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copy(douyinText, 'douyin')}
                className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors ${copied === 'douyin' ? 'bg-green-900 text-green-400' : 'bg-white/10 text-white hover:bg-white/15'}`}
              >
                {copied === 'douyin' ? '✓ 已复制' : '复制文案'}
              </button>
              <button onClick={() => setModal(null)} className="px-4 h-10 rounded-lg text-sm text-gray-500 hover:text-gray-300 transition-colors">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Xiaohongshu copywriting modal */}
      {modal === 'xiaohongshu' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4" onClick={() => setModal(null)}>
          <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-6 flex flex-col gap-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF2442] flex items-center justify-center">
                <span className="text-white text-xs font-bold">书</span>
              </div>
              <h3 className="text-white font-bold">分享到小红书</h3>
            </div>
            <p className="text-gray-500 text-xs">先下载效果图，发布小红书笔记时粘贴文案并上传图片</p>
            <div className="bg-black rounded-lg p-4 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap border border-gray-800">
              {redText}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copy(redText, 'red')}
                className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors ${copied === 'red' ? 'bg-green-900 text-green-400' : 'bg-[#FF2442] text-white hover:bg-[#e01e3a]'}`}
              >
                {copied === 'red' ? '✓ 已复制' : '复制文案'}
              </button>
              <button onClick={() => setModal(null)} className="px-4 h-10 rounded-lg text-sm text-gray-500 hover:text-gray-300 transition-colors">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
