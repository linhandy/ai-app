import type { MetadataRoute } from 'next'
import { STYLE_CATEGORIES } from '@/lib/design-config'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://zhuang.ai'

  const stylePages = STYLE_CATEGORIES.flatMap(c => c.styles).map(s => ({
    url: `${base}/styles/${s.key}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${base}/generate`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    ...stylePages,
  ]
}
