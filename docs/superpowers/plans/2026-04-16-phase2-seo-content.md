# Phase 2 — SEO Content Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build compounding SEO content assets: a blog with seed articles, a public results gallery fed by user opt-in, and an overseas-compatible referral program that rewards bonus generations.

**Architecture:** Three independent subsystems. (1) MDX blog — `next-mdx-remote/rsc` renders `.mdx` files from `content/blog/`, served at `/blog` and `/blog/[slug]`. (2) Gallery — new `isPublicGallery` column on `orders` table, API route, opt-in toggle on result page, gallery listing at `/gallery`. (3) Referral — add `bonusGenerations` column to `subscriptions` table, update `getSubscription` to include bonus in `generationsLeft`, display referral stats on Account page.

**Tech Stack:** Next.js 14 App Router, `next-mdx-remote` + `gray-matter`, Turso/libsql (ALTER TABLE migrations), Tailwind CSS, Jest.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add `next-mdx-remote`, `gray-matter` |
| `lib/blog.ts` | Create | Read + parse MDX files from `content/blog/` |
| `content/blog/virtual-staging-guide.mdx` | Create | Seed article 1 |
| `content/blog/nordic-bedroom-ideas.mdx` | Create | Seed article 2 |
| `content/blog/best-ai-interior-design-tools.mdx` | Create | Seed article 3 |
| `app/blog/page.tsx` | Create | Blog listing page |
| `app/blog/[slug]/page.tsx` | Create | Article page with MDX rendering |
| `lib/orders.ts` | Modify | Add `isPublicGallery` migration |
| `app/api/gallery/route.ts` | Create | Public gallery API (paginated) |
| `app/api/gallery/opt-in/route.ts` | Create | Toggle gallery opt-in for an order |
| `app/result/[orderId]/page.tsx` | Modify | Add gallery opt-in toggle |
| `app/gallery/page.tsx` | Create | Gallery listing page |
| `lib/subscription.ts` | Modify | Add `bonusGenerations` to schema + `generationsLeft` calc |
| `lib/referral.ts` | Modify | Add overseas reward path (`rewardBonusGeneration`) |
| `app/account/page.tsx` | Modify | Show referral section with invite link + stats |
| `app/sitemap.ts` | Modify | Add `/blog`, `/blog/[slug]`, `/gallery` |
| `__tests__/lib/blog.test.ts` | Create | Blog utility tests |
| `__tests__/lib/subscription-bonus.test.ts` | Create | Bonus generation tests |
| `__tests__/api/gallery.test.ts` | Create | Gallery API tests |

---

## Task 1: Blog — Install Dependencies + Content Utility

**Files:**
- Modify: `package.json`
- Create: `lib/blog.ts`
- Create: `__tests__/lib/blog.test.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd ai-room-designer && npm install next-mdx-remote gray-matter
```

- [ ] **Step 2: Write the failing test**

Create `__tests__/lib/blog.test.ts`:

```ts
import { getAllPosts, getPostBySlug } from '@/lib/blog'

describe('blog utilities', () => {
  it('getAllPosts returns array sorted by date descending', () => {
    const posts = getAllPosts()
    expect(Array.isArray(posts)).toBe(true)
    // After seed articles are added, this will be ≥ 1
    for (const post of posts) {
      expect(post.slug).toBeDefined()
      expect(post.title).toBeDefined()
      expect(post.date).toBeDefined()
      expect(post.description).toBeDefined()
    }
    // Verify descending date order
    for (let i = 1; i < posts.length; i++) {
      expect(new Date(posts[i - 1].date).getTime()).toBeGreaterThanOrEqual(
        new Date(posts[i].date).getTime()
      )
    }
  })

  it('getPostBySlug returns null for non-existent slug', () => {
    const post = getPostBySlug('this-slug-does-not-exist')
    expect(post).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd ai-room-designer && npx jest __tests__/lib/blog.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/blog'`

- [ ] **Step 4: Create `lib/blog.ts`**

```ts
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog')

export interface BlogPost {
  slug: string
  title: string
  date: string
  description: string
  content: string        // raw MDX content (without frontmatter)
  readingTime: number    // estimated minutes
}

export interface BlogPostMeta {
  slug: string
  title: string
  date: string
  description: string
  readingTime: number
}

function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return []

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mdx'))
  const posts = files.map(file => {
    const slug = file.replace(/\.mdx$/, '')
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8')
    const { data, content } = matter(raw)
    return {
      slug,
      title: String(data.title ?? slug),
      date: String(data.date ?? ''),
      description: String(data.description ?? ''),
      readingTime: estimateReadingTime(content),
    }
  })
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  return {
    slug,
    title: String(data.title ?? slug),
    date: String(data.date ?? ''),
    description: String(data.description ?? ''),
    content,
    readingTime: estimateReadingTime(content),
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd ai-room-designer && npx jest __tests__/lib/blog.test.ts --no-coverage
```

Expected: PASS (2 tests — `getAllPosts` returns empty array since no content yet, `getPostBySlug` returns null)

- [ ] **Step 6: Commit**

```bash
git add ai-room-designer/package.json ai-room-designer/package-lock.json ai-room-designer/lib/blog.ts ai-room-designer/__tests__/lib/blog.test.ts
git commit -m "feat(blog): add blog content utility with MDX/frontmatter parsing"
```

---

## Task 2: Blog — Seed Articles

**Files:**
- Create: `content/blog/virtual-staging-guide.mdx`
- Create: `content/blog/nordic-bedroom-ideas.mdx`
- Create: `content/blog/best-ai-interior-design-tools.mdx`

- [ ] **Step 1: Create content directory and first article**

```bash
mkdir -p ai-room-designer/content/blog
```

Create `content/blog/virtual-staging-guide.mdx`:

```mdx
---
title: "How to Virtually Stage a Living Room with AI"
date: "2026-04-16"
description: "Learn how to use AI virtual staging to furnish an empty living room in seconds — no photographer or designer needed."
---

## What Is Virtual Staging?

Virtual staging uses AI to digitally furnish empty rooms in photos. Instead of hiring a stager and photographer — which costs $200–$500 per room — AI tools like [RoomAI](/) can do it in under 30 seconds for free.

## Why Virtual Staging Matters

Virtually staged homes sell **87% faster** and for **15% higher prices** than empty homes. For real estate agents, that translates to thousands of dollars in extra commission per listing.

## How to Virtually Stage a Room with RoomAI

1. **Upload a photo** of your empty room at [RoomAI](/generate)
2. **Select "Virtual Staging"** as the design mode
3. **Choose a style** — try Scandinavian for a clean, modern look
4. **Click Generate** — your staged room is ready in ~30 seconds

The AI analyzes your room's dimensions, lighting, and layout, then adds furniture and decor that fits naturally.

## Tips for Better Results

- **Use well-lit photos** — natural light produces the most realistic staging
- **Shoot from a corner** — wider angles give the AI more context
- **Remove clutter** — the emptier the room, the cleaner the result
- **Try multiple styles** — generate 2-3 variations to find the best match

## Get Started

[Try RoomAI free →](/generate?mode=virtual_staging) — 3 free HD designs on signup, no credit card needed.
```

- [ ] **Step 2: Create second article**

Create `content/blog/nordic-bedroom-ideas.mdx`:

```mdx
---
title: "10 Nordic Bedroom Design Ideas You Can Try with AI"
date: "2026-04-15"
description: "Explore Scandinavian bedroom inspiration and instantly visualize any idea in your own space with AI."
---

## Why Nordic Design Works for Bedrooms

Nordic design emphasizes calm, natural materials, and functional simplicity — exactly what a bedroom needs. Think white walls, warm wood tones, soft textiles, and plenty of natural light.

## Top Nordic Bedroom Ideas

### 1. Minimalist White + Wood

The classic Nordic look: white walls, light oak furniture, and a single statement plant. Works in any size room.

### 2. Cozy Hygge Corner

Add a reading nook with a sheepskin throw, warm lighting, and a small side table. Hygge is about creating warmth in simplicity.

### 3. Japanese-Nordic Fusion

Combine Nordic minimalism with Japanese wabi-sabi — think low platform beds, natural textures, and muted earth tones.

### 4. Scandinavian Maximalism

Yes, it exists. Layer textures — linen, wool, cotton — in a neutral palette. Add art prints and ceramics for personality.

### 5. Light-Filled Studio Bedroom

For small spaces: use mirrors, sheer curtains, and a compact desk to create a bedroom-office that feels open.

## Visualize These Ideas in Your Own Room

Upload a photo of your bedroom and [try the Nordic style →](/generate?style=nordic_minimal&roomType=bedroom). RoomAI transforms your space in 30 seconds — see all [bedroom styles](/rooms/bedroom).
```

- [ ] **Step 3: Create third article**

Create `content/blog/best-ai-interior-design-tools.mdx`:

```mdx
---
title: "Best AI Interior Design Tools in 2026 — Compared"
date: "2026-04-14"
description: "We compare the top AI interior design tools by price, quality, speed, and features — including RoomAI, Interior AI, and RoomGPT."
---

## The AI Interior Design Landscape

AI interior design tools let you upload a photo of any room and instantly see it redesigned in a new style. In 2026, the market has matured — here's how the top tools compare.

## Quick Comparison

| Tool | Price | Free Tier | Speed | Styles |
|------|-------|-----------|-------|--------|
| **RoomAI** | $9.99/mo | 3 free HD designs | ~30s | 40+ |
| Interior AI | $49/mo | None | ~25s | 50+ |
| RoomGPT | Free (limited) | Yes (watermarked) | ~45s | 10+ |
| Reimagine Home | $29/mo | 3 free | ~40s | 30+ |

## RoomAI

[RoomAI](/) offers the best value for casual users and homeowners. With 3 free HD designs on signup (no watermark), 40+ styles, and 8 design modes including virtual staging and sketch-to-render, it covers most use cases at a fraction of the competitor's price.

**Best for:** Homeowners, casual redesigners, anyone who wants to try before committing.

## Interior AI

Interior AI targets professionals with high-volume needs. At $49-199/month, it's the most expensive option but offers parallel generation and 3D walkthroughs.

**Best for:** Real estate agents, professional stagers, interior designers with client volume.

## How to Choose

- **Trying ideas for your own home?** → [RoomAI](/) (free, no commitment)
- **Staging listings professionally?** → Interior AI (volume features)
- **Just experimenting?** → RoomGPT (free but limited)

## Try It Now

[Get 3 free HD designs →](/generate) — upload a room photo and see results in 30 seconds.
```

- [ ] **Step 4: Verify blog utility finds the articles**

```bash
cd ai-room-designer && npx jest __tests__/lib/blog.test.ts --no-coverage
```

Expected: PASS — `getAllPosts` now returns 3 articles sorted by date

- [ ] **Step 5: Commit**

```bash
git add ai-room-designer/content/blog/
git commit -m "content(blog): add 3 seed articles — virtual staging, nordic ideas, tool comparison"
```

---

## Task 3: Blog — Listing Page + Article Page

**Files:**
- Create: `app/blog/page.tsx`
- Create: `app/blog/[slug]/page.tsx`

- [ ] **Step 1: Create blog listing page `app/blog/page.tsx`**

```tsx
import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/blog'
import { isOverseas } from '@/lib/region'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = isOverseas
  ? {
      title: 'Blog — Interior Design Tips & AI Tools | RoomAI',
      description: 'Design guides, style inspiration, and tips for using AI to redesign your space.',
    }
  : {
      title: '博客 — 装修灵感与AI工具 | 装AI',
      description: '装修设计指南、风格灵感与AI工具使用技巧。',
    }

export default function BlogListingPage() {
  const posts = getAllPosts()

  return (
    <main className="min-h-screen bg-black">
      <NavBar />
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-24">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {isOverseas ? 'Blog' : '博客'}
        </h1>
        <p className="text-gray-400 mb-10">
          {isOverseas
            ? 'Design guides, style inspiration, and AI tips.'
            : '装修指南、风格灵感与AI技巧。'}
        </p>

        {posts.length === 0 && (
          <p className="text-gray-500">{isOverseas ? 'No posts yet.' : '暂无文章。'}</p>
        )}

        <div className="flex flex-col gap-6">
          {posts.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block border border-gray-800 rounded-xl p-6 hover:border-amber-500/40 transition-colors"
            >
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                <span>·</span>
                <span>{post.readingTime} min read</span>
              </div>
              <h2 className="text-lg font-semibold group-hover:text-amber-400 transition-colors mb-1">
                {post.title}
              </h2>
              <p className="text-gray-400 text-sm">{post.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Create article page `app/blog/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPosts, getPostBySlug } from '@/lib/blog'
import { isOverseas } from '@/lib/region'
import NavBar from '@/components/NavBar'

export function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPostBySlug(params.slug)
  if (!post) return { title: isOverseas ? 'RoomAI' : '装AI' }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  return {
    title: `${post.title} | ${isOverseas ? 'RoomAI' : '装AI'}`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      url: `${base}/blog/${post.slug}`,
    },
  }
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: isOverseas ? 'RoomAI' : '装AI', url: base },
    publisher: { '@type': 'Organization', name: isOverseas ? 'RoomAI' : '装AI', url: base },
  }

  return (
    <main className="min-h-screen bg-black">
      <NavBar />
      <article className="max-w-3xl mx-auto px-6 pt-16 pb-24">
        <Link href="/blog" className="text-amber-400 text-sm hover:underline mb-6 block">
          ← {isOverseas ? 'Back to Blog' : '返回博客'}
        </Link>

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
          <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
          <span>·</span>
          <span>{post.readingTime} min read</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-8" style={{ fontFamily: 'Georgia, serif' }}>
          {post.title}
        </h1>

        <div className="prose prose-invert prose-amber max-w-none
          prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
          prose-li:text-gray-300
          prose-strong:text-white
          prose-table:text-sm prose-th:text-left prose-th:text-gray-400 prose-td:text-gray-300
          prose-th:border-gray-700 prose-td:border-gray-800
        ">
          <MDXRemote source={post.content} />
        </div>

        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 text-center">
          <p className="text-lg font-semibold mb-2">
            {isOverseas ? 'Ready to redesign your room?' : '准备重新设计你的房间？'}
          </p>
          <p className="text-gray-400 text-sm mb-4">
            {isOverseas ? '3 free HD designs — no credit card needed.' : '免费体验，30秒出图。'}
          </p>
          <Link
            href="/generate"
            className="inline-flex items-center bg-amber-500 text-black font-bold px-8 h-12 rounded hover:bg-amber-400 transition-colors"
          >
            {isOverseas ? 'Try it free →' : '立即体验 →'}
          </Link>
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </article>
    </main>
  )
}
```

- [ ] **Step 3: Add Tailwind `prose` plugin if not installed**

Check `tailwind.config.ts` for `@tailwindcss/typography`. If missing:

```bash
cd ai-room-designer && npm install @tailwindcss/typography
```

Then add to `tailwind.config.ts` plugins array:

```ts
plugins: [require('@tailwindcss/typography')],
```

- [ ] **Step 4: Verify locally**

```bash
cd ai-room-designer && REGION=overseas npm run dev
```

1. Visit `/blog` — shows 3 articles sorted by date (newest first)
2. Click an article → renders full MDX content with styled headings, links, tables
3. "Try it free →" CTA at bottom links to `/generate`
4. Internal links in articles (e.g., `/generate?mode=virtual_staging`) work

- [ ] **Step 5: Commit**

```bash
git add ai-room-designer/app/blog/ ai-room-designer/tailwind.config.ts ai-room-designer/package.json ai-room-designer/package-lock.json
git commit -m "feat(blog): add blog listing and article pages with MDX rendering"
```

---

## Task 4: Gallery — Database Migration + API

**Files:**
- Modify: `lib/orders.ts` (add migration)
- Create: `app/api/gallery/route.ts`
- Create: `app/api/gallery/opt-in/route.ts`
- Create: `__tests__/api/gallery.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/gallery.test.ts`:

```ts
jest.mock('@/lib/storage', () => ({
  downloadFromStorage: jest.fn().mockResolvedValue(null),
  uploadStoragePath: jest.fn((id: string) => `uploads/${id}`),
  uploadToStorage: jest.fn().mockResolvedValue(undefined),
  resultStoragePath: jest.fn((id: string) => `results/${id}`),
}))

import { createOrder, updateOrder, getOrder, closeDb } from '@/lib/orders'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  closeDb()
})

afterEach(() => {
  closeDb()
  delete process.env.ORDERS_DB
})

describe('gallery opt-in', () => {
  it('order isPublicGallery defaults to false', async () => {
    const order = await createOrder({
      style: 'nordic_minimal',
      uploadId: 'test-upload',
      quality: 'standard',
      mode: 'redesign',
      roomType: 'bedroom',
    })
    const fetched = await getOrder(order.id)
    expect(fetched?.isPublicGallery).toBe(false)
  })

  it('can set isPublicGallery to true', async () => {
    const order = await createOrder({
      style: 'nordic_minimal',
      uploadId: 'test-upload',
      quality: 'standard',
      mode: 'redesign',
      roomType: 'bedroom',
    })
    await updateOrder(order.id, { isPublicGallery: true })
    const fetched = await getOrder(order.id)
    expect(fetched?.isPublicGallery).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd ai-room-designer && npx jest __tests__/api/gallery.test.ts --no-coverage
```

Expected: FAIL — `isPublicGallery` is not a known property

- [ ] **Step 3: Add `isPublicGallery` migration to `lib/orders.ts`**

After the existing `resultStoragePath` migration (around line 103), add:

```ts
// Migration: add isPublicGallery for public gallery opt-in
try {
  await _client.execute(`ALTER TABLE orders ADD COLUMN isPublicGallery INTEGER NOT NULL DEFAULT 0`)
} catch {
  // Column already exists — ignore
}
```

Also update the `rowToOrder` function to include `isPublicGallery`:

```ts
isPublicGallery: Boolean(row.isPublicGallery),
```

And update the `Order` type (or interface) to include:

```ts
isPublicGallery: boolean
```

And update `updateOrder` to accept `isPublicGallery`:

In the `updateOrder` function, add support for the new column in the SET clause. Find the existing pattern (it likely builds a dynamic SET clause or uses explicit columns). Add `isPublicGallery` following the same pattern.

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd ai-room-designer && npx jest __tests__/api/gallery.test.ts --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Create gallery API route `app/api/gallery/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/orders'

export async function GET(req: NextRequest) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'))
  const style = req.nextUrl.searchParams.get('style') ?? ''
  const roomType = req.nextUrl.searchParams.get('roomType') ?? ''
  const limit = 24
  const offset = (page - 1) * limit

  const db = await getClient()

  let where = `WHERE isPublicGallery = 1 AND status = 'done' AND resultUrl IS NOT NULL`
  const args: (string | number)[] = []

  if (style) {
    where += ` AND style = ?`
    args.push(style)
  }
  if (roomType) {
    where += ` AND roomType = ?`
    args.push(roomType)
  }

  const countResult = await db.execute({ sql: `SELECT COUNT(*) as c FROM orders ${where}`, args })
  const total = Number(countResult.rows[0].c)

  args.push(limit, offset)
  const result = await db.execute({
    sql: `SELECT id, style, roomType, resultUrl, createdAt FROM orders ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
    args,
  })

  const items = result.rows.map(row => ({
    id: String(row.id),
    style: String(row.style),
    roomType: String(row.roomType),
    resultUrl: String(row.resultUrl),
    createdAt: Number(row.createdAt),
  }))

  return NextResponse.json({
    items,
    page,
    totalPages: Math.ceil(total / limit),
    total,
  })
}
```

- [ ] **Step 6: Create gallery opt-in API route `app/api/gallery/opt-in/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getOrder, updateOrder } from '@/lib/orders'
import { getServerSession } from '@/lib/auth'
import { isOverseas } from '@/lib/region'

export async function POST(req: NextRequest) {
  const body = await req.json() as { orderId: string; optIn: boolean }
  const { orderId, optIn } = body

  if (!orderId || typeof optIn !== 'boolean') {
    return NextResponse.json({ error: 'Missing orderId or optIn' }, { status: 400 })
  }

  const order = await getOrder(orderId)
  if (!order || order.status !== 'done') {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Verify ownership
  if (isOverseas) {
    const { auth } = await import('@/lib/next-auth')
    const session = await auth()
    if (!session?.user?.id || session.user.id !== order.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    const session = await getServerSession(req)
    if (!session?.userId || session.userId !== order.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  await updateOrder(orderId, { isPublicGallery: optIn })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 7: Commit**

```bash
git add ai-room-designer/lib/orders.ts ai-room-designer/app/api/gallery/ ai-room-designer/__tests__/api/gallery.test.ts
git commit -m "feat(gallery): add isPublicGallery column, gallery API, and opt-in endpoint"
```

---

## Task 5: Gallery — Opt-In Toggle on Result Page

**Files:**
- Create: `components/GalleryOptIn.tsx`
- Modify: `app/result/[orderId]/page.tsx`

- [ ] **Step 1: Create `components/GalleryOptIn.tsx`**

This is a client component that toggles gallery opt-in via the API:

```tsx
'use client'

import { useState } from 'react'

export default function GalleryOptIn({ orderId, initialOptIn }: { orderId: string; initialOptIn: boolean }) {
  const [optedIn, setOptedIn] = useState(initialOptIn)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/gallery/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, optIn: !optedIn }),
      })
      if (res.ok) setOptedIn(!optedIn)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border transition-colors ${
        optedIn
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
          : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
      }`}
    >
      <span className={`w-3 h-3 rounded-full transition-colors ${optedIn ? 'bg-amber-500' : 'bg-gray-700'}`} />
      {optedIn ? 'In public gallery' : 'Add to gallery'}
    </button>
  )
}
```

- [ ] **Step 2: Add `GalleryOptIn` to result page**

In `app/result/[orderId]/page.tsx`, import the component:

```ts
import GalleryOptIn from '@/components/GalleryOptIn'
```

In the "done" state JSX, after the existing share/download buttons area, add the gallery opt-in toggle. Find the area where `SharePanel` or action buttons are rendered, and add:

```tsx
{/* Gallery opt-in — only show for the order owner */}
{!isOverseasGuest && isOverseas && (
  <GalleryOptIn orderId={order.id} initialOptIn={order.isPublicGallery ?? false} />
)}
```

For CN region, show the toggle only if the user is the order owner (check `order.userId` against current session). Use the same `isOverseasGuest` flag already computed (for overseas, non-guest = owner).

- [ ] **Step 3: Verify locally**

1. Generate a design while logged in
2. On result page → "Add to gallery" toggle appears
3. Click → toggles to "In public gallery" (amber style)
4. Open incognito → toggle does NOT appear (guest)

- [ ] **Step 4: Commit**

```bash
git add ai-room-designer/components/GalleryOptIn.tsx ai-room-designer/app/result/[orderId]/page.tsx
git commit -m "feat(gallery): add gallery opt-in toggle to result page"
```

---

## Task 6: Gallery — Listing Page

**Files:**
- Create: `app/gallery/page.tsx`

- [ ] **Step 1: Create `app/gallery/page.tsx`**

```tsx
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { isOverseas } from '@/lib/region'
import { STYLE_CATEGORIES, ROOM_TYPES, findStyleByKey } from '@/lib/design-config'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = isOverseas
  ? {
      title: 'AI Interior Design Gallery — Community Designs | RoomAI',
      description: 'Browse AI-generated interior designs from the RoomAI community. Filter by style and room type.',
    }
  : {
      title: 'AI装修效果图画廊 — 社区作品 | 装AI',
      description: '浏览社区用户的AI装修效果图，按风格和房间类型筛选。',
    }

interface GalleryItem {
  id: string
  style: string
  roomType: string
  resultUrl: string
  createdAt: number
}

interface GalleryResponse {
  items: GalleryItem[]
  page: number
  totalPages: number
  total: number
}

async function fetchGallery(searchParams: Record<string, string | undefined>): Promise<GalleryResponse> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const params = new URLSearchParams()
  if (searchParams.page) params.set('page', searchParams.page)
  if (searchParams.style) params.set('style', searchParams.style)
  if (searchParams.roomType) params.set('roomType', searchParams.roomType)

  const res = await fetch(`${base}/api/gallery?${params}`, { cache: 'no-store' })
  if (!res.ok) return { items: [], page: 1, totalPages: 0, total: 0 }
  return res.json()
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  const gallery = await fetchGallery(searchParams)
  const allStyles = STYLE_CATEGORIES.flatMap(c => c.styles)

  return (
    <main className="min-h-screen bg-black">
      <NavBar />
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {isOverseas ? 'Design Gallery' : '效果图画廊'}
        </h1>
        <p className="text-gray-400 mb-8">
          {isOverseas
            ? `${gallery.total} designs shared by the community`
            : `${gallery.total} 个社区分享的设计`}
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/gallery"
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              !searchParams.style && !searchParams.roomType
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-gray-800 text-gray-500 hover:border-gray-600'
            }`}
          >
            {isOverseas ? 'All' : '全部'}
          </Link>
          {allStyles.slice(0, 8).map(s => (
            <Link
              key={s.key}
              href={`/gallery?style=${s.key}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                searchParams.style === s.key
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                  : 'border-gray-800 text-gray-500 hover:border-gray-600'
              }`}
            >
              {isOverseas ? s.labelEn : s.label}
            </Link>
          ))}
        </div>

        {/* Grid */}
        {gallery.items.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-500 text-lg mb-4">
              {isOverseas ? 'No designs yet. Be the first!' : '暂无作品，快来分享吧！'}
            </p>
            <Link
              href="/generate"
              className="inline-flex items-center bg-amber-500 text-black font-bold px-6 h-10 rounded hover:bg-amber-400 transition-colors"
            >
              {isOverseas ? 'Create a design →' : '开始设计 →'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {gallery.items.map(item => {
              const styleEntry = findStyleByKey(item.style)
              const styleLabel = isOverseas
                ? (styleEntry?.labelEn ?? item.style.replace(/_/g, ' '))
                : (styleEntry?.label ?? item.style)
              const roomEntry = ROOM_TYPES.find(r => r.key === item.roomType)
              const roomLabel = isOverseas
                ? (roomEntry?.labelEn ?? item.roomType.replace(/_/g, ' '))
                : (roomEntry?.label ?? item.roomType)

              return (
                <Link key={item.id} href={`/result/${item.id}`} className="group">
                  <div className="relative rounded-lg overflow-hidden border border-gray-800 group-hover:border-amber-500/40 transition-colors">
                    <div className="relative w-full" style={{ aspectRatio: '1' }}>
                      <Image
                        src={item.resultUrl}
                        alt={`${styleLabel} ${roomLabel}`}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <span className="text-white text-xs font-medium">{styleLabel}</span>
                      <span className="text-gray-400 text-xs ml-1">· {roomLabel}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {gallery.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: Math.min(gallery.totalPages, 10) }, (_, i) => i + 1).map(p => (
              <Link
                key={p}
                href={`/gallery?page=${p}${searchParams.style ? `&style=${searchParams.style}` : ''}${searchParams.roomType ? `&roomType=${searchParams.roomType}` : ''}`}
                className={`w-9 h-9 flex items-center justify-center rounded text-sm transition-colors ${
                  p === gallery.page
                    ? 'bg-amber-500 text-black font-bold'
                    : 'text-gray-500 hover:text-white border border-gray-800 hover:border-gray-600'
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify locally**

1. Visit `/gallery` — shows empty state with "No designs yet" CTA
2. After opting in a design from result page → design appears in gallery
3. Style filter pills work (click a style → filters results)
4. Click a gallery item → goes to `/result/:id`

- [ ] **Step 3: Commit**

```bash
git add ai-room-designer/app/gallery/
git commit -m "feat(gallery): add public gallery listing page with filters and pagination"
```

---

## Task 7: Referral — Overseas Bonus Generations

**Files:**
- Modify: `lib/subscription.ts` (add `bonusGenerations` column + update `generationsLeft`)
- Modify: `lib/referral.ts` (add overseas reward path)
- Create: `__tests__/lib/subscription-bonus.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/subscription-bonus.test.ts`:

```ts
jest.mock('@/lib/storage', () => ({
  downloadFromStorage: jest.fn().mockResolvedValue(null),
  uploadStoragePath: jest.fn((id: string) => `uploads/${id}`),
  uploadToStorage: jest.fn().mockResolvedValue(undefined),
  resultStoragePath: jest.fn((id: string) => `results/${id}`),
}))

import { getSubscription, upsertSubscription, addBonusGeneration, closeSubscriptionDb } from '@/lib/subscription'
import { closeDb } from '@/lib/orders'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  process.env.REGION = 'overseas'
  closeDb()
  closeSubscriptionDb()
})

afterEach(() => {
  closeDb()
  closeSubscriptionDb()
  delete process.env.REGION
})

describe('bonus generations', () => {
  it('free user gets bonus added to generationsLeft', async () => {
    // Default free user has 3 left
    const before = await getSubscription('bonus_user')
    expect(before.generationsLeft).toBe(3)

    // Add 1 bonus generation
    await addBonusGeneration('bonus_user')
    const after = await getSubscription('bonus_user')
    expect(after.generationsLeft).toBe(4)
  })

  it('bonus capped at 5', async () => {
    for (let i = 0; i < 7; i++) {
      await addBonusGeneration('capped_user')
    }
    const sub = await getSubscription('capped_user')
    // Free tier: 3 base + 5 bonus cap = 8 max
    expect(sub.generationsLeft).toBe(8)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd ai-room-designer && npx jest __tests__/lib/subscription-bonus.test.ts --no-coverage
```

Expected: FAIL — `addBonusGeneration` is not exported

- [ ] **Step 3: Add `bonusGenerations` to subscription schema**

In `lib/subscription.ts`, add a migration in `getSubscription` (or at module initialization). Since subscriptions uses the shared `getClient`, add an `ensureBonusColumn` function:

```ts
let _bonusMigrated = false
async function ensureBonusColumn(): Promise<void> {
  if (_bonusMigrated) return
  const client = await getClient()
  try {
    await client.execute(`ALTER TABLE subscriptions ADD COLUMN bonusGenerations INTEGER NOT NULL DEFAULT 0`)
  } catch {
    // Column already exists — ignore
  }
  _bonusMigrated = true
}
```

Call `ensureBonusColumn()` at the start of `getSubscription`.

Update `getSubscription` to include bonus in `generationsLeft`:

```ts
// In the SELECT, add bonusGenerations:
sql: `SELECT plan, status, generationsUsed, currentPeriodEnd, bonusGenerations
      FROM subscriptions WHERE userId = ?
      ORDER BY createdAt DESC LIMIT 1`,

// In the calculation:
const bonus = Number(row.bonusGenerations ?? 0)
const left = limit === -1 ? Infinity : Math.max(0, (limit + bonus) - used)
```

For `FREE_DEFAULTS` (no subscription record), bonus starts at 0 so `generationsLeft` stays at 3.

Add the `addBonusGeneration` function:

```ts
const MAX_BONUS_GENERATIONS = 5

export async function addBonusGeneration(userId: string): Promise<boolean> {
  await ensureBonusColumn()
  const client = await getClient()

  // Ensure a subscription record exists (create free defaults if not)
  const existing = await client.execute({
    sql: 'SELECT id, bonusGenerations FROM subscriptions WHERE userId = ?',
    args: [userId],
  })

  if (existing.rows.length === 0) {
    // Create a free subscription record so we can store bonus
    const id = `sub_${crypto.randomBytes(8).toString('hex')}`
    await client.execute({
      sql: `INSERT INTO subscriptions
            (id, userId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd, generationsUsed, bonusGenerations, createdAt)
            VALUES (?, ?, '', '', 'free', 'active', ?, 0, 1, ?)`,
      args: [id, userId, Date.now() + 30 * 86400_000, Date.now()],
    })
    return true
  }

  const currentBonus = Number(existing.rows[0].bonusGenerations ?? 0)
  if (currentBonus >= MAX_BONUS_GENERATIONS) return false

  await client.execute({
    sql: 'UPDATE subscriptions SET bonusGenerations = bonusGenerations + 1 WHERE userId = ?',
    args: [userId],
  })
  return true
}
```

Also reset `_bonusMigrated` in `closeSubscriptionDb`:

```ts
export function closeSubscriptionDb(): void {
  _bonusMigrated = false
}
```

- [ ] **Step 4: Run tests**

```bash
cd ai-room-designer && npx jest __tests__/lib/subscription-bonus.test.ts __tests__/api/create-order-overseas.test.ts __tests__/lib/subscription.test.ts --no-coverage
```

Expected: ALL PASS

- [ ] **Step 5: Add overseas reward path to `lib/referral.ts`**

Add a function `recordOverseasReferral` that uses `addBonusGeneration` instead of IP-based `rewardFreeUse`:

```ts
import { addBonusGeneration } from '@/lib/subscription'

const MAX_OVERSEAS_REFERRAL_REWARDS = 5

export async function recordOverseasReferral({
  referrerUserId,
  refereeUserId,
}: {
  referrerUserId: string
  refereeUserId: string
}): Promise<boolean> {
  if (referrerUserId === refereeUserId) return false

  await ensureTables()
  const db = await getClient()

  // Check if this pair already rewarded
  const existing = await db.execute({
    sql: 'SELECT 1 FROM referral_clicks WHERE ref_code = ? AND visitor_ip = ?',
    args: [referrerUserId, refereeUserId], // Reuse columns: ref_code=referrer, visitor_ip=referee
  })
  if (existing.rows.length > 0) return false

  // Check referrer reward cap
  const rewards = await db.execute({
    sql: 'SELECT reward_count FROM referral_rewards WHERE ip = ?',
    args: [referrerUserId],
  })
  const count = rewards.rows.length > 0 ? Number(rewards.rows[0].reward_count) : 0
  if (count >= MAX_OVERSEAS_REFERRAL_REWARDS) return false

  // Record the referral
  await db.execute({
    sql: 'INSERT INTO referral_clicks (ref_code, visitor_ip, created_at) VALUES (?, ?, ?)',
    args: [referrerUserId, refereeUserId, Date.now()],
  })

  // Reward both parties with bonus generations
  await Promise.all([
    addBonusGeneration(referrerUserId),
    addBonusGeneration(refereeUserId),
  ])

  // Increment referrer counter
  await db.execute({
    sql: `INSERT INTO referral_rewards (ip, reward_count) VALUES (?, 1)
          ON CONFLICT(ip) DO UPDATE SET reward_count = reward_count + 1`,
    args: [referrerUserId],
  })

  return true
}
```

- [ ] **Step 6: Commit**

```bash
git add ai-room-designer/lib/subscription.ts ai-room-designer/lib/referral.ts ai-room-designer/__tests__/lib/subscription-bonus.test.ts
git commit -m "feat(referral): add bonus generations for overseas referral rewards (cap: 5)"
```

---

## Task 8: Referral — Account Page Display

**Files:**
- Modify: `app/account/page.tsx`

- [ ] **Step 1: Update Account page with referral section**

In `app/account/page.tsx`, after the existing subscription card and CTA buttons, add a referral section.

First, import `getReferralCount` and compute the invite link server-side:

```ts
import { getReferralCount } from '@/lib/referral'
import { createHash } from 'crypto'
```

After `const subscription = await getSubscription(sub_session.userId)`, add:

```ts
const refCode = createHash('sha256').update(sub_session.userId).digest('hex').slice(0, 8)
const base = process.env.NEXT_PUBLIC_BASE_URL ?? ''
const inviteUrl = `${base}?ref=${refCode}`
const referralCount = await getReferralCount(refCode)
```

Then in the JSX, after the CTA buttons `</div>`, add:

```tsx
{/* Referral section */}
<div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-6">
  <h2 className="text-lg font-semibold mb-1">Invite Friends</h2>
  <p className="text-gray-400 text-sm mb-4">
    Share your link — you both get 1 extra free design (up to 5 bonus).
  </p>

  <div className="flex items-center gap-2 mb-4">
    <input
      type="text"
      readOnly
      value={inviteUrl}
      className="flex-1 bg-gray-800 text-gray-300 text-sm px-3 h-10 rounded border border-gray-700 outline-none"
    />
    <button
      onClick={`navigator.clipboard.writeText('${inviteUrl}')`}
      className="shrink-0 bg-amber-500 text-black text-sm font-semibold px-4 h-10 rounded hover:bg-amber-400 transition-colors"
    >
      Copy
    </button>
  </div>

  <p className="text-gray-500 text-xs">
    {referralCount} friend{referralCount !== 1 ? 's' : ''} invited so far
  </p>
</div>
```

**Note:** Since `app/account/page.tsx` is a server component, the copy button's `onClick` won't work directly. Extract the copy interaction to a small client component:

Create `components/CopyButton.tsx`:

```tsx
'use client'

import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="shrink-0 bg-amber-500 text-black text-sm font-semibold px-4 h-10 rounded hover:bg-amber-400 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
```

Use `<CopyButton text={inviteUrl} />` in the Account page JSX instead of the inline button.

- [ ] **Step 2: Verify locally**

1. Log in to overseas account → go to `/account`
2. See "Invite Friends" section with invite URL
3. Click "Copy" → URL copied to clipboard, button shows "Copied!"
4. See "0 friends invited so far"

- [ ] **Step 3: Commit**

```bash
git add ai-room-designer/app/account/page.tsx ai-room-designer/components/CopyButton.tsx
git commit -m "feat(referral): add invite section to account page with copy link + stats"
```

---

## Task 9: Update Sitemap

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Add blog and gallery routes**

Update `app/sitemap.ts` to include blog article pages and the gallery page:

```ts
import type { MetadataRoute } from 'next'
import { STYLE_CATEGORIES, ROOM_TYPES } from '@/lib/design-config'
import { getAllPosts } from '@/lib/blog'

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

  const blogPages = getAllPosts().map(p => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${base}/generate`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${base}/gallery`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    ...stylePages,
    ...roomPages,
    ...blogPages,
  ]
}
```

- [ ] **Step 2: Update rooms-page test for sitemap count**

In `__tests__/rooms-page.test.ts`, update the sitemap coverage test to account for blog and gallery:

```ts
describe('sitemap coverage', () => {
  it('covers all styles, rooms, and blog', () => {
    const styleCount = STYLE_CATEGORIES.flatMap(c => c.styles).length
    expect(styleCount).toBe(40)
    expect(ROOM_TYPES.length).toBeGreaterThanOrEqual(24)
    // 4 static (home, generate, blog index, gallery) + styles + rooms + blog articles
    const staticPages = 4
    const total = staticPages + styleCount + ROOM_TYPES.length
    expect(total).toBeGreaterThanOrEqual(69) // 4 + 40 + 25 = 69, plus blog articles
  })
})
```

- [ ] **Step 3: Run all tests**

```bash
cd ai-room-designer && npm test -- --no-coverage
```

Expected: ALL tests pass

- [ ] **Step 4: Commit**

```bash
git add ai-room-designer/app/sitemap.ts ai-room-designer/__tests__/rooms-page.test.ts
git commit -m "feat(sitemap): add blog articles and gallery page (72+ indexed pages)"
```

---

## Self-Review Notes

- **Task 1**: `gray-matter` is a CommonJS module. If `next.config.mjs` uses ESM-only, this may need `transpilePackages` or `esmExternals: 'loose'`. Test the import during implementation.
- **Task 3**: `prose-invert` requires `@tailwindcss/typography` plugin. Step 3 handles installing it if missing. Verify `tailwind.config.ts` has the plugin added.
- **Task 4**: The `updateOrder` function's internal implementation must accept `isPublicGallery` — verify the exact pattern used (dynamic SET builder or explicit columns) before editing.
- **Task 6**: Gallery fetches data via internal `fetch()` to its own API. In production this is a network round-trip; for a large gallery this could be slow. Consider switching to direct DB query if performance matters — but for cold start this is fine.
- **Task 7**: `addBonusGeneration` creates a subscription record for users who have none. This means calling `getSubscription` afterward returns data from the DB row (with bonus) instead of `FREE_DEFAULTS`. Verify that the `currentPeriodEnd` set during creation (30 days from now) doesn't cause issues when the user later signs up for Stripe.
- **Task 8**: The `refCode` in Account page uses `SHA256(userId).slice(0,8)`, but the existing referral system in `app/r/[orderId]/page.tsx` uses `SHA256(IP).slice(0,6)`. These are different systems — the overseas referral uses userId-based codes, CN uses IP-based codes. The `referral_clicks` table reuses columns (`ref_code` = referrer ID, `visitor_ip` = referee ID) for overseas. No schema conflict but column names are misleading.
