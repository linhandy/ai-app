import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '装AI - AI秒变理想装修',
  description: '拍一张照片，AI秒变理想装修效果图',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}