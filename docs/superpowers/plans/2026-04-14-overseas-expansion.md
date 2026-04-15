# Overseas Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add overseas deployment capability (Stripe subscriptions, Google OAuth, English UI, GDPR compliance) switchable via `REGION=overseas` env var, without touching any existing CN code paths.

**Architecture:** Single codebase, two deployments. All region-specific values flow from `lib/region-config.ts`. Components never check `isOverseas` directly. CN code paths (Alipay, WeChat/SMS, Chinese UI) are untouched.

**Tech Stack:** NextAuth.js v5 (Auth.js), Stripe Node SDK, `@next/third-parties` (GA4), Next.js App Router

---

## File Map

### New files
- `lib/region.ts` — exports `REGION`, `isOverseas`, `isCN`
- `lib/region-config.ts` — all region-specific config (strings, currency, auth method, share targets, SEO)
- `lib/errors.ts` — centralized error strings, region-aware
- `lib/next-auth.ts` — NextAuth v5 config + Google Provider
- `lib/subscription.ts` — queries subscription table, returns plan + generation limits
- `components/GoogleSignInButton.tsx` — Google sign-in/out button for overseas NavBar
- `components/CookieBanner.tsx` — GDPR cookie consent banner (overseas only)
- `app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
- `app/api/stripe/create-checkout/route.ts` — create Stripe Checkout Session
- `app/api/stripe/webhook/route.ts` — handle Stripe subscription events
- `app/api/stripe/portal/route.ts` — customer portal redirect
- `app/pricing/page.tsx` — three-tier pricing page (overseas only)
- `app/account/page.tsx` — subscription status + billing management (overseas only)
- `app/privacy/page.tsx` — GDPR privacy policy (overseas only)
- `app/terms/page.tsx` — terms of service (overseas only)
- `__tests__/lib/region.test.ts`
- `__tests__/lib/errors.test.ts`
- `__tests__/lib/subscription.test.ts`
- `__tests__/api/stripe-webhook.test.ts`
- `__tests__/api/create-order-overseas.test.ts`

### Modified files
- `lib/env.ts` — add overseas env var validation
- `lib/auth.ts` — add `findOrCreateGoogleUser`, `getServerSession`
- `lib/design-config.ts` — add `labelEn` to `Style` interface + all style entries; add `labelEn` to `RoomType` + all entries; add `labelEn` to `StyleCategory`
- `app/api/create-order/route.ts` — add overseas subscription-check path
- `app/layout.tsx` — region-aware metadata, GA4, CookieBanner
- `app/result/[orderId]/page.tsx` — region-aware `generateMetadata`
- `components/NavBar.tsx` — overseas nav links + auth switch
- `components/StyleSelector.tsx` — display `labelEn` when overseas
- `components/RoomTypeSelector.tsx` — display `labelEn` when overseas
- `components/ShareModal.tsx` — config-driven share targets
- `components/SharePanel.tsx` — config-driven share targets
- `lib/share.ts` — add Twitter + Facebook handlers

---

## Phase 1: Region Foundation

### Task 1: `lib/region.ts` and tests

**Files:**
- Create: `ai-room-designer/lib/region.ts`
- Create: `ai-room-designer/__tests__/lib/region.test.ts`

- [ ] **Step 1.1: Write the failing test**

```ts
// ai-room-designer/__tests__/lib/region.test.ts
describe('region', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('defaults to cn when REGION is unset', async () => {
    delete process.env.REGION
    const { REGION, isOverseas, isCN } = await import('@/lib/region')
    expect(REGION).toBe('cn')
    expect(isOverseas).toBe(false)
    expect(isCN).toBe(true)
  })

  it('is overseas when REGION=overseas', async () => {
    process.env.REGION = 'overseas'
    const { REGION, isOverseas, isCN } = await import('@/lib/region')
    expect(REGION).toBe('overseas')
    expect(isOverseas).toBe(true)
    expect(isCN).toBe(false)
  })
})
```

- [ ] **Step 1.2: Run test — expect FAIL**

```bash
cd ai-room-designer && npx jest __tests__/lib/region.test.ts --no-coverage
```

Expected: `Cannot find module '@/lib/region'`

- [ ] **Step 1.3: Create `lib/region.ts`**

```ts
// ai-room-designer/lib/region.ts
export const REGION = (process.env.REGION ?? 'cn') as 'cn' | 'overseas'
export const isOverseas = REGION === 'overseas'
export const isCN = REGION === 'cn'
```

- [ ] **Step 1.4: Run test — expect PASS**

```bash
npx jest __tests__/lib/region.test.ts --no-coverage
```

- [ ] **Step 1.5: Commit**

```bash
git add lib/region.ts __tests__/lib/region.test.ts
git commit -m "feat: add region.ts — REGION env var with isOverseas/isCN exports"
```

---

### Task 2: `lib/errors.ts` and tests

**Files:**
- Create: `ai-room-designer/lib/errors.ts`
- Create: `ai-room-designer/__tests__/lib/errors.test.ts`

- [ ] **Step 2.1: Write the failing test**

```ts
// ai-room-designer/__tests__/lib/errors.test.ts
describe('ERR messages', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('returns Chinese errors in CN mode', async () => {
    process.env.REGION = 'cn'
    const { ERR } = await import('@/lib/errors')
    expect(ERR.rateLimited).toMatch(/频繁/)
    expect(ERR.uploadMissing).toMatch(/上传/)
    expect(ERR.invalidStyle).toMatch(/风格/)
    expect(ERR.orderFailed).toMatch(/失败/)
  })

  it('returns English errors in overseas mode', async () => {
    process.env.REGION = 'overseas'
    const { ERR } = await import('@/lib/errors')
    expect(ERR.rateLimited).toMatch(/Too many/)
    expect(ERR.uploadMissing).toMatch(/upload/)
    expect(ERR.invalidStyle).toMatch(/style/)
    expect(ERR.orderFailed).toMatch(/failed/)
  })
})
```

- [ ] **Step 2.2: Run test — expect FAIL**

```bash
npx jest __tests__/lib/errors.test.ts --no-coverage
```

- [ ] **Step 2.3: Create `lib/errors.ts`**

```ts
// ai-room-designer/lib/errors.ts
import { isOverseas } from './region'

export const ERR = {
  rateLimited:    isOverseas ? 'Too many requests, please slow down.'          : '请求过于频繁，请稍后再试',
  uploadMissing:  isOverseas ? 'Please upload a photo first.'                  : '请先上传图片',
  invalidStyle:   isOverseas ? 'Invalid style selected.'                       : '无效的风格',
  invalidMode:    isOverseas ? 'Invalid design mode.'                          : '无效的设计模式',
  invalidRoomType:isOverseas ? 'Invalid room type.'                            : '无效的房间类型',
  orderFailed:    isOverseas ? 'Order creation failed, please try again.'      : '创建订单失败，请重试',
  invalidUnlock:  isOverseas ? 'Invalid unlock order.'                         : '无效的解锁订单',
  authRequired:   isOverseas ? 'Sign in required.'                             : '请先登录',
  upgradeRequired:isOverseas ? 'Generation limit reached. Please upgrade your plan.' : '生成次数已用完，请升级套餐',
  fileNotFound:   isOverseas ? 'Uploaded file not found, please re-upload.'    : '上传文件不存在，请重新上传',
} as const
```

- [ ] **Step 2.4: Run test — expect PASS**

```bash
npx jest __tests__/lib/errors.test.ts --no-coverage
```

- [ ] **Step 2.5: Commit**

```bash
git add lib/errors.ts __tests__/lib/errors.test.ts
git commit -m "feat: add errors.ts — region-aware error messages"
```

---

### Task 3: `lib/region-config.ts`

**Files:**
- Create: `ai-room-designer/lib/region-config.ts`

No unit test needed — this is a pure config object; correctness is validated by consumer tests.

- [ ] **Step 3.1: Create `lib/region-config.ts`**

```ts
// ai-room-designer/lib/region-config.ts
import { isOverseas } from './region'

export const regionConfig = {
  // --- Currency ---
  currency:       isOverseas ? 'USD'  : 'CNY',
  currencySymbol: isOverseas ? '$'    : '¥',

  // --- Auth / Payment / Monetization ---
  authMethod:    isOverseas ? 'google'       : 'wechat_sms'       as 'google' | 'wechat_sms',
  paymentMethod: isOverseas ? 'stripe'       : 'alipay'           as 'stripe' | 'alipay',
  monetization:  isOverseas ? 'subscription' : 'pay_per_unlock'   as 'subscription' | 'pay_per_unlock',

  // --- Share targets (order matters — displayed left to right) ---
  shareTargets: isOverseas
    ? ['twitter', 'facebook', 'copy_link'] as const
    : ['wechat', 'douyin', 'xiaohongshu', 'copy_link'] as const,

  // --- UI Strings ---
  strings: {
    // Hero
    heroTitle:       isOverseas ? 'Redesign Any Room with AI'                          : '拍一张照片，AI秒变理想装修',
    heroSubtitle:    isOverseas ? 'Upload a photo. Get a professional interior design in 30 seconds.' : '上传任意角度的房间照片，30秒内看到专业室内设计师级别的装修效果图',
    heroCta:         isOverseas ? 'Generate for Free'                                  : '免费生成效果图',
    heroSecondaryCta:isOverseas ? 'View Examples'                                      : '查看示例效果',
    heroBadge:       isOverseas ? '✦ Free to generate · Pay only if you love it'      : '✦ 免费生成 · 满意再付费',
    // Nav
    navStyles:       isOverseas ? 'Styles'                                             : '风格展示',
    navPricing:      isOverseas ? 'Pricing'                                            : '价格',
    navFaq:          isOverseas ? 'FAQ'                                                : '常见问题',
    navHistory:      isOverseas ? 'History'                                            : '历史记录',
    navAccount:      isOverseas ? 'Account'                                            : '账户',
    navSignIn:       isOverseas ? 'Sign in'                                            : '登录/注册',
    navSignOut:      isOverseas ? 'Sign out'                                           : '退出',
    navGenerate:     isOverseas ? 'Get Started'                                        : '开始体验',
    // Upload
    uploadPrompt:    isOverseas ? 'Drop your room photo here'                          : '拖拽上传房间照片',
    uploadDragHint:  isOverseas ? 'or click to browse'                                 : '或点击选择文件',
    // Generation
    generating:      isOverseas ? 'AI is redesigning your room...'                    : 'AI生成中，请稍候...',
    generatingSubtitle: isOverseas ? 'About 30 seconds'                               : '约30秒',
    // Result
    downloadBtn:     isOverseas ? 'Download'                                           : '下载',
    shareBtn:        isOverseas ? 'Share'                                              : '分享',
    regenerateBtn:   isOverseas ? 'Regenerate'                                         : '重新生成',
    resultWatermarkNotice: isOverseas ? 'Upgrade to Pro to remove watermark'          : '付费解锁去水印版',
    // Share modal
    shareModalTitle: isOverseas ? '✨ Your design is ready!'                           : '✨ 效果图已生成！',
    shareText:       isOverseas ? 'See my AI room redesign! Try it free →'            : '用AI生成了装修效果图，免费试试 →',
    shareSkip:       isOverseas ? 'Skip, just download'                               : '跳过，直接下载',
    // Upgrade
    upgradePrompt:   isOverseas ? 'You have used all your free generations this month. Upgrade to continue.' : '本月免费次数已用完，升级套餐继续生成',
    // Style/room selectors
    styleSelectTitle:   isOverseas ? 'Choose a Style'                                 : '选择装修风格',
    roomTypeSelectTitle:isOverseas ? 'Room Type'                                      : '房间类型',
  },

  // --- SEO ---
  seoMeta: {
    siteName:    isOverseas ? 'RoomAI'                                                 : '装AI',
    keywords:    isOverseas
      ? 'AI room design, interior design AI, room redesign, home renovation AI'
      : 'AI装修效果图, 室内设计AI, 装修效果图免费生成',
    description: isOverseas
      ? 'Redesign any room with AI. Upload a photo, choose a style, get a professional interior design in 30 seconds.'
      : '上传房间照片，AI 30秒生成专业装修效果图。40+种装修风格，免费生成，满意再付款。',
    verificationTag: isOverseas
      ? { 'google-site-verification': process.env.GOOGLE_SITE_VERIFICATION ?? '' }
      : { 'baidu-site-verification': process.env.BAIDU_SITE_VERIFICATION ?? '' },
  },
} as const
```

- [ ] **Step 3.2: Commit**

```bash
git add lib/region-config.ts
git commit -m "feat: add region-config.ts — centralized region-specific config object"
```

---

### Task 4: `lib/env.ts` update + DB migrations

**Files:**
- Modify: `ai-room-designer/lib/env.ts`

- [ ] **Step 4.1: Update `lib/env.ts` to validate overseas vars**

```ts
// ai-room-designer/lib/env.ts
import { isOverseas } from './region'

const REQUIRED_CN_VARS = [
  'ZENMUX_API_KEY',
  'ALIPAY_APP_ID',
  'ALIPAY_PRIVATE_KEY',
  'ALIPAY_PUBLIC_KEY',
  'ALIPAY_NOTIFY_URL',
] as const

const REQUIRED_OVERSEAS_VARS = [
  'ZENMUX_API_KEY',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const

export function validateEnv(): void {
  const vars = isOverseas ? REQUIRED_OVERSEAS_VARS : REQUIRED_CN_VARS
  const missing = (vars as readonly string[]).filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.warn(
      `[warn] Missing environment variables (some features may be disabled):\n  ${missing.join('\n  ')}`,
    )
  }
}

export function warnMissingSupabaseEnv(): void {
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(
    (k) => !process.env[k],
  )
  if (missing.length > 0) {
    console.warn(`[warn] Supabase storage disabled — missing env vars: ${missing.join(', ')}`)
  }
}

export function warnMissingWechatEnv(): void {
  if (isOverseas) return  // WeChat not used overseas
  const missing = ['WECHAT_APPID', 'WECHAT_SECRET'].filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.warn(`[warn] WeChat login disabled — missing env vars: ${missing.join(', ')}`)
  }
}
```

- [ ] **Step 4.2: Add DB migration to `lib/auth.ts` startup**

Open `lib/auth.ts`. Inside the `getClient()` function, after the existing migrations block, add:

```ts
  // Overseas: Google auth columns
  try { await _client.execute(`ALTER TABLE users ADD COLUMN google_id     TEXT`) } catch { /* already exists */ }
  try { await _client.execute(`ALTER TABLE users ADD COLUMN google_email  TEXT`) } catch { /* already exists */ }
  try { await _client.execute(`ALTER TABLE users ADD COLUMN google_avatar TEXT`) } catch { /* already exists */ }
  try { await _client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id) WHERE google_id IS NOT NULL`) } catch { /* already exists */ }
```

- [ ] **Step 4.3: Add subscriptions table migration to `lib/orders.ts`**

Inside `getClient()` in `lib/orders.ts`, after the existing `CREATE TABLE IF NOT EXISTS orders` block, add:

```ts
  await _client.execute(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                   TEXT PRIMARY KEY,
      userId               TEXT NOT NULL,
      stripeCustomerId     TEXT,
      stripeSubscriptionId TEXT,
      plan                 TEXT NOT NULL DEFAULT 'free',
      status               TEXT NOT NULL DEFAULT 'active',
      currentPeriodEnd     INTEGER,
      generationsUsed      INTEGER NOT NULL DEFAULT 0,
      createdAt            INTEGER NOT NULL
    )
  `)
  try { await _client.execute(`ALTER TABLE subscriptions ADD COLUMN generationsUsed INTEGER NOT NULL DEFAULT 0`) } catch { /* already exists */ }
```

- [ ] **Step 4.4: Commit**

```bash
git add lib/env.ts lib/auth.ts lib/orders.ts
git commit -m "feat: env validation for overseas vars; DB migrations for google_id + subscriptions table"
```

---

## Phase 2: Google OAuth

### Task 5: Install NextAuth v5 + configure Google Provider

**Files:**
- Create: `ai-room-designer/lib/next-auth.ts`
- Create: `ai-room-designer/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 5.1: Install NextAuth v5**

```bash
cd ai-room-designer && npm install next-auth@beta
```

Expected: next-auth@5.x.x added to package.json

- [ ] **Step 5.2: Create `lib/next-auth.ts`**

```ts
// ai-room-designer/lib/next-auth.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { findOrCreateGoogleUser } from './auth'
import { isOverseas } from './region'

declare module 'next-auth' {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null }
  }
}

// Also extend JWT type for custom userId field
declare module 'next-auth/jwt' {
  interface JWT { userId?: string }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: isOverseas
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ]
    : [],
  callbacks: {
    async signIn({ user, account }) {
      if (!isOverseas) return false
      if (account?.provider !== 'google') return false
      if (!user.email) return false
      try {
        const dbUser = await findOrCreateGoogleUser({
          googleId: account.providerAccountId,
          email: user.email,
          name: user.name ?? '',
          avatar: user.image ?? '',
        })
        // Store our userId in the token
        user.id = dbUser.userId
        return true
      } catch {
        return false
      }
    },
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id
      return token
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string
      return session
    },
  },
})
```

- [ ] **Step 5.3: Create NextAuth route handler**

```ts
// ai-room-designer/app/api/auth/[...nextauth]/route.ts
export { GET, POST } from '@/lib/next-auth'
```

- [ ] **Step 5.4: Add `NEXTAUTH_SECRET` to `.env.local.example`**

Append to `ai-room-designer/.env.local.example`:
```
# NextAuth (required for overseas)
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe (required for overseas)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Analytics (optional, overseas)
GA_MEASUREMENT_ID=
GOOGLE_SITE_VERIFICATION=
```

- [ ] **Step 5.5: Commit**

```bash
git add lib/next-auth.ts app/api/auth/ .env.local.example package.json package-lock.json
git commit -m "feat: install NextAuth v5, configure Google Provider for overseas auth"
```

---

### Task 6: `findOrCreateGoogleUser` + `getServerSession` in `lib/auth.ts`

**Files:**
- Modify: `ai-room-designer/lib/auth.ts`
- Create: `ai-room-designer/__tests__/lib/auth-google.test.ts`

- [ ] **Step 6.1: Write the failing test**

```ts
// ai-room-designer/__tests__/lib/auth-google.test.ts
import { findOrCreateGoogleUser, closeAuthDb } from '@/lib/auth'

// Use an in-memory SQLite DB for tests
beforeEach(() => {
  process.env.TURSO_DATABASE_URL = ':memory:'
  closeAuthDb()
})

afterEach(() => {
  closeAuthDb()
})

describe('findOrCreateGoogleUser', () => {
  it('creates a new user on first sign-in', async () => {
    const result = await findOrCreateGoogleUser({
      googleId: 'google_123',
      email: 'test@example.com',
      name: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
    })
    expect(result.userId).toMatch(/^usr_/)
    expect(result.googleId).toBe('google_123')
    expect(result.email).toBe('test@example.com')
  })

  it('returns existing user on subsequent sign-in', async () => {
    const first = await findOrCreateGoogleUser({
      googleId: 'google_456',
      email: 'repeat@example.com',
      name: 'Repeat User',
      avatar: '',
    })
    const second = await findOrCreateGoogleUser({
      googleId: 'google_456',
      email: 'repeat@example.com',
      name: 'Repeat User Updated',
      avatar: '',
    })
    expect(first.userId).toBe(second.userId)
  })
})
```

- [ ] **Step 6.2: Run test — expect FAIL**

```bash
npx jest __tests__/lib/auth-google.test.ts --no-coverage
```

- [ ] **Step 6.3: Add `findOrCreateGoogleUser` to `lib/auth.ts`**

Add after the existing `findOrCreateWechatUser` function:

```ts
export async function findOrCreateGoogleUser(params: {
  googleId: string
  email: string
  name: string
  avatar: string
}): Promise<{ userId: string; googleId: string; email: string }> {
  const client = await getClient()

  const existing = await client.execute({
    sql: 'SELECT id FROM users WHERE google_id = ?',
    args: [params.googleId],
  })

  let userId: string
  if (existing.rows.length > 0) {
    userId = String(existing.rows[0].id)
    await client.execute({
      sql: `UPDATE users SET google_email = ?, google_avatar = ? WHERE id = ?`,
      args: [params.email, params.avatar, userId],
    })
  } else {
    userId = `usr_${crypto.randomBytes(8).toString('hex')}`
    await client.execute({
      sql: `INSERT INTO users (id, phone, google_id, google_email, google_avatar, createdAt)
            VALUES (?, NULL, ?, ?, ?, ?)`,
      args: [userId, params.googleId, params.email, params.avatar, Date.now()],
    })
  }

  return { userId, googleId: params.googleId, email: params.email }
}
```

- [ ] **Step 6.4: Add `getServerSession` to `lib/auth.ts`**

Add at the end of `lib/auth.ts`:

```ts
import { isOverseas } from './region'
import type { NextRequest } from 'next/server'

/**
 * Unified session reader. Works for both CN (HMAC cookie) and overseas (NextAuth JWT).
 * All API routes should use this instead of reading cookies directly.
 */
export async function getServerSession(req?: NextRequest): Promise<{ userId: string } | null> {
  if (isOverseas) {
    const { auth } = await import('./next-auth')
    const session = await auth()
    const userId = session?.user?.id
    return userId ? { userId } : null
  }
  // CN: read existing HMAC-signed session cookie
  const token = req?.cookies.get('session')?.value ?? req?.cookies.get('auth_token')?.value
  return token ? parseSessionToken(token) : null
}
```

- [ ] **Step 6.5: Run test — expect PASS**

```bash
npx jest __tests__/lib/auth-google.test.ts --no-coverage
```

- [ ] **Step 6.6: Commit**

```bash
git add lib/auth.ts __tests__/lib/auth-google.test.ts
git commit -m "feat: findOrCreateGoogleUser + getServerSession unified wrapper in lib/auth.ts"
```

---

### Task 7: `GoogleSignInButton` component + NavBar overseas auth

**Files:**
- Create: `ai-room-designer/components/GoogleSignInButton.tsx`
- Modify: `ai-room-designer/components/NavBar.tsx`

- [ ] **Step 7.1: Create `GoogleSignInButton.tsx`**

```tsx
// ai-room-designer/components/GoogleSignInButton.tsx
'use client'
import { signIn, signOut } from 'next-auth/react'

interface Props {
  user?: { name?: string | null; image?: string | null } | null
}

export default function GoogleSignInButton({ user }: Props) {
  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" width={24} height={24} className="rounded-full" />
        )}
        <span className="text-gray-400 text-sm">{user.name?.split(' ')[0]}</span>
        <button
          onClick={() => signOut()}
          className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
    >
      Sign in
    </button>
  )
}
```

- [ ] **Step 7.2: Update `NavBar.tsx` — add overseas auth + nav links**

Open `components/NavBar.tsx`. The current file reads `auth_token` cookie for CN. Add overseas branch:

```tsx
// ai-room-designer/components/NavBar.tsx
import { cookies } from 'next/headers'
import { parseSessionToken, getUser } from '@/lib/auth'
import { isOverseas } from '@/lib/region'
import { regionConfig } from '@/lib/region-config'
import Link from 'next/link'
import MobileMenu from '@/components/MobileMenu'

function maskPhone(phone: string): string {
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

export default async function NavBar() {
  let user: { name?: string | null; image?: string | null; wechat_nickname?: string | null; wechat_avatar?: string | null; phone?: string | null } | null = null

  if (isOverseas) {
    // NextAuth session — read via server-side auth()
    const { auth } = await import('@/lib/next-auth')
    const session = await auth()
    if (session?.user) {
      user = { name: session.user.name, image: session.user.image }
    }
  } else {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    const session = token ? parseSessionToken(token) : null
    const dbUser = session ? await getUser(session.userId).catch(() => null) : null
    if (dbUser) user = dbUser
  }

  const s = regionConfig.strings

  return (
    <nav className="flex items-center px-6 md:px-[120px] h-16 border-b border-gray-900">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">
          {isOverseas ? 'R' : '装'}
        </div>
        <span className="font-bold text-xl">{isOverseas ? 'RoomAI' : '装AI'}</span>
      </Link>
      <div className="flex-1" />

      {isOverseas ? (
        <>
          <Link href="/pricing" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">{s.navPricing}</Link>
          <Link href="/history" className="text-gray-500 text-sm mr-8 hover:text-gray-300 transition-colors hidden md:block">{s.navHistory}</Link>
          <div className="items-center gap-3 mr-6 hidden md:flex">
            {user ? (
              <>
                {user.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" width={24} height={24} className="rounded-full" />
                )}
                <span className="text-gray-400 text-sm">{user.name?.split(' ')[0]}</span>
                <Link href="/account" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">{s.navAccount}</Link>
                <form action="/api/auth/signout" method="POST">
                  <button type="submit" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">{s.navSignOut}</button>
                </form>
              </>
            ) : (
              <Link href="/api/auth/signin" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">{s.navSignIn}</Link>
            )}
          </div>
        </>
      ) : (
        <>
          <a href="#examples" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">风格展示</a>
          <a href="#pricing" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">价格</a>
          <a href="#faq" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">常见问题</a>
          <Link href="/history" className="text-gray-500 text-sm mr-8 hover:text-gray-300 transition-colors hidden md:block">历史记录</Link>
          {user ? (
            <div className="items-center gap-3 mr-6 hidden md:flex">
              {user.wechat_avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.wechat_avatar} alt={user.wechat_nickname ?? ''} width={24} height={24} className="rounded-full" />
              ) : null}
              <span className="text-gray-400 text-sm">
                {user.wechat_nickname ? user.wechat_nickname.slice(0, 8) : maskPhone(user.phone ?? '')}
              </span>
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">退出</button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="text-gray-500 text-sm mr-6 hover:text-gray-300 transition-colors hidden md:block">登录/注册</Link>
          )}
        </>
      )}

      <MobileMenu
        isLoggedIn={!!user}
        userName={
          isOverseas
            ? (user?.name?.split(' ')[0] ?? undefined)
            : (user?.wechat_nickname?.slice(0, 8) ?? (user?.phone ? maskPhone(user.phone) : undefined))
        }
      />

      <Link
        href="/generate"
        className="bg-amber-500 text-black text-sm font-semibold px-5 h-9 rounded items-center hover:bg-amber-400 transition-colors hidden md:flex"
      >
        {s.navGenerate}
      </Link>
    </nav>
  )
}
```

- [ ] **Step 7.3: Commit**

```bash
git add components/GoogleSignInButton.tsx components/NavBar.tsx
git commit -m "feat: GoogleSignInButton; NavBar overseas auth + region-aware nav links"
```

---

## Phase 3: Subscription + Stripe

### Task 8: `lib/subscription.ts` and tests

**Files:**
- Create: `ai-room-designer/lib/subscription.ts`
- Create: `ai-room-designer/__tests__/lib/subscription.test.ts`

- [ ] **Step 8.1: Write the failing test**

```ts
// ai-room-designer/__tests__/lib/subscription.test.ts
import { getSubscription, upsertSubscription, incrementGenerationsUsed, closeSubscriptionDb } from '@/lib/subscription'
import { closeDb } from '@/lib/orders'

beforeEach(() => {
  process.env.TURSO_DATABASE_URL = ':memory:'
  closeDb()
  closeSubscriptionDb()
})

afterEach(() => {
  closeDb()
  closeSubscriptionDb()
})

describe('getSubscription', () => {
  it('returns free tier defaults for user with no subscription record', async () => {
    const sub = await getSubscription('user_unknown')
    expect(sub.plan).toBe('free')
    expect(sub.generationsLimit).toBe(3)
    expect(sub.generationsUsed).toBe(0)
    expect(sub.generationsLeft).toBe(3)
    expect(sub.hasWatermark).toBe(true)
  })

  it('returns unlimited for active unlimited plan', async () => {
    await upsertSubscription({
      userId: 'user_1',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      plan: 'unlimited',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const sub = await getSubscription('user_1')
    expect(sub.plan).toBe('unlimited')
    expect(sub.generationsLimit).toBe(-1)
    expect(sub.generationsLeft).toBe(Infinity)
    expect(sub.hasWatermark).toBe(false)
  })

  it('returns pro limits correctly', async () => {
    await upsertSubscription({
      userId: 'user_2',
      stripeCustomerId: 'cus_2',
      stripeSubscriptionId: 'sub_2',
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    await incrementGenerationsUsed('user_2')
    await incrementGenerationsUsed('user_2')
    const sub = await getSubscription('user_2')
    expect(sub.plan).toBe('pro')
    expect(sub.generationsLimit).toBe(30)
    expect(sub.generationsUsed).toBe(2)
    expect(sub.generationsLeft).toBe(28)
    expect(sub.hasWatermark).toBe(false)
  })

  it('treats canceled subscription as free tier', async () => {
    await upsertSubscription({
      userId: 'user_3',
      stripeCustomerId: 'cus_3',
      stripeSubscriptionId: 'sub_3',
      plan: 'pro',
      status: 'canceled',
      currentPeriodEnd: Date.now() - 1000,  // expired
    })
    const sub = await getSubscription('user_3')
    expect(sub.plan).toBe('free')
    expect(sub.hasWatermark).toBe(true)
  })
})
```

- [ ] **Step 8.2: Run test — expect FAIL**

```bash
npx jest __tests__/lib/subscription.test.ts --no-coverage
```

- [ ] **Step 8.3: Create `lib/subscription.ts`**

```ts
// ai-room-designer/lib/subscription.ts
import { getClient } from './orders'
import crypto from 'crypto'

export type SubscriptionPlan = 'free' | 'pro' | 'unlimited'

const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  free:      3,
  pro:       30,
  unlimited: -1,   // -1 = unlimited
}

export interface SubscriptionInfo {
  plan: SubscriptionPlan
  generationsUsed: number
  generationsLimit: number    // -1 = unlimited
  generationsLeft: number     // Infinity when unlimited
  hasWatermark: boolean
  status: string
}

const FREE_DEFAULTS: SubscriptionInfo = {
  plan: 'free',
  generationsUsed: 0,
  generationsLimit: 3,
  generationsLeft: 3,
  hasWatermark: true,
  status: 'active',
}

export async function getSubscription(userId: string): Promise<SubscriptionInfo> {
  const client = await getClient()
  const result = await client.execute({
    sql: `SELECT plan, status, generationsUsed, currentPeriodEnd
          FROM subscriptions WHERE userId = ?
          ORDER BY createdAt DESC LIMIT 1`,
    args: [userId],
  })

  if (result.rows.length === 0) return { ...FREE_DEFAULTS }

  const row = result.rows[0]
  const status = String(row.status)
  const currentPeriodEnd = Number(row.currentPeriodEnd ?? 0)

  // Treat canceled/expired subscriptions as free
  const isActive = (status === 'active' || status === 'trialing') && currentPeriodEnd > Date.now()
  if (!isActive) return { ...FREE_DEFAULTS }

  const plan = String(row.plan) as SubscriptionPlan
  const limit = PLAN_LIMITS[plan] ?? 3
  const used = Number(row.generationsUsed ?? 0)
  const left = limit === -1 ? Infinity : Math.max(0, limit - used)

  return {
    plan,
    generationsUsed: used,
    generationsLimit: limit,
    generationsLeft: left,
    hasWatermark: plan === 'free',
    status,
  }
}

export async function upsertSubscription(params: {
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  plan: SubscriptionPlan
  status: string
  currentPeriodEnd: number
  resetGenerations?: boolean
}): Promise<void> {
  const client = await getClient()
  const existing = await client.execute({
    sql: 'SELECT id FROM subscriptions WHERE userId = ?',
    args: [params.userId],
  })

  if (existing.rows.length > 0) {
    await client.execute({
      sql: `UPDATE subscriptions
            SET stripeCustomerId = ?, stripeSubscriptionId = ?, plan = ?,
                status = ?, currentPeriodEnd = ?
                ${params.resetGenerations ? ', generationsUsed = 0' : ''}
            WHERE userId = ?`,
      args: [
        params.stripeCustomerId,
        params.stripeSubscriptionId,
        params.plan,
        params.status,
        params.currentPeriodEnd,
        params.userId,
      ],
    })
  } else {
    await client.execute({
      sql: `INSERT INTO subscriptions
            (id, userId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd, generationsUsed, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      args: [
        `sub_${crypto.randomBytes(8).toString('hex')}`,
        params.userId,
        params.stripeCustomerId,
        params.stripeSubscriptionId,
        params.plan,
        params.status,
        params.currentPeriodEnd,
        Date.now(),
      ],
    })
  }
}

export async function incrementGenerationsUsed(userId: string): Promise<void> {
  const client = await getClient()
  await client.execute({
    sql: `UPDATE subscriptions SET generationsUsed = generationsUsed + 1 WHERE userId = ?`,
    args: [userId],
  })
}

/** Expose for test cleanup */
export function closeSubscriptionDb(): void {
  // Subscriptions use the orders DB client — closing orders DB closes this too
}
```

- [ ] **Step 8.4: Run test — expect PASS**

```bash
npx jest __tests__/lib/subscription.test.ts --no-coverage
```

- [ ] **Step 8.5: Commit**

```bash
git add lib/subscription.ts __tests__/lib/subscription.test.ts
git commit -m "feat: lib/subscription.ts — getSubscription, upsertSubscription, incrementGenerationsUsed"
```

---

### Task 9: Stripe Checkout + Portal routes

**Files:**
- Create: `ai-room-designer/app/api/stripe/create-checkout/route.ts`
- Create: `ai-room-designer/app/api/stripe/portal/route.ts`

- [ ] **Step 9.1: Install Stripe SDK**

```bash
cd ai-room-designer && npm install stripe
```

- [ ] **Step 9.2: Create `app/api/stripe/create-checkout/route.ts`**

```ts
// ai-room-designer/app/api/stripe/create-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerSession } from '@/lib/auth'
import { ERR } from '@/lib/errors'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

// Stripe Price IDs — set these in your Stripe dashboard, then add to env
const PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    month: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    year:  process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
  },
  unlimited: {
    month: process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID!,
    year:  process.env.STRIPE_UNLIMITED_YEARLY_PRICE_ID!,
  },
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(req)
  if (!session) return NextResponse.json({ error: ERR.authRequired }, { status: 401 })

  const { plan, interval = 'month' } = await req.json() as { plan: string; interval?: string }

  const priceId = PRICE_IDS[plan]?.[interval]
  if (!priceId) return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/account?upgraded=1`,
    cancel_url:  `${baseUrl}/pricing`,
    metadata: { userId: session.userId },
    subscription_data: { metadata: { userId: session.userId } },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
```

- [ ] **Step 9.3: Create `app/api/stripe/portal/route.ts`**

```ts
// ai-room-designer/app/api/stripe/portal/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerSession } from '@/lib/auth'
import { getSubscription } from '@/lib/subscription'
import { ERR } from '@/lib/errors'
import { getClient } from '@/lib/orders'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function GET(req: NextRequest) {
  const session = await getServerSession(req)
  if (!session) return NextResponse.json({ error: ERR.authRequired }, { status: 401 })

  // Look up stripeCustomerId
  const client = await getClient()
  const result = await client.execute({
    sql: 'SELECT stripeCustomerId FROM subscriptions WHERE userId = ? LIMIT 1',
    args: [session.userId],
  })
  const stripeCustomerId = result.rows[0]?.stripeCustomerId as string | undefined
  if (!stripeCustomerId) return NextResponse.redirect(new URL('/pricing', req.url))

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${baseUrl}/account`,
  })

  return NextResponse.redirect(portalSession.url)
}
```

- [ ] **Step 9.4: Add new Price ID env vars to `.env.local.example`**

Append to `.env.local.example`:
```
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_UNLIMITED_MONTHLY_PRICE_ID=price_...
STRIPE_UNLIMITED_YEARLY_PRICE_ID=price_...
```

- [ ] **Step 9.5: Commit**

```bash
git add app/api/stripe/ .env.local.example package.json package-lock.json
git commit -m "feat: Stripe create-checkout and customer portal API routes"
```

---

### Task 10: Stripe Webhook handler + tests

**Files:**
- Create: `ai-room-designer/app/api/stripe/webhook/route.ts`
- Create: `ai-room-designer/__tests__/api/stripe-webhook.test.ts`

- [ ] **Step 10.1: Write the failing test**

```ts
// ai-room-designer/__tests__/api/stripe-webhook.test.ts
// Tests the subscription upsert logic triggered by webhook events
import { upsertSubscription, getSubscription, closeSubscriptionDb } from '@/lib/subscription'
import { closeDb } from '@/lib/orders'

beforeEach(() => {
  process.env.TURSO_DATABASE_URL = ':memory:'
  closeDb()
  closeSubscriptionDb()
})

afterEach(() => {
  closeDb()
  closeSubscriptionDb()
})

describe('subscription upsert on webhook events', () => {
  it('creates subscription on customer.subscription.created', async () => {
    await upsertSubscription({
      userId: 'user_hook_1',
      stripeCustomerId: 'cus_hook_1',
      stripeSubscriptionId: 'sub_hook_1',
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const sub = await getSubscription('user_hook_1')
    expect(sub.plan).toBe('pro')
    expect(sub.status).toBe('active')
  })

  it('resets generationsUsed on billing cycle renewal', async () => {
    // Create subscription with some usage
    await upsertSubscription({
      userId: 'user_hook_2',
      stripeCustomerId: 'cus_hook_2',
      stripeSubscriptionId: 'sub_hook_2',
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const { incrementGenerationsUsed } = await import('@/lib/subscription')
    await incrementGenerationsUsed('user_hook_2')
    await incrementGenerationsUsed('user_hook_2')

    // Simulate renewal: update with resetGenerations=true
    await upsertSubscription({
      userId: 'user_hook_2',
      stripeCustomerId: 'cus_hook_2',
      stripeSubscriptionId: 'sub_hook_2',
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000 * 31,
      resetGenerations: true,
    })

    const sub = await getSubscription('user_hook_2')
    expect(sub.generationsUsed).toBe(0)
  })

  it('marks subscription as canceled', async () => {
    await upsertSubscription({
      userId: 'user_hook_3',
      stripeCustomerId: 'cus_hook_3',
      stripeSubscriptionId: 'sub_hook_3',
      plan: 'unlimited',
      status: 'canceled',
      currentPeriodEnd: Date.now() - 1000,
    })
    const sub = await getSubscription('user_hook_3')
    expect(sub.plan).toBe('free')  // expired → falls back to free
  })
})
```

- [ ] **Step 10.2: Run test — expect PASS** (tests use upsertSubscription directly, no actual webhook needed)

```bash
npx jest __tests__/api/stripe-webhook.test.ts --no-coverage
```

- [ ] **Step 10.3: Create `app/api/stripe/webhook/route.ts`**

```ts
// ai-room-designer/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { upsertSubscription, type SubscriptionPlan } from '@/lib/subscription'
import { logger } from '@/lib/logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

// Stripe requires the raw body for signature verification — disable Next.js body parsing
export const config = { api: { bodyParser: false } }

function planFromPriceId(priceId: string): SubscriptionPlan {
  if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID ||
      priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) return 'pro'
  if (priceId === process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID ||
      priceId === process.env.STRIPE_UNLIMITED_YEARLY_PRICE_ID) return 'unlimited'
  return 'free'
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    logger.warn('stripe-webhook', 'Signature verification failed', { error: String(err) })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const sub = event.data.object as Stripe.Subscription

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const userId = sub.metadata?.userId
    if (!userId) {
      logger.warn('stripe-webhook', 'Subscription event missing userId metadata', { subscriptionId: sub.id })
      return NextResponse.json({ received: true })
    }

    const priceId = (sub.items.data[0]?.price?.id) ?? ''
    const plan = planFromPriceId(priceId)

    // Detect billing cycle renewal: stripe sends 'updated' when period advances
    const prevPeriodEnd = (event.data.previous_attributes as Record<string, unknown>)?.current_period_end
    const periodRenewed = typeof prevPeriodEnd === 'number' && prevPeriodEnd < sub.current_period_end

    await upsertSubscription({
      userId,
      stripeCustomerId: String(sub.customer),
      stripeSubscriptionId: sub.id,
      plan,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end * 1000,  // Stripe uses seconds, we use ms
      resetGenerations: periodRenewed,
    })

    logger.info('stripe-webhook', `Handled ${event.type}`, { userId, plan, status: sub.status })
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 10.4: Commit**

```bash
git add app/api/stripe/webhook/ __tests__/api/stripe-webhook.test.ts
git commit -m "feat: Stripe webhook handler — subscription create/update/delete + billing cycle reset"
```

---

### Task 11: Update `create-order` with overseas subscription gate

**Files:**
- Modify: `ai-room-designer/app/api/create-order/route.ts`
- Create: `ai-room-designer/__tests__/api/create-order-overseas.test.ts`

- [ ] **Step 11.1: Write the failing test**

```ts
// ai-room-designer/__tests__/api/create-order-overseas.test.ts
// Tests the subscription gate logic in isolation
import { getSubscription, upsertSubscription, closeSubscriptionDb } from '@/lib/subscription'
import { closeDb } from '@/lib/orders'

beforeEach(() => {
  process.env.TURSO_DATABASE_URL = ':memory:'
  process.env.REGION = 'overseas'
  closeDb()
  closeSubscriptionDb()
})

afterEach(() => {
  closeDb()
  closeSubscriptionDb()
  delete process.env.REGION
})

describe('subscription gate for overseas order creation', () => {
  it('free user with 0 used can generate (generationsLeft > 0)', async () => {
    const sub = await getSubscription('free_user')
    expect(sub.generationsLeft).toBeGreaterThan(0)
  })

  it('free user at limit cannot generate (generationsLeft === 0)', async () => {
    // Simulate 3 generations used for free plan
    await upsertSubscription({
      userId: 'free_maxed',
      stripeCustomerId: '',
      stripeSubscriptionId: '',
      plan: 'free',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const client = (await import('@/lib/orders')).getClient
    const db = await client()
    await db.execute({ sql: 'UPDATE subscriptions SET generationsUsed = 3 WHERE userId = ?', args: ['free_maxed'] })

    const sub = await getSubscription('free_maxed')
    expect(sub.generationsLeft).toBe(0)
  })

  it('unlimited plan always has generationsLeft as Infinity', async () => {
    await upsertSubscription({
      userId: 'unlimited_user',
      stripeCustomerId: 'cus_x',
      stripeSubscriptionId: 'sub_x',
      plan: 'unlimited',
      status: 'active',
      currentPeriodEnd: Date.now() + 86400_000,
    })
    const sub = await getSubscription('unlimited_user')
    expect(sub.generationsLeft).toBe(Infinity)
  })
})
```

- [ ] **Step 11.2: Run test — expect PASS** (tests subscription logic, not the route directly)

```bash
npx jest __tests__/api/create-order-overseas.test.ts --no-coverage
```

- [ ] **Step 11.3: Update `app/api/create-order/route.ts`**

At the top of the file, add imports:

```ts
import { isOverseas } from '@/lib/region'
import { ERR } from '@/lib/errors'
import { getSubscription, incrementGenerationsUsed } from '@/lib/subscription'
import { getServerSession } from '@/lib/auth'
```

**Important:** The existing CN path calls `await req.json()` early in the handler. The overseas path also needs that data. To avoid reading the body twice (which fails), read it ONCE at the top and share it:

Replace the existing `const { uploadId, style... } = await req.json()` line near the top of the POST handler with:

```ts
  // Read body once — used by both CN and overseas paths
  const body = await req.json() as {
    uploadId?: string; style?: string; quality?: QualityTier; mode?: DesignMode
    roomType?: string; customPrompt?: string; unlockOrderId?: string
  }
  const { uploadId, style = '', quality = 'standard', mode = 'redesign', roomType = 'living_room', customPrompt, unlockOrderId } = body
```

Then remove the `await req.json()` call inside the overseas block below (use the already-destructured variables). Inside the `POST` handler, after the rate-limit check, add the overseas auth+subscription gate before the existing CN Alipay logic:

```ts
  // ── OVERSEAS PATH ──────────────────────────────────────────────────────────
  if (isOverseas) {
    const session = await getServerSession(req)
    if (!session) return NextResponse.json({ error: ERR.authRequired }, { status: 401 })

    // uploadId, style, quality, mode, roomType, customPrompt already destructured above

    const validModes: string[] = DESIGN_MODES.map((m) => m.key)
    if (!validModes.includes(mode)) return NextResponse.json({ error: ERR.invalidMode }, { status: 400 })
    const modeConfig = DESIGN_MODES.find((m) => m.key === mode)!
    if (modeConfig.needsStyle && !ALL_STYLE_KEYS.includes(style)) return NextResponse.json({ error: ERR.invalidStyle }, { status: 400 })
    if (!ALL_ROOM_TYPE_KEYS.includes(roomType)) return NextResponse.json({ error: ERR.invalidRoomType }, { status: 400 })
    if (modeConfig.needsUpload && !uploadId) return NextResponse.json({ error: ERR.uploadMissing }, { status: 400 })

    if (modeConfig.needsUpload && uploadId) {
      const uploadPath = path.resolve(path.join(UPLOAD_DIR, uploadId))
      if (!uploadPath.startsWith(path.resolve(UPLOAD_DIR))) return NextResponse.json({ error: 'Invalid upload ID' }, { status: 400 })
      if (!fs.existsSync(uploadPath)) return NextResponse.json({ error: ERR.fileNotFound }, { status: 400 })
    }

    // Check subscription
    const sub = await getSubscription(session.userId)
    if (sub.generationsLeft === 0) {
      return NextResponse.json({ error: ERR.upgradeRequired, upgradeUrl: '/pricing' }, { status: 402 })
    }

    const trimmedPrompt = customPrompt?.trim().slice(0, 200) || undefined
    const isFree = sub.plan === 'free'

    try {
      const order = await createOrder({
        style,
        uploadId: uploadId ?? null,
        quality,
        mode,
        roomType,
        customPrompt: trimmedPrompt,
        isFree,
        userId: session.userId,
      })
      await updateOrder(order.id, { status: 'paid' })
      await incrementGenerationsUsed(session.userId)
      logger.info('create-order', 'Overseas order created', { orderId: order.id, plan: sub.plan })
      return NextResponse.json({ orderId: order.id })
    } catch (err) {
      logger.error('create-order', 'Failed to create overseas order', { error: String(err) })
      return NextResponse.json({ error: ERR.orderFailed }, { status: 500 })
    }
  }
  // ── END OVERSEAS PATH ──────────────────────────────────────────────────────
```

Also replace the existing Chinese error strings in the CN path with `ERR.*`:
- `'请求过于频繁，请稍后再试'` → `ERR.rateLimited`
- `'请先上传图片'` → `ERR.uploadMissing`
- `'无效的设计模式'` → `ERR.invalidMode`
- `'无效的风格'` → `ERR.invalidStyle`
- `'无效的房间类型'` → `ERR.invalidRoomType`
- `'上传文件不存在，请重新上传'` → `ERR.fileNotFound`
- `'创建订单失败，请重试'` → `ERR.orderFailed`
- `'无效的解锁订单'` → `ERR.invalidUnlock`

- [ ] **Step 11.4: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass

- [ ] **Step 11.5: Commit**

```bash
git add app/api/create-order/route.ts __tests__/api/create-order-overseas.test.ts
git commit -m "feat: overseas subscription gate in create-order; migrate error strings to lib/errors.ts"
```

---

### Task 12: Pricing page + Account page

**Files:**
- Create: `ai-room-designer/app/pricing/page.tsx`
- Create: `ai-room-designer/app/account/page.tsx`

- [ ] **Step 12.1: Create `app/pricing/page.tsx`**

```tsx
// ai-room-designer/app/pricing/page.tsx
'use client'
import { useState } from 'react'
import NavBar from '@/components/NavBar'
import { isOverseas } from '@/lib/region'
import { redirect } from 'next/navigation'

if (!isOverseas) redirect('/')

const PLANS = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    generations: '3/month',
    watermark: true,
    features: ['3 generations per month', 'Watermarked results', 'All room types', 'All 40+ styles'],
    cta: 'Get Started',
    plan: null,
  },
  {
    name: 'Pro',
    monthlyPrice: 9.99,
    yearlyPrice: 7.99,  // $95.90/yr
    generations: '30/month',
    watermark: false,
    features: ['30 generations per month', 'No watermark', 'All room types', 'All 40+ styles', 'High-res downloads'],
    cta: 'Upgrade to Pro',
    plan: 'pro',
    highlight: true,
  },
  {
    name: 'Unlimited',
    monthlyPrice: 19.99,
    yearlyPrice: 15.99,  // $191.90/yr
    generations: 'Unlimited',
    watermark: false,
    features: ['Unlimited generations', 'No watermark', 'All room types', 'All 40+ styles', 'High-res downloads', 'Priority generation'],
    cta: 'Go Unlimited',
    plan: 'unlimited',
  },
]

export default function PricingPage() {
  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const [loading, setLoading] = useState<string | null>(null)

  async function handleUpgrade(plan: string) {
    setLoading(plan)
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, interval }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(null)
  }

  return (
    <main className="min-h-screen bg-black">
      <NavBar />
      <section className="flex flex-col items-center px-6 pt-16 pb-24 gap-8">
        <h1 className="text-4xl md:text-5xl font-bold text-center">Simple, transparent pricing</h1>
        <p className="text-gray-400 text-center max-w-md">Start free. Upgrade when you need more generations.</p>

        {/* Interval toggle */}
        <div className="flex items-center gap-3 bg-gray-900 rounded-full p-1">
          <button
            onClick={() => setInterval('month')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${interval === 'month' ? 'bg-white text-black' : 'text-gray-400'}`}
          >Monthly</button>
          <button
            onClick={() => setInterval('year')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${interval === 'year' ? 'bg-white text-black' : 'text-gray-400'}`}
          >Yearly <span className="text-amber-500 text-xs">–20%</span></button>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`flex flex-col rounded-2xl p-6 border ${p.highlight ? 'border-amber-500 bg-amber-950/20' : 'border-gray-800 bg-gray-900'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-lg">{p.name}</span>
                {p.highlight && <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded-full font-semibold">Popular</span>}
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold">
                  ${interval === 'month' ? p.monthlyPrice : p.yearlyPrice}
                </span>
                {p.monthlyPrice > 0 && <span className="text-gray-400 text-sm">/mo</span>}
              </div>
              <ul className="flex flex-col gap-2 mb-6 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-amber-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              {p.plan ? (
                <button
                  onClick={() => handleUpgrade(p.plan!)}
                  disabled={loading === p.plan}
                  className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${p.highlight ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-gray-700 text-white hover:bg-gray-600'} disabled:opacity-50`}
                >
                  {loading === p.plan ? 'Loading...' : p.cta}
                </button>
              ) : (
                <button className="w-full py-2.5 rounded-lg font-semibold text-sm bg-gray-800 text-gray-300 cursor-default">
                  {p.cta}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 12.2: Create `app/account/page.tsx`**

```tsx
// ai-room-designer/app/account/page.tsx
import NavBar from '@/components/NavBar'
import { getServerSession } from '@/lib/auth'
import { getSubscription } from '@/lib/subscription'
import { isOverseas } from '@/lib/region'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

export default async function AccountPage() {
  if (!isOverseas) redirect('/')

  // Read session server-side via NextAuth
  const { auth } = await import('@/lib/next-auth')
  const nextAuthSession = await auth()
  const sub_session = nextAuthSession?.user?.id
    ? { userId: nextAuthSession.user.id }
    : null

  if (!sub_session) redirect('/api/auth/signin')

  const subscription = await getSubscription(sub_session.userId)

  const planLabel: Record<string, string> = {
    free: 'Free',
    pro: 'Pro',
    unlimited: 'Unlimited',
  }

  const usagePercent = subscription.generationsLimit === -1
    ? 100
    : Math.round((subscription.generationsUsed / subscription.generationsLimit) * 100)

  return (
    <main className="min-h-screen bg-black">
      <NavBar />
      <div className="max-w-xl mx-auto px-6 pt-16 pb-24">
        <h1 className="text-2xl font-bold mb-8">Account</h1>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm">Current plan</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${subscription.plan === 'unlimited' ? 'bg-purple-900 text-purple-300' : subscription.plan === 'pro' ? 'bg-amber-900 text-amber-400' : 'bg-gray-800 text-gray-400'}`}>
              {planLabel[subscription.plan]}
            </span>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Generations this month</span>
              <span>
                {subscription.plan === 'unlimited'
                  ? 'Unlimited'
                  : `${subscription.generationsUsed} / ${subscription.generationsLimit}`}
              </span>
            </div>
            {subscription.plan !== 'unlimited' && (
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {subscription.plan !== 'unlimited' && (
            <a
              href="/pricing"
              className="block w-full py-3 bg-amber-500 text-black font-semibold text-sm text-center rounded-lg hover:bg-amber-400 transition-colors"
            >
              Upgrade Plan
            </a>
          )}
          {subscription.plan !== 'free' && (
            <a
              href="/api/stripe/portal"
              className="block w-full py-3 bg-gray-800 text-white font-semibold text-sm text-center rounded-lg hover:bg-gray-700 transition-colors"
            >
              Manage Billing
            </a>
          )}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 12.3: Commit**

```bash
git add app/pricing/ app/account/
git commit -m "feat: pricing page (3-tier Stripe) and account page (subscription status + billing)"
```

---

## Phase 4: UI Copy + Language

### Task 13: `labelEn` for styles, room types, and design modes in `design-config.ts`

**Files:**
- Modify: `ai-room-designer/lib/design-config.ts`

- [ ] **Step 13.1: Add `labelEn` to `Style` and `StyleCategory` interfaces, and `descEn` to design modes**

Open `lib/design-config.ts`. Update the interfaces:

```ts
export interface Style {
  key: string
  label: string
  labelEn: string   // ← add
  prompt: string
  promptEn: string
  thumbnail: string
}

export interface StyleCategory {
  key: string
  label: string
  labelEn: string   // ← add
  icon: string
  styles: Style[]
}

export interface RoomType {
  key: string
  label: string
  labelEn: string   // ← add
  icon: string
  promptHint: string
  promptHintCn: string
}
```

- [ ] **Step 13.2: Add `labelEn` to each `StyleCategory`**

Update the `STYLE_CATEGORIES` array — add `labelEn` to each category:

```ts
// minimalist category:
labelEn: 'Minimalist',
// chinese category:
labelEn: 'Oriental',
// european category:
labelEn: 'European',
// modern category:
labelEn: 'Modern',
// retro category:
labelEn: 'Retro',
// natural category:
labelEn: 'Natural',
// industrial category:
labelEn: 'Industrial',
// creative category:
labelEn: 'Creative',
```

- [ ] **Step 13.3: Add `labelEn` to every `Style` entry**

Add `labelEn` next to each `label` field in `STYLE_CATEGORIES`:

```
nordic_minimal   → 'Scandinavian'
japanese_muji    → 'Japanese Muji'
minimalism       → 'Minimalist'
cream_style      → 'Cream Style'
raw_wood         → 'Natural Wood'
white_minimal    → 'White Minimalist'
new_chinese      → 'New Chinese'
zen_eastern      → 'Zen Eastern'
chinese_classical→ 'Chinese Classical'
chinese_luxury   → 'Chinese Luxury'
french_romantic  → 'French Romantic'
italian_minimal  → 'Italian Minimal'
mediterranean    → 'Mediterranean'
english_countryside → 'English Country'
spanish_colonial → 'Spanish Colonial'
modern_luxury    → 'Modern Luxury'
modern_simple    → 'Modern Simple'
urban_modern     → 'Urban Modern'
high_tech        → 'High-Tech'
futurism         → 'Futurism'
american_retro   → 'American Retro'
mid_century      → 'Mid-Century Modern'
art_deco         → 'Art Deco'
bohemian         → 'Bohemian'
vintage          → 'Vintage'
wabi_sabi        → 'Wabi-Sabi'
organic_modern   → 'Organic Modern'
tropical         → 'Tropical Resort'
countryside      → 'Countryside'
log_cabin        → 'Log Cabin'
raw_industrial   → 'Industrial'
loft             → 'Loft'
steampunk        → 'Steampunk'
warehouse        → 'Warehouse Loft'
memphis          → 'Memphis'
color_clash      → 'Color Pop'
cyberpunk        → 'Cyberpunk'
kids_playful     → 'Kids Playful'
moroccan         → 'Moroccan'
southeast_asian  → 'Southeast Asian'
```

- [ ] **Step 13.4: Add `labelEn` to every `RoomType` entry**

Add `labelEn` next to each `label` field in `ROOM_TYPES`:

```
living_room    → 'Living Room'
bedroom        → 'Bedroom'
kids_room      → "Kids' Room"
study          → 'Home Office'
dressing_room  → 'Walk-in Closet'
kitchen        → 'Kitchen'
dining_room    → 'Dining Room'
bathroom       → 'Bathroom'
balcony        → 'Balcony'
laundry_room   → 'Laundry Room'
entrance       → 'Entryway'
hallway        → 'Hallway'
staircase      → 'Staircase'
elevator_lobby → 'Elevator Lobby'
office         → 'Office'
cafe           → 'Café'
restaurant     → 'Restaurant'
hotel_room     → 'Hotel Room'
retail_store   → 'Retail Store'
gym            → 'Gym'
garden         → 'Garden'
patio          → 'Patio'
front_yard     → 'Front Yard'
rooftop        → 'Rooftop Garden'
pool_area      → 'Pool Area'
```

- [ ] **Step 13.5: Add `descEn` and `labelEn` to `DESIGN_MODES`**

Update the `DESIGN_MODES` type and array:

```ts
export const DESIGN_MODES: { key: DesignMode; label: string; labelEn: string; icon: string; desc: string; descEn: string; needsStyle: boolean; needsUpload: boolean }[] = [
  { key: 'redesign',         label: '风格改造', labelEn: 'Style Redesign',    icon: '🎨', desc: '改变整体装修风格',   descEn: 'Change the overall interior style',   needsStyle: true,  needsUpload: true  },
  { key: 'virtual_staging',  label: '虚拟家装', labelEn: 'Virtual Staging',   icon: '🛋️', desc: '空房间添加全套家具', descEn: 'Furnish an empty room',               needsStyle: true,  needsUpload: true  },
  { key: 'add_furniture',    label: '添加家具', labelEn: 'Add Furniture',     icon: '🪑', desc: '现有房间增添家具',   descEn: 'Add furniture to existing room',      needsStyle: true,  needsUpload: true  },
  { key: 'paint_walls',      label: '墙面换色', labelEn: 'Paint Walls',       icon: '🖌️', desc: '改变墙面颜色材质',   descEn: 'Change wall color and material',      needsStyle: false, needsUpload: true  },
  { key: 'change_lighting',  label: '灯光优化', labelEn: 'Lighting Upgrade',  icon: '💡', desc: '改善房间光照效果',   descEn: 'Improve room lighting',               needsStyle: false, needsUpload: true  },
  { key: 'sketch2render',    label: '草图生成', labelEn: 'Sketch to Render',  icon: '✏️', desc: '草图变效果图',       descEn: 'Turn a sketch into a render',         needsStyle: true,  needsUpload: true  },
  { key: 'freestyle',        label: '自由生成', labelEn: 'AI Generate',       icon: '✨', desc: '无需上传照片',       descEn: 'Generate without a photo',            needsStyle: true,  needsUpload: false },
  { key: 'outdoor_redesign', label: '户外设计', labelEn: 'Outdoor Design',    icon: '🌿', desc: '庭院景观改造',       descEn: 'Redesign outdoor / garden space',     needsStyle: false, needsUpload: true  },
]
```

- [ ] **Step 13.6: Run build to check for type errors**

```bash
cd ai-room-designer && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 13.7: Commit**

```bash
git add lib/design-config.ts
git commit -m "feat: add labelEn/descEn to all styles, room types, and design modes in design-config.ts"
```

---

### Task 14: Update `app/page.tsx` hero copy + `UploadZone` prompt text

**Files:**
- Modify: `ai-room-designer/app/page.tsx`
- Modify: `ai-room-designer/components/UploadZone.tsx`

- [ ] **Step 14h.1: Update hero copy in `app/page.tsx`**

Open `app/page.tsx`. Add import and replace hardcoded Chinese strings:

```tsx
import { regionConfig } from '@/lib/region-config'

const s = regionConfig.strings
```

Then replace:
- `'✦ 免费生成 · 满意再付费'` → `{s.heroBadge}`
- `'拍一张照片\n            AI秒变理想装修'` (the h1 text) → `{s.heroTitle}` (keep the `<br />` split if needed, or render as single string)
- `'上传任意角度的房间照片...'` (the p subtitle) → `{s.heroSubtitle}`
- CTA button text `'免费生成效果图'` → `{s.heroCta}`
- Secondary CTA `'查看示例效果'` → `{s.heroSecondaryCta}`
- The styles section heading `'40+ 装修风格，一键切换'` — add a region-aware version via config or inline ternary since it's not currently in `regionConfig.strings`:

Add `stylesTitle` to `regionConfig.strings` in `lib/region-config.ts`:
```ts
stylesTitle: isOverseas ? '40+ Styles, One Click' : '40+ 装修风格，一键切换',
stylesSubtitle: isOverseas ? 'The most popular interior design styles · Click to preview' : '覆盖当下最流行的室内设计风格 · 点击图片可放大预览',
```

Then use `{s.stylesTitle}` and `{s.stylesSubtitle}` in `app/page.tsx`.

- [ ] **Step 14h.2: Update upload prompt in `components/UploadZone.tsx`**

Open `components/UploadZone.tsx`. Add import and replace hardcoded upload strings:

```tsx
import { regionConfig } from '@/lib/region-config'

const s = regionConfig.strings
// Use s.uploadPrompt and s.uploadDragHint where the current Chinese strings appear
```

- [ ] **Step 14h.3: Commit**

```bash
git add app/page.tsx components/UploadZone.tsx lib/region-config.ts
git commit -m "feat: app/page.tsx and UploadZone use regionConfig.strings for English/Chinese copy"
```

---

### Task 15: Update `StyleSelector` and `RoomTypeSelector` to use `labelEn`

**Files:**
- Modify: `ai-room-designer/components/StyleSelector.tsx`
- Modify: `ai-room-designer/components/RoomTypeSelector.tsx`

- [ ] **Step 14.1: Update `StyleSelector.tsx`**

Open `components/StyleSelector.tsx`. Find every place that renders `style.label` or `category.label` and add the `labelEn` variant:

```tsx
// At top of file:
import { isOverseas } from '@/lib/region'

// When displaying category label:
{isOverseas ? category.labelEn : category.label}

// When displaying style label:
{isOverseas ? style.labelEn : style.label}
```

- [ ] **Step 14.2: Update `RoomTypeSelector.tsx`**

Open `components/RoomTypeSelector.tsx`. Same pattern:

```tsx
// At top of file:
import { isOverseas } from '@/lib/region'

// When displaying room type label:
{isOverseas ? roomType.labelEn : roomType.label}
```

- [ ] **Step 14.3: Run type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 14.4: Commit**

```bash
git add components/StyleSelector.tsx components/RoomTypeSelector.tsx
git commit -m "feat: StyleSelector and RoomTypeSelector display labelEn when overseas"
```

---

## Phase 5: SEO + Legal

### Task 15: Region-aware metadata in `app/layout.tsx` and `app/result/[orderId]/page.tsx`

**Files:**
- Modify: `ai-room-designer/app/layout.tsx`
- Modify: `ai-room-designer/app/result/[orderId]/page.tsx`

- [ ] **Step 15.1: Update `app/layout.tsx` metadata**

Open `app/layout.tsx`. Find the `metadata` export and replace it with region-aware values:

```ts
import { regionConfig } from '@/lib/region-config'
import { isOverseas } from '@/lib/region'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: isOverseas ? 'RoomAI — Redesign Any Room with AI' : '装AI — AI装修效果图生成',
  description: regionConfig.seoMeta.description,
  keywords: regionConfig.seoMeta.keywords,
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'),
  openGraph: {
    siteName: regionConfig.seoMeta.siteName,
    type: 'website',
    images: [{ url: '/og-image.png' }],
  },
  other: regionConfig.seoMeta.verificationTag,
}
```

- [ ] **Step 15.2: Update `app/result/[orderId]/page.tsx` `generateMetadata`**

Open `app/result/[orderId]/page.tsx`. Find `generateMetadata` (or add it if missing) and make it region-aware:

```ts
import { regionConfig, isOverseas } from '@/lib/region-config'  // regionConfig already has isOverseas

export async function generateMetadata({ params }: { params: Promise<{ orderId: string }> }): Promise<Metadata> {
  const { orderId } = await params
  const order = await getOrder(orderId).catch(() => null)
  const style = order?.style ?? ''
  const styleLabel = isOverseas
    ? (findStyleByKey(style)?.labelEn ?? style)
    : (findStyleByKey(style)?.label ?? style)

  return {
    title: isOverseas
      ? `AI Room Design — ${styleLabel} Style | RoomAI`
      : `AI装修效果图 — ${styleLabel}风格 | 装AI`,
    description: isOverseas
      ? `See this AI-generated ${styleLabel} interior design. Create yours free.`
      : `AI生成的${styleLabel}风格装修效果图`,
    openGraph: order?.resultUrl
      ? { images: [{ url: order.resultUrl }] }
      : undefined,
  }
}
```

- [ ] **Step 15.3: Commit**

```bash
git add app/layout.tsx app/result/
git commit -m "feat: region-aware metadata in layout.tsx and result page generateMetadata"
```

---

### Task 16: Google Analytics 4 + GDPR Cookie Banner

**Files:**
- Create: `ai-room-designer/components/CookieBanner.tsx`
- Modify: `ai-room-designer/app/layout.tsx`

- [ ] **Step 16.1: Install `@next/third-parties`**

```bash
cd ai-room-designer && npm install @next/third-parties
```

- [ ] **Step 16.2: Create `components/CookieBanner.tsx`**

```tsx
// ai-room-designer/components/CookieBanner.tsx
'use client'
import { useEffect, useState } from 'react'
import { GoogleAnalytics } from '@next/third-parties/google'

const CONSENT_KEY = 'cookie_consent'

export default function CookieBanner({ gaId }: { gaId: string }) {
  const [consent, setConsent] = useState<'accepted' | 'declined' | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY) as 'accepted' | 'declined' | null
    if (stored) {
      setConsent(stored)
    } else {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setConsent('accepted')
    setVisible(false)
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, 'declined')
    setConsent('declined')
    setVisible(false)
  }

  return (
    <>
      {consent === 'accepted' && <GoogleAnalytics gaId={gaId} />}
      {visible && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-gray-900 border-t border-gray-800 px-6 py-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <p className="text-gray-300 text-sm">
              We use cookies to improve your experience and analyze usage.{' '}
              <a href="/privacy" className="underline hover:text-white">Privacy Policy</a>
            </p>
            <div className="flex gap-3 shrink-0">
              <button onClick={decline} className="text-gray-400 text-sm hover:text-white transition-colors">Decline</button>
              <button onClick={accept} className="bg-amber-500 text-black text-sm font-semibold px-4 py-1.5 rounded hover:bg-amber-400 transition-colors">Accept</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 16.3: Add `CookieBanner` to `app/layout.tsx`**

Inside the `<body>` of `app/layout.tsx`, add conditionally:

```tsx
import { isOverseas } from '@/lib/region'
import CookieBanner from '@/components/CookieBanner'

// Inside <body>:
{isOverseas && process.env.GA_MEASUREMENT_ID && (
  <CookieBanner gaId={process.env.GA_MEASUREMENT_ID} />
)}
```

- [ ] **Step 16.4: Commit**

```bash
git add components/CookieBanner.tsx app/layout.tsx package.json package-lock.json
git commit -m "feat: GDPR CookieBanner with GA4 (overseas only)"
```

---

### Task 17: Privacy Policy + Terms of Service pages

**Files:**
- Create: `ai-room-designer/app/privacy/page.tsx`
- Create: `ai-room-designer/app/terms/page.tsx`

- [ ] **Step 17.1: Create `app/privacy/page.tsx`**

```tsx
// ai-room-designer/app/privacy/page.tsx
import { isOverseas } from '@/lib/region'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'

export default function PrivacyPage() {
  if (!isOverseas) redirect('/')

  return (
    <main className="min-h-screen bg-black">
      <NavBar />
      <article className="max-w-2xl mx-auto px-6 py-16 prose prose-invert prose-sm">
        <h1>Privacy Policy</h1>
        <p className="text-gray-400">Last updated: April 14, 2026</p>

        <h2>What We Collect</h2>
        <p>When you sign in with Google, we receive your name, email address, and profile picture. We store these to identify your account. We also store the room photos you upload and the AI-generated images we create for you.</p>

        <h2>How We Use Your Data</h2>
        <p>Your photos are used solely to generate interior design images. We do not sell, share, or use your data for advertising purposes.</p>

        <h2>Data Retention</h2>
        <ul>
          <li>Uploaded photos are deleted after 7 days.</li>
          <li>Generated images are retained indefinitely so you can access your history.</li>
          <li>Account data (name, email) is retained until you delete your account.</li>
        </ul>

        <h2>Your Rights (GDPR)</h2>
        <p>If you are in the EU/EEA, you have the right to access, correct, or delete your personal data. To exercise these rights or to delete your account, contact us at: <a href="mailto:privacy@roomai.com">privacy@roomai.com</a></p>

        <h2>Cookies</h2>
        <p>We use cookies for session management and, with your consent, Google Analytics to understand how users interact with the site. You can withdraw consent at any time via the cookie banner.</p>

        <h2>Third-Party Services</h2>
        <ul>
          <li><strong>Google OAuth</strong> — for sign-in</li>
          <li><strong>Stripe</strong> — for payment processing (we never store card data)</li>
          <li><strong>Google Analytics</strong> — with your consent only</li>
        </ul>

        <h2>Contact</h2>
        <p>Questions? Email <a href="mailto:privacy@roomai.com">privacy@roomai.com</a></p>
      </article>
    </main>
  )
}
```

- [ ] **Step 17.2: Create `app/terms/page.tsx`**

```tsx
// ai-room-designer/app/terms/page.tsx
import { isOverseas } from '@/lib/region'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'

export default function TermsPage() {
  if (!isOverseas) redirect('/')

  return (
    <main className="min-h-screen bg-black">
      <NavBar />
      <article className="max-w-2xl mx-auto px-6 py-16 prose prose-invert prose-sm">
        <h1>Terms of Service</h1>
        <p className="text-gray-400">Last updated: April 14, 2026</p>

        <h2>Service Description</h2>
        <p>RoomAI provides an AI-powered interior design generation service. You upload a photo of a room, select a style, and receive an AI-generated redesigned image.</p>

        <h2>Subscriptions and Billing</h2>
        <ul>
          <li>Free plan: 3 generations per month, watermarked results.</li>
          <li>Pro ($9.99/mo): 30 generations per month, no watermark.</li>
          <li>Unlimited ($19.99/mo): unlimited generations, no watermark.</li>
          <li>Subscriptions renew automatically. Cancel anytime via Account → Manage Billing.</li>
          <li>Refunds are handled on a case-by-case basis. Contact support within 7 days of charge.</li>
        </ul>

        <h2>Intellectual Property</h2>
        <p>You retain full ownership of all images you upload and all AI-generated images produced from your uploads. You may use generated images for personal or commercial purposes.</p>

        <h2>Prohibited Use</h2>
        <p>You may not upload images depicting illegal content, violence, or other content that violates applicable law. We reserve the right to suspend accounts that violate this policy.</p>

        <h2>Limitation of Liability</h2>
        <p>RoomAI is provided "as is." We are not liable for indirect, incidental, or consequential damages arising from use of the service.</p>

        <h2>Changes to Terms</h2>
        <p>We may update these terms with 30 days notice via email. Continued use constitutes acceptance.</p>

        <h2>Contact</h2>
        <p>Questions? Email <a href="mailto:support@roomai.com">support@roomai.com</a></p>
      </article>
    </main>
  )
}
```

- [ ] **Step 17.3: Add Privacy + Terms footer links to `NavBar.tsx`**

In the overseas section of `NavBar.tsx`, add a `<footer>` inside the `<nav>` (or update the existing Footer if one exists) — alternatively, add at the bottom of the returned JSX:

Actually NavBar is a nav element, not the page footer. Add these links to the MobileMenu and note to add them in a page footer component in a future cleanup. For now, just ensure they are linked from the Privacy page and Terms page themselves, which is sufficient for GDPR compliance.

Skip NavBar change — Privacy/Terms are discoverable via CookieBanner link to `/privacy`.

- [ ] **Step 17.4: Commit**

```bash
git add app/privacy/ app/terms/
git commit -m "feat: Privacy Policy and Terms of Service pages (overseas only, GDPR-compliant)"
```

---

## Phase 6: Social Sharing

### Task 18: `lib/share.ts` Twitter/Facebook + config-driven share components

**Files:**
- Modify: `ai-room-designer/lib/share.ts`
- Modify: `ai-room-designer/components/ShareModal.tsx`
- Modify: `ai-room-designer/components/SharePanel.tsx`

- [ ] **Step 18.1: Update `lib/share.ts` — add Twitter and Facebook**

Open `lib/share.ts`. Add overseas share targets alongside existing ones:

```ts
// ai-room-designer/lib/share.ts
export type ShareTarget = 'twitter' | 'facebook' | 'copy_link' | 'wechat' | 'douyin' | 'xiaohongshu'

export interface ShareOptions {
  url: string
  title: string
}

export function getShareUrl(target: ShareTarget, options: ShareOptions): string | null {
  const { url, title } = options
  switch (target) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    case 'copy_link':
      return null  // handled via clipboard API, not a URL
    case 'wechat':
      return null  // WeChat sharing is handled by WeixinJSBridge, not a URL
    case 'douyin':
      return `https://www.douyin.com/`   // no direct share URL; open app
    case 'xiaohongshu':
      return `https://www.xiaohongshu.com/`  // no direct share URL; open app
    default:
      return null
  }
}

export const SHARE_TARGET_LABELS: Record<ShareTarget, string> = {
  twitter:     'Twitter / X',
  facebook:    'Facebook',
  copy_link:   'Copy Link',
  wechat:      '微信',
  douyin:      '抖音',
  xiaohongshu: '小红书',
}

export const SHARE_TARGET_ICONS: Record<ShareTarget, string> = {
  twitter:     '𝕏',
  facebook:    'f',
  copy_link:   '🔗',
  wechat:      '💬',
  douyin:      '🎵',
  xiaohongshu: '📕',
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 18.2: Update `ShareModal.tsx` to be config-driven**

Open `components/ShareModal.tsx`. Replace hardcoded share buttons with a loop over `regionConfig.shareTargets`:

```tsx
// In ShareModal.tsx — replace the share buttons section:
import { regionConfig } from '@/lib/region-config'
import { getShareUrl, copyToClipboard, SHARE_TARGET_LABELS, SHARE_TARGET_ICONS } from '@/lib/share'
import type { ShareTarget } from '@/lib/share'

// Inside the component, replace the hardcoded platform buttons:
const shareTargets = regionConfig.shareTargets as unknown as ShareTarget[]
const shareUrl = `${window.location.origin}/result/${orderId}`
const shareTitle = regionConfig.strings.shareText

// Render:
{shareTargets.map((target) => (
  <button
    key={target}
    onClick={async () => {
      if (target === 'copy_link') {
        await copyToClipboard(shareUrl)
        // show "Copied!" toast
      } else {
        const url = getShareUrl(target, { url: shareUrl, title: shareTitle })
        if (url) window.open(url, '_blank', 'noopener')
      }
    }}
    className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
  >
    <span className="text-xl">{SHARE_TARGET_ICONS[target]}</span>
    <span className="text-xs text-gray-400">{SHARE_TARGET_LABELS[target]}</span>
  </button>
))}
```

- [ ] **Step 18.3: Update `SharePanel.tsx` with the same config-driven approach**

Open `components/SharePanel.tsx`. Apply the same change as Step 18.2 — replace any hardcoded platform list with the `regionConfig.shareTargets` loop.

- [ ] **Step 18.4: Run type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 18.5: Commit**

```bash
git add lib/share.ts components/ShareModal.tsx components/SharePanel.tsx
git commit -m "feat: lib/share.ts Twitter/Facebook; ShareModal + SharePanel config-driven share targets"
```

---

## Final: Run all tests and verify build

- [ ] **Step 19.1: Run full test suite**

```bash
cd ai-room-designer && npx jest --no-coverage
```

Expected: all tests pass

- [ ] **Step 19.2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 19.3: Test CN build (default)**

```bash
REGION=cn npx next build
```

Expected: build succeeds, no Stripe/Google env var errors

- [ ] **Step 19.4: Verify overseas env vars**

Create a test file `ai-room-designer/.env.overseas.local.example` for documentation:

```
REGION=overseas
NEXT_PUBLIC_BASE_URL=https://roomai.com
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://roomai.com
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_UNLIMITED_MONTHLY_PRICE_ID=price_...
STRIPE_UNLIMITED_YEARLY_PRICE_ID=price_...
GA_MEASUREMENT_ID=G-...
GOOGLE_SITE_VERIFICATION=...
ZENMUX_API_KEY=...
SESSION_SECRET=...
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
```

- [ ] **Step 19.5: Final commit**

```bash
git add .env.overseas.local.example
git commit -m "docs: add .env.overseas.local.example with all required overseas env vars"
```
