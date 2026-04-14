# Generation UX + SEO + Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add animated progress bar during generation, persist orders to history immediately after payment so users can leave and return, show completion toast + tab title change, add post-generation share modal (auto-shows 1.5s after done), and add SEO metadata (robots, sitemap, OG tags).

**Architecture:** Four independent areas executed in order: (1) notification infrastructure — install `sonner`, wire up Toaster; (2) generation UX — ProgressBar component, early history save, PollingRefresh toast; (3) share modal — new component shown automatically after result; (4) SEO — Next.js App Router `robots.ts`, `sitemap.ts`, metadata expansion. All changes are additive — no existing logic removed.

**Tech Stack:** Next.js 14 App Router, React 18, `sonner` (new toast library), Tailwind CSS, localStorage

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `components/ProgressBar.tsx` | **Create** | Animated fake-progress bar, self-managing timer |
| `components/ShareModal.tsx` | **Create** | Bottom-sheet share CTA, auto-shown once per session |
| `app/robots.ts` | **Create** | Next.js robots.txt generator |
| `app/sitemap.ts` | **Create** | Dynamic XML sitemap |
| `lib/history.ts` | Modify | No type change needed; used as-is from generate page |
| `components/PollingRefresh.tsx` | Modify | Fire toast + title change on completion |
| `app/generate/page.tsx` | Modify | Call `saveToHistory` right after order created |
| `app/result/[orderId]/page.tsx` | Modify | Swap spinner → ProgressBar; add ShareModal in done state; add `generateMetadata` |
| `app/history/page.tsx` | Modify | Auto-re-poll generating orders every 30 s |
| `app/layout.tsx` | Modify | Add `<Toaster />` + expand root metadata |

---

## Task 1 — Install sonner and wire up Toaster

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `app/layout.tsx`

- [ ] **Install sonner**

```bash
cd d:/code/ai-app/ai-room-designer
npm install sonner
```

Expected: `sonner` appears in `package.json` dependencies.

- [ ] **Add Toaster to layout**

Open `app/layout.tsx`. Find the `<body>` tag and add `<Toaster>` as the last child:

```tsx
import { Toaster } from 'sonner'

// Inside <body>:
<body ...>
  {children}
  <Toaster position="top-center" richColors duration={5000} />
</body>
```

- [ ] **Verify build compiles**

```bash
npm run build 2>&1 | tail -5
```

Expected: no type errors.

- [ ] **Commit**

```bash
git add app/layout.tsx package.json package-lock.json
git commit -m "feat: add sonner toast infrastructure"
```

---

## Task 2 — ProgressBar component

**Files:**
- Create: `components/ProgressBar.tsx`

- [ ] **Create ProgressBar.tsx**

```tsx
'use client'
import { useEffect, useState } from 'react'

/**
 * Fake progress bar for AI generation waiting screen.
 * Runs autonomously: 0→75% over ~20s, then slows to 95%, jumps to 100% on isComplete.
 */
export default function ProgressBar({ isComplete }: { isComplete: boolean }) {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    if (isComplete) {
      setPct(100)
      return
    }
    const id = setInterval(() => {
      setPct((prev) => {
        if (prev >= 95) return prev
        // Fast phase 0→75 (about 21s at 500ms interval = 42 ticks, +1.79/tick)
        // Slow phase 75→95 (creep)
        const increment = prev < 75 ? 1.8 : 0.25
        return Math.min(prev + increment, 95)
      })
    }, 500)
    return () => clearInterval(id)
  }, [isComplete])

  const label =
    pct < 30 ? '分析房间结构...'
    : pct < 65 ? 'AI 重新设计中...'
    : pct < 90 ? '渲染效果图...'
    : isComplete ? '完成！'
    : '即将完成...'

  return (
    <div className="w-full max-w-xs space-y-2">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add components/ProgressBar.tsx
git commit -m "feat: add ProgressBar component for generation waiting screen"
```

---

## Task 3 — Replace spinner with ProgressBar on result page waiting state

**Files:**
- Modify: `app/result/[orderId]/page.tsx` lines 19–61 (the waiting-state block)

- [ ] **Replace the waiting-state return block**

Find this block (lines 19–61):
```tsx
if (order.status === 'paid' || order.status === 'generating') {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 max-w-sm px-6">
        {/* Animated spinner */}
        ...
        <p className="text-gray-500 text-xs">大约需要 20-30 秒，页面将自动刷新</p>
        <PollingRefresh orderId={params.orderId} />
      </div>
    </main>
  )
}
```

Replace the entire block with:

```tsx
if (order.status === 'paid' || order.status === 'generating') {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-8 max-w-sm w-full px-6">
        {/* Steps */}
        <div className="w-full space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-green-400 text-sm">支付成功</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center animate-pulse shrink-0">
              <div className="w-2 h-2 bg-black rounded-full" />
            </div>
            <span className="text-amber-400 text-sm font-semibold">AI 生成中...</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-700 shrink-0" />
            <span className="text-gray-500 text-sm">生成完成</span>
          </div>
        </div>

        <ProgressBar isComplete={false} />

        <p className="text-gray-600 text-xs text-center">
          大约需要 20–30 秒&nbsp;·&nbsp;
          <a href="/history" className="text-gray-400 underline underline-offset-2 hover:text-gray-200">
            你也可以去其他页面，完成后在历史记录查看 →
          </a>
        </p>

        <PollingRefresh orderId={params.orderId} />
      </div>
    </main>
  )
}
```

Add import at top of file:
```tsx
import ProgressBar from '@/components/ProgressBar'
```

- [ ] **Verify page renders without errors**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```

- [ ] **Commit**

```bash
git add app/result/[orderId]/page.tsx components/ProgressBar.tsx
git commit -m "feat: replace spinner with progress bar on result waiting page"
```

---

## Task 4 — Early history save in generate page

**Files:**
- Modify: `app/generate/page.tsx`

- [ ] **Add import at top of generate page**

Find the existing imports block and add:
```tsx
import { saveToHistory } from '@/lib/history'
```

- [ ] **Call saveToHistory right after order creation**

In `handlePay`, find the block that runs after `create-order` succeeds (line ~60 onwards).  
Add `saveToHistory` call immediately after `const data = await res.json()` / `if (!res.ok) throw`:

```tsx
const data = await res.json()
if (!res.ok) throw new Error(data.error)

// Save to history immediately so user can navigate away during generation
saveToHistory({
  orderId: data.orderId,
  style,
  quality,
  mode,
  createdAt: Date.now(),
})

if (data.devSkip) {
  // ... rest of existing code unchanged
```

- [ ] **Commit**

```bash
git add app/generate/page.tsx
git commit -m "feat: save order to history immediately after creation so user can navigate away"
```

---

## Task 5 — PollingRefresh: toast + tab title on completion

**Files:**
- Modify: `components/PollingRefresh.tsx`

- [ ] **Replace PollingRefresh.tsx entirely**

```tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function PollingRefresh({
  orderId,
  intervalMs = 3000,
  maxAttempts = 40,
}: {
  orderId: string
  intervalMs?: number
  maxAttempts?: number
}) {
  const router = useRouter()

  useEffect(() => {
    let attempts = 0

    const id = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/query-order?orderId=${orderId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'done') {
            clearInterval(id)
            // Notify user if they've switched tabs
            if (document.visibilityState === 'hidden') {
              toast.success('效果图已生成！点击查看', {
                action: { label: '查看', onClick: () => router.push(`/result/${orderId}`) },
                duration: 10000,
              })
            }
            document.title = '✅ 效果图已生成 - 装AI'
            router.refresh()
            return
          }
          if (data.status === 'failed') {
            clearInterval(id)
            router.refresh()
            return
          }
        }
      } catch {
        // network error — keep trying
      }

      if (attempts >= maxAttempts) {
        clearInterval(id)
        window.location.reload()
      }
    }, intervalMs)

    return () => clearInterval(id)
  }, [orderId, intervalMs, maxAttempts, router])

  return null
}
```

- [ ] **Commit**

```bash
git add components/PollingRefresh.tsx
git commit -m "feat: show toast and update tab title when generation completes"
```

---

## Task 6 — History page: auto-refresh generating orders every 30s

**Files:**
- Modify: `app/history/page.tsx`

- [ ] **Add auto-refresh useEffect**

In `HistoryPage`, after the existing `useEffect` that loads history (ends at line 111), add a second `useEffect` that re-polls generating orders:

```tsx
// Auto-refresh generating orders every 30 seconds
useEffect(() => {
  const generatingIds = items
    .map((item) => item.orderId)
    .filter((id) => {
      const o = orders[id]
      return !o || o.status === 'generating' || o.status === 'pending'
    })

  if (generatingIds.length === 0) return

  const intervalId = setInterval(async () => {
    const updates = await Promise.all(
      generatingIds.map(async (id) => {
        try {
          const res = await fetch(`/api/query-order?orderId=${id}`)
          if (!res.ok) return [id, orders[id]] as const
          const data = await res.json()
          if (data.status === 'done' && orders[id]?.status !== 'done') {
            toast.success('效果图已生成！', {
              action: { label: '查看', onClick: () => window.location.href = `/result/${id}` },
              duration: 8000,
            })
          }
          return [id, data] as const
        } catch {
          return [id, orders[id]] as const
        }
      })
    )
    setOrders((prev) => ({ ...prev, ...Object.fromEntries(updates) }))
  }, 30000)

  return () => clearInterval(intervalId)
}, [items, orders])
```

Add import at top:
```tsx
import { toast } from 'sonner'
```

- [ ] **Commit**

```bash
git add app/history/page.tsx
git commit -m "feat: auto-refresh generating orders on history page every 30s with toast on completion"
```

---

## Task 7 — ShareModal component

**Files:**
- Create: `components/ShareModal.tsx`

- [ ] **Create ShareModal.tsx**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'

interface Props {
  orderId: string
  style: string
  pageUrl: string
  resultUrl: string
  onClose: () => void
}

export default function ShareModal({ orderId, style, pageUrl, resultUrl, onClose }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const router = useRouter()

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
```

- [ ] **Commit**

```bash
git add components/ShareModal.tsx
git commit -m "feat: add ShareModal component for post-generation sharing CTA"
```

---

## Task 8 — Auto-show ShareModal on result done state

**Files:**
- Modify: `app/result/[orderId]/page.tsx`

The result page is a server component. Add a thin client wrapper `ShareModalTrigger` that handles the 1.5s delay and sessionStorage guard.

- [ ] **Create inline client component in result page**

At the top of `app/result/[orderId]/page.tsx`, add a new client component (before the `ResultPage` export):

```tsx
'use client'  // ← add this directive at the very top of the file if not present
              // Note: result page is currently a server component. Add the client
              // component as a separate import instead (see next step).
```

Actually: since result page is a server component, create the trigger as a **separate file**:

Create `components/ShareModalTrigger.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import ShareModal from './ShareModal'

interface Props {
  orderId: string
  style: string
  pageUrl: string
  resultUrl: string
}

export default function ShareModalTrigger({ orderId, style, pageUrl, resultUrl }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const key = `share_modal_shown_${orderId}`
    if (sessionStorage.getItem(key)) return
    const timer = setTimeout(() => {
      sessionStorage.setItem(key, '1')
      setShow(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [orderId])

  if (!show) return null
  return (
    <ShareModal
      orderId={orderId}
      style={style}
      pageUrl={pageUrl}
      resultUrl={resultUrl}
      onClose={() => setShow(false)}
    />
  )
}
```

- [ ] **Add ShareModalTrigger to result page done state**

In `app/result/[orderId]/page.tsx`, add import:
```tsx
import ShareModalTrigger from '@/components/ShareModalTrigger'
```

In the done state `return` block, add `<ShareModalTrigger>` just before the closing `</main>`:

```tsx
<ShareModalTrigger
  orderId={order.id}
  style={order.style}
  pageUrl={shareUrl}
  resultUrl={order.resultUrl}
/>
```

Place it as the last element inside `<main>`, after the info strip div.

- [ ] **Build check**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```

- [ ] **Commit**

```bash
git add components/ShareModalTrigger.tsx app/result/[orderId]/page.tsx
git commit -m "feat: auto-show share modal 1.5s after generation completes"
```

---

## Task 9 — SEO: robots.ts + sitemap.ts

**Files:**
- Create: `app/robots.ts`
- Create: `app/sitemap.ts`

- [ ] **Create app/robots.ts**

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://zhuang.ai'
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin'] },
    sitemap: `${base}/sitemap.xml`,
  }
}
```

- [ ] **Create app/sitemap.ts**

```ts
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://zhuang.ai'
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/generate`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
  ]
}
```

- [ ] **Commit**

```bash
git add app/robots.ts app/sitemap.ts
git commit -m "feat: add robots.txt and sitemap.xml via Next.js App Router"
```

---

## Task 10 — SEO: root metadata + result page generateMetadata

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/result/[orderId]/page.tsx`

- [ ] **Expand root metadata in layout.tsx**

Find the existing `metadata` export and replace:

```tsx
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
```

- [ ] **Add generateMetadata to result page**

In `app/result/[orderId]/page.tsx`, add before the `ResultPage` export:

```tsx
import type { Metadata } from 'next'

export async function generateMetadata(
  { params }: { params: { orderId: string } }
): Promise<Metadata> {
  const order = await getOrder(params.orderId)
  if (!order || order.status !== 'done') return { title: '装AI' }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const imageUrl = order.resultUrl?.startsWith('http')
    ? order.resultUrl
    : `${base}${order.resultUrl}`

  return {
    title: `${order.style}风格装修效果图 | 装AI`,
    description: `用AI生成的${order.style}风格装修效果图，效果超乎想象。`,
    openGraph: {
      title: `${order.style}风格装修效果图`,
      description: `AI生成的${order.style}风格装修，30秒出图，1元起`,
      images: [{ url: imageUrl, width: 1024, height: 1024, alt: `${order.style}装修效果图` }],
    },
  }
}
```

- [ ] **Build check**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```

Expected: no errors.

- [ ] **Commit**

```bash
git add app/layout.tsx app/result/[orderId]/page.tsx
git commit -m "feat: add SEO metadata - root OG tags and dynamic generateMetadata for result pages"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Progress bar: Task 2–3
- ✅ Early history save (navigate-away-safe): Task 4
- ✅ Toast on completion (in-site): Tasks 5, 6
- ✅ Tab title change: Task 5
- ✅ ShareModal auto-shown 1.5s after done: Tasks 7–8
- ✅ sessionStorage one-shot guard: Task 8 (`ShareModalTrigger`)
- ✅ History page auto-refresh 30s: Task 6
- ✅ robots.txt: Task 9
- ✅ sitemap.xml: Task 9
- ✅ Root OG metadata: Task 10
- ✅ Result page `generateMetadata`: Task 10

**Placeholder scan:** No TBD/TODO present. All code blocks are complete.

**Type consistency:**
- `HistoryItem` type unchanged — `saveToHistory` signature matches existing `lib/history.ts`
- `ShareModal` props match `ShareModalTrigger` usage
- `ProgressBar` accepts `isComplete: boolean` — used as `isComplete={false}` in waiting state (correct: PollingRefresh triggers router.refresh() which re-renders to done state before isComplete would ever be true)
