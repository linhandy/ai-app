# Phase 1 — Launch Ready Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the overseas product worthy of a Product Hunt / Reddit launch by removing the watermark from free users, enhancing result page SEO, and adding style + room type landing pages.

**Architecture:** Three independent surface areas: (1) order creation logic (`create-order` route + `subscription.ts`), (2) result page visibility and OG metadata, (3) static SEO landing pages auto-generated from existing `design-config.ts` data. Each task can be built and committed independently.

**Tech Stack:** Next.js 14 App Router, TypeScript, Jest (tests in `__tests__/`), Tailwind CSS. Region gating via `isOverseas` from `lib/region.ts`.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `app/api/create-order/route.ts` | Modify line 73 | Set `isFree = false` for overseas orders |
| `lib/subscription.ts` | Modify FREE_DEFAULTS | Set `hasWatermark: false` (overseas-only lib) |
| `__tests__/api/create-order-overseas.test.ts` | Modify | Assert free orders have `isFree: false` |
| `components/NavBar.tsx` | Modify | Show remaining free count for overseas free users |
| `app/result/[orderId]/page.tsx` | Modify | Richer OG tags + unauthenticated "Create your own" CTA |
| `app/styles/[slug]/page.tsx` | Modify | English copy + CTA for overseas |
| `app/rooms/[slug]/page.tsx` | Create | Room type landing pages (24 pages) |
| `app/sitemap.ts` | Modify | Add room type pages |

---

## Task 1: Remove Watermark from Overseas Free Orders

**Files:**
- Modify: `app/api/create-order/route.ts` (line 73)
- Modify: `lib/subscription.ts` (lines 22–28, 59)
- Modify: `__tests__/api/create-order-overseas.test.ts`

### Context

Currently `create-order/route.ts` line 73 sets:
```ts
const isFree = sub.plan === 'free'
```
This marks free-plan overseas orders with `isFree: true`, which causes the watermark route (`/api/result-image/[orderId]`) to overlay a "装AI" watermark at serve time. For overseas, the paywall is the generation limit (3 uses), not the watermark — so `isFree` should always be `false`.

- [ ] **Step 1: Write the failing test**

Add to `__tests__/api/create-order-overseas.test.ts`, after the existing `describe` blocks:

```ts
describe('overseas free plan isFree flag', () => {
  it('free plan subscription has hasWatermark: false', async () => {
    // No subscription record → falls back to FREE_DEFAULTS
    const sub = await getSubscription('new_overseas_user')
    expect(sub.hasWatermark).toBe(false)
  })

  it('active free plan subscription has hasWatermark: false', async () => {
    await upsertSubscription({
      userId: 'free_active',
      stripeCustomerId: 'cus_test',
      stripeSubscriptionId: 'sub_test',
      plan: 'free',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const sub = await getSubscription('free_active')
    expect(sub.hasWatermark).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd ai-room-designer && npx jest __tests__/api/create-order-overseas.test.ts --no-coverage
```

Expected: FAIL — `expect(true).toBe(false)` (FREE_DEFAULTS has `hasWatermark: true`)

- [ ] **Step 3: Fix `lib/subscription.ts` FREE_DEFAULTS**

In `lib/subscription.ts`, change the `FREE_DEFAULTS` constant (lines 21–28):

```ts
// Before:
const FREE_DEFAULTS: SubscriptionInfo = {
  plan: 'free',
  generationsUsed: 0,
  generationsLimit: 3,
  generationsLeft: 3,
  hasWatermark: true,   // ← change this
  status: 'active',
}

// After:
const FREE_DEFAULTS: SubscriptionInfo = {
  plan: 'free',
  generationsUsed: 0,
  generationsLimit: 3,
  generationsLeft: 3,
  hasWatermark: false,  // Overseas: limit enforcement is the paywall, not watermarking
  status: 'active',
}
```

Also change line 59 (active subscription return):
```ts
// Before:
hasWatermark: plan === 'free',

// After:
hasWatermark: false, // Overseas only: no watermark at any plan level
```

- [ ] **Step 4: Fix `app/api/create-order/route.ts` line 73**

```ts
// Before (line 73):
const isFree = sub.plan === 'free'

// After:
const isFree = false  // Overseas: generation limit is the paywall; no watermarks
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd ai-room-designer && npx jest __tests__/api/create-order-overseas.test.ts --no-coverage
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add ai-room-designer/lib/subscription.ts ai-room-designer/app/api/create-order/route.ts ai-room-designer/__tests__/api/create-order-overseas.test.ts
git commit -m "feat(overseas): remove watermark from free-tier orders — limit is the paywall"
```

---

## Task 2: Show Free Generation Counter in NavBar

**Files:**
- Modify: `components/NavBar.tsx`

### Context

The NavBar already fetches the NextAuth session for overseas. We extend it to also fetch the subscription and show a "X free left" pill next to the Generate button, visible only to logged-in free-plan users.

- [ ] **Step 1: Modify `components/NavBar.tsx`**

In the overseas branch of `NavBar` (inside `if (isOverseas)`), extend the session-fetching block to also retrieve the subscription. Replace lines 17–23:

```ts
// Before:
if (isOverseas) {
  const { auth } = await import('@/lib/next-auth')
  const session = await auth()
  if (session?.user) {
    user = { name: session.user.name, image: session.user.image }
  }
}

// After:
let overseasFreeLeft: number | null = null
if (isOverseas) {
  const { auth } = await import('@/lib/next-auth')
  const session = await auth()
  if (session?.user) {
    user = { name: session.user.name, image: session.user.image }
    try {
      const { getSubscription } = await import('@/lib/subscription')
      const sub = await getSubscription(session.user.id)
      if (sub.plan === 'free' && sub.generationsLeft > 0 && sub.generationsLeft !== Infinity) {
        overseasFreeLeft = sub.generationsLeft
      }
    } catch {
      // non-fatal — badge simply won't render
    }
  }
}
```

Then, inside the overseas JSX block, replace the Generate button (last `<Link href="/generate">` at bottom of `nav`) with:

```tsx
<div className="hidden md:flex items-center gap-2">
  {overseasFreeLeft !== null && (
    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
      {overseasFreeLeft} free left
    </span>
  )}
  <Link
    href="/generate"
    className="bg-amber-500 text-black text-sm font-semibold px-5 h-9 rounded items-center hover:bg-amber-400 transition-colors flex"
  >
    {s.navGenerate}
  </Link>
</div>
```

- [ ] **Step 2: Verify locally**

Start dev server: `cd ai-room-designer && npm run dev`

1. Sign in with a Google account (overseas mode with `REGION=overseas`)
2. With 3 free generations remaining → NavBar shows "3 free left" badge in amber
3. After generating once → badge shows "2 free left"
4. With a Pro subscription → badge is hidden
5. Logged-out → badge is hidden

- [ ] **Step 3: Commit**

```bash
git add ai-room-designer/components/NavBar.tsx
git commit -m "feat(overseas): show remaining free generation count in NavBar"
```

---

## Task 3: Enhance Result Page OG Meta + Unauthenticated CTA

**Files:**
- Modify: `app/result/[orderId]/page.tsx`

### Context

The result page is already publicly accessible (no auth gate for viewing — only order existence is checked). Two improvements:

1. **OG tags**: Title is currently `${order.style} | RoomAI` (generic). For SEO and social sharing, make it richer and use English for overseas.
2. **CTA for unauthenticated visitors**: When a non-logged-in user lands on a result page via a shared link, show a prominent "Design your room →" call-to-action. Currently no such prompt exists.

- [ ] **Step 1: Improve `generateMetadata` for overseas**

Replace the `generateMetadata` function (lines 19–39) with:

```ts
export async function generateMetadata(
  { params }: { params: { orderId: string } }
): Promise<Metadata> {
  const order = await getOrder(params.orderId)
  if (!order || order.status !== 'done') return { title: regionConfig.seoMeta.siteName }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const imageUrl = order.resultUrl?.startsWith('http')
    ? order.resultUrl
    : `${base}${order.resultUrl}`

  if (isOverseas) {
    const styleLabel = order.style ?? 'AI Interior'
    const roomLabel = order.roomType
      ? order.roomType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : 'Room'
    const title = `${styleLabel} ${roomLabel} Design | RoomAI`
    const description = `AI-generated ${styleLabel} ${roomLabel} design — redesign your space in 30 seconds with RoomAI.`
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        images: [{ url: imageUrl, width: 1024, height: 1024, alt: title }],
      },
      twitter: { card: 'summary_large_image', title, description, images: [imageUrl] },
    }
  }

  // CN (unchanged)
  return {
    title: `${order.style} | ${regionConfig.seoMeta.siteName}`,
    description: regionConfig.seoMeta.description,
    openGraph: {
      title: `${order.style} | ${regionConfig.seoMeta.siteName}`,
      description: regionConfig.seoMeta.description,
      images: [{ url: imageUrl, width: 1024, height: 1024, alt: `${order.style} – ${regionConfig.seoMeta.siteName}` }],
    },
  }
}
```

Note: `order.roomType` is a field that must exist in the order object returned by `getOrder`. Verify that `getOrder` returns `roomType`. If `getOrder` does not currently return `roomType`, also add it to the SELECT in `lib/orders.ts` `getOrder` function.

- [ ] **Step 2: Add unauthenticated CTA for overseas result page**

The result page currently shows content for all viewers. For overseas, detect whether the viewer is logged in to show an upsell CTA.

In `app/result/[orderId]/page.tsx`, extend the server-side overseas subscription fetch (lines 110–126) to also check if the user is logged in at all:

```ts
// After existing overseasFreeGenerationsLeft block, add:
let isOverseasGuest = false
if (isOverseas) {
  const { auth } = await import('@/lib/next-auth')
  const session = await auth()
  isOverseasGuest = !session?.user?.id
}
```

Then, at the top of the `done` state JSX (after the opening `<main>` tag at line ~155), add this banner for guests:

```tsx
{isOverseas && isOverseasGuest && (
  <div className="w-full bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between gap-4">
    <p className="text-sm text-amber-200">
      Like this design? Get <strong>3 free HD designs</strong> — no credit card needed.
    </p>
    <Link
      href="/api/auth/signin"
      className="shrink-0 bg-amber-500 text-black text-sm font-bold px-4 h-8 rounded flex items-center hover:bg-amber-400 transition-colors"
    >
      Design your room →
    </Link>
  </div>
)}
```

- [ ] **Step 3: Verify `getOrder` returns `roomType`**

Open `lib/orders.ts` and search for the `getOrder` function. Confirm `roomType` is included in the SELECT. If it is missing, add it:

```ts
// In the SELECT statement of getOrder, ensure roomType is listed:
sql: `SELECT id, style, roomType, quality, mode, status, isFree, resultUrl, uploadId, userId, createdAt
      FROM orders WHERE id = ?`,
```

- [ ] **Step 4: Verify locally**

1. Generate a design while logged in → copy the result URL
2. Open the result URL in an incognito window
3. Confirm: amber "3 free HD designs" banner appears at the top
4. Confirm: clicking "Design your room →" redirects to sign-in page
5. Check browser DevTools → Network → look for the OG `<meta>` tags in the `<head>` — title should be `"Scandinavian Bedroom Design | RoomAI"` (not generic)

- [ ] **Step 5: Commit**

```bash
git add ai-room-designer/app/result/[orderId]/page.tsx ai-room-designer/lib/orders.ts
git commit -m "feat(overseas): richer OG meta on result page + guest upsell CTA"
```

---

## Task 4: Overseas English Style Landing Pages

**Files:**
- Modify: `app/styles/[slug]/page.tsx`

### Context

`/styles/[slug]` pages already exist and use `generateStaticParams` to generate 40 pages from `STYLE_CATEGORIES`. However, all copy is Chinese (`style.label`, Chinese CTA). For overseas, use `style.labelEn` and English copy so Google indexes English keywords.

- [ ] **Step 1: Update `generateMetadata` in `app/styles/[slug]/page.tsx`**

Replace the existing `generateMetadata` function (lines 13–25):

```ts
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const style = findStyleByKey(params.slug)
  if (!style) return { title: isOverseas ? 'RoomAI' : '装AI' }

  if (isOverseas) {
    const title = `${style.labelEn} Interior Design — AI Generated | RoomAI`
    const description = `Get a ${style.labelEn} room design in 30 seconds. Upload a photo of your space and AI instantly redesigns it. 3 free designs on signup.`
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: style.thumbnail, width: 800, height: 600 }],
      },
    }
  }

  return {
    title: `${style.label}装修效果图 - AI一键生成 | 装AI`,
    description: `用AI生成${style.label}风格的装修效果图，30秒出图，1元起。上传房间照片即可体验专业室内设计。`,
    openGraph: {
      title: `${style.label}装修效果图 - AI生成`,
      description: `${style.label}风格装修效果图，AI 30秒出图`,
      images: [{ url: style.thumbnail, width: 800, height: 600 }],
    },
  }
}
```

- [ ] **Step 2: Update the page body for overseas**

Add `import { isOverseas } from '@/lib/region'` to the top imports.

Replace the `StylePage` component body (lines 27–94) with a region-aware version:

```tsx
export default function StylePage({ params }: { params: { slug: string } }) {
  const style = findStyleByKey(params.slug)
  if (!style) notFound()

  const category = STYLE_CATEGORIES.find(c => c.styles.some(s => s.key === params.slug))
  const relatedStyles = category?.styles.filter(s => s.key !== params.slug).slice(0, 4) ?? []

  const name = isOverseas ? style!.labelEn : style!.label
  const siteName = isOverseas ? 'RoomAI' : '装AI'
  const logoLetter = isOverseas ? 'R' : '装'

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center px-4 md:px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">{logoLetter}</div>
          <span className="font-bold text-xl">{siteName}</span>
        </Link>
      </nav>

      <div className="flex flex-col items-center px-4 md:px-[120px] pt-12 pb-16 gap-8">
        <h1 className="text-3xl md:text-5xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>
          {isOverseas ? `${name} Interior Design` : `${name}装修效果图`}
        </h1>
        <p className="text-gray-400 text-lg text-center max-w-lg">
          {isOverseas
            ? `Upload a photo of your room and AI redesigns it in the ${name} style — results in 30 seconds.`
            : `上传您的房间照片，AI 30秒内生成专业的${name}风格装修效果图`}
        </p>

        <div className="relative w-full max-w-[600px] rounded-xl overflow-hidden border border-gray-700">
          <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
            <Image
              src={style!.thumbnail}
              alt={isOverseas ? `${name} interior design example` : `${name}装修效果图示例`}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover"
            />
          </div>
        </div>

        <Link
          href={`/generate?style=${style!.key}`}
          className="bg-amber-500 text-black font-bold text-lg px-10 rounded flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-[0_8px_24px_rgba(255,152,0,0.3)]"
          style={{ height: '56px' }}
        >
          {isOverseas ? `Try ${name} style — free` : `¥1 生成${name}效果图`}
        </Link>

        {relatedStyles.length > 0 && (
          <div className="w-full max-w-[800px] mt-8">
            <h2 className="text-xl font-bold mb-4">{isOverseas ? 'Related Styles' : '相关风格'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {relatedStyles.map(s => (
                <Link key={s.key} href={`/styles/${s.key}`} className="group">
                  <div className="relative rounded-lg overflow-hidden border border-gray-800 group-hover:border-amber-500/50 transition-colors">
                    <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
                      <Image src={s.thumbnail} alt={isOverseas ? s.labelEn : s.label} fill sizes="200px" className="object-cover" />
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <span className="text-white text-sm font-medium">{isOverseas ? s.labelEn : s.label}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify locally**

With `REGION=overseas npm run dev`:
1. Visit `/styles/nordic_minimal` — page shows "Scandinavian Interior Design", English CTA "Try Scandinavian style — free"
2. Visit `/styles/art_deco` — page shows "Art Deco Interior Design", correct English copy
3. Confirm OG tags in DevTools `<head>` are English

- [ ] **Step 4: Commit**

```bash
git add ai-room-designer/app/styles/[slug]/page.tsx
git commit -m "feat(overseas): English copy and OG tags for style landing pages"
```

---

## Task 5: Room Type Landing Pages

**Files:**
- Create: `app/rooms/[slug]/page.tsx`

### Context

`ROOM_TYPES` (24 rooms) is exported from `lib/design-config.ts` and has `labelEn`, `label`, `icon`, and `key` on every entry. These map to URLs like `/rooms/bedroom`, `/rooms/cafe`. The page structure mirrors the style pages.

- [ ] **Step 1: Create `app/rooms/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ROOM_TYPES } from '@/lib/design-config'
import { isOverseas } from '@/lib/region'

export function generateStaticParams() {
  return ROOM_TYPES.map(r => ({ slug: r.key }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const room = ROOM_TYPES.find(r => r.key === params.slug)
  if (!room) return { title: isOverseas ? 'RoomAI' : '装AI' }

  if (isOverseas) {
    const title = `AI ${room.labelEn} Design — Redesign in 30 Seconds | RoomAI`
    const description = `Upload a photo of your ${room.labelEn.toLowerCase()} and AI instantly redesigns it. Get 3 free HD designs on signup — no credit card needed.`
    return {
      title,
      description,
      openGraph: { title, description },
    }
  }

  return {
    title: `${room.label}装修效果图 - AI一键生成 | 装AI`,
    description: `用AI生成${room.label}的装修效果图，30秒出图，上传照片即可体验。`,
    openGraph: {
      title: `${room.label}AI装修效果图`,
      description: `${room.label}装修效果图，AI 30秒出图`,
    },
  }
}

export default function RoomPage({ params }: { params: { slug: string } }) {
  const room = ROOM_TYPES.find(r => r.key === params.slug)
  if (!room) notFound()

  const siteName = isOverseas ? 'RoomAI' : '装AI'
  const logoLetter = isOverseas ? 'R' : '装'
  const name = isOverseas ? room.labelEn : room.label

  const popularStyles = isOverseas
    ? ['nordic_minimal', 'modern_luxury', 'wabi_sabi', 'art_deco']
    : ['nordic_minimal', 'new_chinese', 'modern_luxury', 'french_romantic']

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center px-4 md:px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">{logoLetter}</div>
          <span className="font-bold text-xl">{siteName}</span>
        </Link>
      </nav>

      <div className="flex flex-col items-center px-4 md:px-[120px] pt-12 pb-16 gap-8">
        <div className="text-5xl">{room.icon}</div>

        <h1 className="text-3xl md:text-5xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>
          {isOverseas ? `AI ${name} Designer` : `AI ${name}设计`}
        </h1>

        <p className="text-gray-400 text-lg text-center max-w-lg">
          {isOverseas
            ? `Upload a photo of your ${name.toLowerCase()} and AI redesigns it in any style — results in under 30 seconds.`
            : `上传${name}照片，AI 30秒内生成专业的装修效果图`}
        </p>

        <Link
          href={`/generate?roomType=${room.key}`}
          className="bg-amber-500 text-black font-bold text-lg px-10 rounded flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-[0_8px_24px_rgba(255,152,0,0.3)]"
          style={{ height: '56px' }}
        >
          {isOverseas ? `Design my ${name} — free` : `生成${name}效果图`}
        </Link>

        <div className="w-full max-w-[800px] mt-4">
          <h2 className="text-xl font-bold mb-4">
            {isOverseas ? `Popular styles for ${name}` : `${name}热门风格`}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {popularStyles.map(styleKey => (
              <Link
                key={styleKey}
                href={`/generate?roomType=${room.key}&style=${styleKey}`}
                className="group border border-gray-800 rounded-lg p-4 hover:border-amber-500/50 transition-colors text-center"
              >
                <div className="text-sm text-gray-300 group-hover:text-amber-400 transition-colors capitalize">
                  {styleKey.replace(/_/g, ' ')}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="w-full max-w-[800px] mt-4 border-t border-gray-900 pt-8">
          <h2 className="text-xl font-bold mb-4">{isOverseas ? 'More room types' : '更多房间类型'}</h2>
          <div className="flex flex-wrap gap-3">
            {ROOM_TYPES.filter(r => r.key !== room.key).map(r => (
              <Link
                key={r.key}
                href={`/rooms/${r.key}`}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-amber-400 transition-colors border border-gray-800 hover:border-amber-500/30 rounded-full px-3 py-1.5"
              >
                <span>{r.icon}</span>
                <span>{isOverseas ? r.labelEn : r.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify locally**

With `REGION=overseas npm run dev`:
1. Visit `/rooms/bedroom` — shows "AI Bedroom Designer", amber CTA "Design my Bedroom — free"
2. Visit `/rooms/cafe` — shows "AI Café Designer" with café icon
3. Click a popular style link → navigates to `/generate?roomType=bedroom&style=nordic_minimal`
4. "More room types" section shows 23 other room links

- [ ] **Step 3: Write a test for `generateStaticParams`**

Add `ai-room-designer/__tests__/rooms-page.test.ts`:

```ts
import { ROOM_TYPES } from '@/lib/design-config'

describe('room landing pages', () => {
  it('generates 24 static params', () => {
    const params = ROOM_TYPES.map(r => ({ slug: r.key }))
    expect(params).toHaveLength(24)
  })

  it('all room types have English labels', () => {
    for (const room of ROOM_TYPES) {
      expect(typeof room.labelEn).toBe('string')
      expect(room.labelEn.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 4: Run the test**

```bash
cd ai-room-designer && npx jest __tests__/rooms-page.test.ts --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add ai-room-designer/app/rooms/ ai-room-designer/__tests__/rooms-page.test.ts
git commit -m "feat: add 24 room type SEO landing pages at /rooms/[slug]"
```

---

## Task 6: Update Sitemap

**Files:**
- Modify: `app/sitemap.ts`

### Context

The sitemap currently includes the homepage, `/generate`, and all 40 style pages. Add the 24 room type pages.

- [ ] **Step 1: Modify `app/sitemap.ts`**

```ts
import type { MetadataRoute } from 'next'
import { STYLE_CATEGORIES, ROOM_TYPES } from '@/lib/design-config'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://zhuang.ai'

  const stylePages = STYLE_CATEGORIES.flatMap(c => c.styles).map(s => ({
    url: `${base}/styles/${s.key}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const roomPages = ROOM_TYPES.map(r => ({
    url: `${base}/rooms/${r.key}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${base}/generate`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    ...stylePages,
    ...roomPages,
  ]
}
```

- [ ] **Step 2: Write a test**

Add to `ai-room-designer/__tests__/rooms-page.test.ts` (same file as Task 5):

```ts
import { ROOM_TYPES, STYLE_CATEGORIES } from '@/lib/design-config'

describe('sitemap coverage', () => {
  it('has 40 styles and 24 rooms for sitemap', () => {
    const styleCount = STYLE_CATEGORIES.flatMap(c => c.styles).length
    expect(styleCount).toBe(40)
    expect(ROOM_TYPES).toHaveLength(24)
    // Total sitemap entries: 2 static + 40 styles + 24 rooms = 66
    expect(2 + styleCount + ROOM_TYPES.length).toBe(66)
  })
})
```

- [ ] **Step 3: Run the test**

```bash
cd ai-room-designer && npx jest __tests__/rooms-page.test.ts --no-coverage
```

Expected: PASS (3 tests now)

- [ ] **Step 4: Verify sitemap in browser**

With dev server running: visit `http://localhost:3000/sitemap.xml`
Confirm: 66 entries total, including `/rooms/bedroom`, `/rooms/cafe`, etc.

- [ ] **Step 5: Commit**

```bash
git add ai-room-designer/app/sitemap.ts ai-room-designer/__tests__/rooms-page.test.ts
git commit -m "feat: add 24 room type pages to sitemap (66 total indexed pages)"
```

---

## Self-Review Notes

- **Task 1**: `hasWatermark` in `subscription.ts` is an overseas-only concept; CN never calls `getSubscription`. Safe to set `false` globally in that file.
- **Task 3**: `order.roomType` field — verified to exist in `orders` table schema; confirm it's included in `getOrder` SELECT before deploying.
- **Task 4**: `style!.thumbnail` — all 40 styles have a thumbnail path (`/styles/thumbnails/[key].jpg`). Confirm thumbnail images exist in `public/styles/thumbnails/`.
- **Task 5**: `popularStyles` array uses hardcoded style keys. If a key is renamed in `design-config.ts`, this silently breaks. After Task 5, verify those 4 links render correct style names in browser.
- **Task 6**: The `NEXT_PUBLIC_BASE_URL` env var determines sitemap URLs. Ensure it's set to the production domain in Vercel env config before deploying.
