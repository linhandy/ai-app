import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: '装AI - AI秒变理想装修',
  description: '上传一张房间照片，AI 秒出专业装修效果图。支持 48 种风格，1 元起。',
  keywords: 'AI装修效果图,室内设计AI,装修效果图免费,AI家居改造,智能装修设计',
  openGraph: {
    title: '装AI - AI秒变理想装修效果图',
    description: '上传房间照片，30秒生成专业装修效果图，48种风格，1元起体验',
    type: 'website',
    locale: 'zh_CN',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: '装AI 装修效果图' }],
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Toaster position="top-center" richColors duration={5000} />
      </body>
    </html>
  )
}