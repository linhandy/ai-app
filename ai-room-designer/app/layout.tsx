import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { regionConfig } from '@/lib/region-config'
import { isOverseas } from '@/lib/region'

export const metadata: Metadata = {
  title: regionConfig.seoMeta.siteName,
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
  manifest: '/manifest.json',
  description: regionConfig.seoMeta.description,
  keywords: regionConfig.seoMeta.keywords,
  openGraph: {
    title: regionConfig.seoMeta.siteName,
    description: regionConfig.seoMeta.description,
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: regionConfig.seoMeta.siteName }],
  },
  twitter: { card: 'summary_large_image' },
  other: {
    ...regionConfig.seoMeta.verificationTag,
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang={isOverseas ? 'en' : 'zh-CN'}>
      <body>
        {children}
        <Toaster position="top-center" richColors duration={5000} />
      </body>
    </html>
  )
}