# Overseas Expansion Design
**Date:** 2026-04-14  
**Project:** ai-room-designer  
**Scope:** Full overseas deployment capability — payment, auth, UI, SEO, legal, sharing — switchable via `REGION` env var

---

## Overview

Enable the app to run in two modes from the same codebase:

- `REGION=cn` — existing behavior (Alipay, WeChat/SMS auth, Chinese UI, pay-per-unlock)
- `REGION=overseas` — new overseas mode (Stripe subscriptions, Google OAuth, English UI, GDPR-compliant)

Two separate deployments, each with its own `.env`. No runtime branching by URL — the region is baked in at deploy time.

**Competitive target:** RoomGPT / Interior AI — zero-friction tool, Google login, subscription monetization.

---

## Architecture: Region Config Pattern

All region-specific values live in one file. Components and API routes consume config; they never check `isOverseas` directly except in `lib/region-config.ts` itself.

**`lib/region.ts`**
```ts
export const REGION = (process.env.REGION ?? 'cn') as 'cn' | 'overseas'
export const isOverseas = REGION === 'overseas'
```

**`lib/region-config.ts`** — typed config object, groups:
- `currency`, `currencySymbol`
- `authMethod: 'google' | 'wechat_sms'`
- `paymentMethod: 'stripe' | 'alipay'`
- `monetization: 'subscription' | 'pay_per_unlock'`
- `shareTargets: string[]`
- `strings: Record<string, string>` — all UI copy
- `seoMeta` — title templates, keywords, verification tags

---

## Phase 1: Region Foundation

### Files

**`lib/region.ts`** (new)
- Exports `REGION`, `isOverseas`, `isCN`

**`lib/region-config.ts`** (new)
- Single source of truth for all region-specific values
- Groups: currency, auth, payment, monetization, shareTargets, strings, seoMeta

**`lib/env.ts`** (modify)
- Add overseas env var validation group:
  - Required when `REGION=overseas`: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Optional for both: `GOOGLE_SITE_VERIFICATION`, `GA_MEASUREMENT_ID`

**`lib/errors.ts`** (new)
- Centralized error message strings, region-aware
- All API routes import error strings from here instead of inlining

### DB Migrations (non-destructive ALTER TABLE)

```sql
-- users table extensions
ALTER TABLE users ADD COLUMN google_id     TEXT UNIQUE;
ALTER TABLE users ADD COLUMN google_email  TEXT;
ALTER TABLE users ADD COLUMN google_avatar TEXT;

-- new subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   TEXT PRIMARY KEY,
  userId               TEXT NOT NULL,
  stripeCustomerId     TEXT,
  stripeSubscriptionId TEXT,
  plan                 TEXT NOT NULL,    -- 'free' | 'pro' | 'unlimited'
  status               TEXT NOT NULL,    -- 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodEnd     INTEGER,
  generationsUsed      INTEGER NOT NULL DEFAULT 0,
  createdAt            INTEGER NOT NULL
);
```

---

## Phase 2: Authentication (Google OAuth)

Active when `regionConfig.authMethod === 'google'`. CN auth paths are untouched.

### Library

NextAuth.js v5 (Auth.js) — Next.js App Router native, Google Provider.

### Files

**`app/api/auth/[...nextauth]/route.ts`** (new)
- Configure Google Provider
- `signIn` callback: call `findOrCreateGoogleUser({ googleId, email, name, avatar })` in `lib/auth.ts`
- Returns a session with `{ userId }` matching existing session shape

**`lib/auth.ts`** (modify)
- Add `findOrCreateGoogleUser(params)` — same pattern as existing `findOrCreateWechatUser`
- Add `getServerSession(req)` — unified function returning `{ userId } | null`:
  - `isOverseas` → reads NextAuth session cookie
  - `isCN` → reads existing HMAC-signed cookie
- All API routes call `getServerSession(req)` — no region-awareness needed at call site

**`components/NavBar.tsx`** (modify)
- Login button section: conditionally renders `<GoogleSignInButton>` (overseas) or existing phone modal trigger (CN)

**`components/GoogleSignInButton.tsx`** (new)
- Calls NextAuth `signIn('google')`
- Shows user avatar + name when signed in, sign-out option

### Out of scope
- Email/password auth (Google-only for overseas MVP)
- Account merging (Google ↔ phone)

---

## Phase 3: Subscription + Stripe

Active when `regionConfig.paymentMethod === 'stripe'`. Alipay paths are untouched.

### Pricing

| Plan | Price | Generations/month | Watermark |
|------|-------|-------------------|-----------|
| Free | $0 | 3 | Yes |
| Pro | $9.99/mo | 30 | No |
| Unlimited | $19.99/mo | Unlimited | No |

Annual plans: 20% discount (Pro $95.90/yr, Unlimited $191.90/yr).

### New Library

**`lib/subscription.ts`** (new)
```ts
export async function getSubscription(userId: string): Promise<{
  plan: 'free' | 'pro' | 'unlimited'
  generationsUsed: number    // used this billing period
  generationsLimit: number   // -1 = unlimited
  generationsLeft: number    // convenience: limit === -1 ? Infinity : limit - used
  hasWatermark: boolean
  status: string
}>
```
- Queries `subscriptions` table, falls back to free tier if no record
- `generationsUsed` is stored on the `subscriptions` row and reset to 0 on `customer.subscription.updated` event when `current_period_start` advances (Stripe sends this at each billing cycle renewal)

### New API Routes

**`app/api/stripe/create-checkout/route.ts`**
- Input: `{ plan: 'pro' | 'unlimited', interval: 'month' | 'year' }`
- Creates Stripe Checkout Session with `mode: 'subscription'`
- `success_url` → `/account?upgraded=1`, `cancel_url` → `/pricing`
- Attaches `userId` as metadata

**`app/api/stripe/webhook/route.ts`**
- Verifies Stripe signature (`STRIPE_WEBHOOK_SECRET`)
- Handles: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Writes/updates `subscriptions` table on each event

**`app/api/stripe/portal/route.ts`**
- Creates Stripe Customer Portal session
- Redirects user to Stripe-hosted subscription management

### Modified API Routes

**`app/api/create-order/route.ts`** (modify, overseas path only)
- When `isOverseas`:
  - Call `getSubscription(userId)` — require authenticated user
  - If `generationsLeft === 0` → return `{ error: 'upgrade_required', upgradeUrl: '/pricing' }` with 402
  - Skip Alipay QR code generation entirely
  - `isFree` set based on subscription plan (`free` plan → watermarked)
  - Decrement generation counter after order created

### New Pages

**`app/pricing/page.tsx`** (new)
- Three-column pricing cards (Free / Pro / Unlimited)
- Monthly / Annual toggle
- CTA calls `/api/stripe/create-checkout`
- Shown in NavBar when `isOverseas`

**`app/account/page.tsx`** (new)
- Current plan badge, generations used this month
- "Manage Billing" → `/api/stripe/portal`
- "Upgrade" → `/pricing`
- Shown in NavBar when signed in + `isOverseas`

---

## Phase 4: UI Copy + Language

No i18n library. All strings live in `regionConfig.strings`. Components import config, not string literals.

### `regionConfig.strings` Keys

```
heroTitle, heroSubtitle, heroCta, heroSecondaryCta
uploadPrompt, uploadDragHint
generating, generatingSubtitle
downloadBtn, shareBtn, regenerateBtn
navGenerate, navHistory, navPricing, navAccount, navSignIn, navSignOut
styleSelectTitle, roomTypeSelectTitle
resultTitle, resultWatermarkNotice
upgradePrompt
```

### Style Name Mapping

`lib/design-config.ts` — add `labelEn` to each style entry alongside existing `label` (Chinese):
```ts
{ key: 'nordic', label: '北欧简约', labelEn: 'Scandinavian' }
```

`components/StyleSelector.tsx` — display `isOverseas ? style.labelEn : style.label`.

### Room Type Name Mapping

Same pattern as styles — add `labelEn` to each room type entry in `design-config.ts`.

### API Error Messages

All API routes import from `lib/errors.ts` instead of inlining strings:
```ts
// lib/errors.ts
export const ERR = {
  rateLimited:   isOverseas ? 'Too many requests, please slow down.' : '请求过于频繁，请稍后再试',
  uploadMissing: isOverseas ? 'Please upload a photo first.' : '请先上传图片',
  // ...
}
```

---

## Phase 5: SEO + Legal Compliance

### SEO

**`app/layout.tsx`** (modify)
- `keywords`: region-aware from `regionConfig.seoMeta.keywords`
- `other` verification tag: `google-site-verification` (overseas) or `baidu-site-verification` (CN)
- `metadataBase`: set to `NEXT_PUBLIC_BASE_URL`

**`app/result/[orderId]/page.tsx`** (modify)
- `generateMetadata()` title/description: region-aware strings from config
  - Overseas: `"AI Room Design - {style} Style | RoomAI"`
  - CN: `"AI装修效果图 - {style}风格 | 装AI"`

### Google Analytics 4

- Install `@next/third-parties`
- Add `<GoogleAnalytics gaId={process.env.GA_MEASUREMENT_ID} />` to `app/layout.tsx`
- Only rendered when `isOverseas && process.env.GA_MEASUREMENT_ID`
- Gated behind cookie consent (see below)

### GDPR Cookie Consent

**`components/CookieBanner.tsx`** (new)
- Bottom-of-screen banner on first visit (overseas only)
- "Accept" stores consent in `localStorage`, loads GA
- "Decline" skips GA entirely
- Simple, no external library

### Legal Pages

**`app/privacy/page.tsx`** (new)
- Data collected: Google profile (name, email, avatar), uploaded photos, generated images
- Retention: uploaded photos deleted after 7 days, generated images retained
- User rights: account deletion via `/account`, data export on request
- GDPR contact email placeholder
- Rendered only when `isOverseas` (404 redirect for CN)

**`app/terms/page.tsx`** (new)
- Service description, subscription billing terms
- Generated content IP: user owns all generated images
- Prohibited content policy
- Rendered only when `isOverseas`

**`components/NavBar.tsx`** (modify)
- Footer links: Privacy / Terms shown when `isOverseas`

---

## Phase 6: Social Sharing

### `lib/share.ts` (extend existing)

Add overseas platform handlers:
```ts
twitter:  (url, title) => `https://twitter.com/intent/tweet?text=...&url=...`
facebook: (url) => `https://www.facebook.com/sharer/sharer.php?u=...`
```

CN platforms (wechat, douyin, xiaohongshu) remain unchanged.

### Share Components

`components/ShareModal.tsx` + `components/SharePanel.tsx` (modify):
- Button list driven by `regionConfig.shareTargets` array
- Share copy text from `regionConfig.strings.shareText`
- No platform is hardcoded in JSX

---

## Implementation Order

Dependencies flow top to bottom. Each phase is independently shippable.

1. **Phase 1** — `lib/region.ts`, `lib/region-config.ts` (skeleton, fill incrementally), `lib/env.ts` update, `lib/errors.ts`, DB migrations
2. **Phase 2** — NextAuth install, Google Provider, `getServerSession` unified wrapper, NavBar login switch
3. **Phase 3** — `lib/subscription.ts`, Stripe API routes, `create-order` overseas path, Pricing page, Account page
4. **Phase 4** — `regionConfig.strings` fill out, style/room `labelEn`, component copy switches, API error strings
5. **Phase 5** — GA4, CookieBanner, Privacy page, Terms page, metadata updates
6. **Phase 6** — `lib/share.ts` Twitter/Facebook, ShareModal/SharePanel config-driven

---

## New Environment Variables

### `REGION=overseas` deployment

```
REGION=overseas
NEXT_PUBLIC_BASE_URL=https://roomai.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Analytics
GA_MEASUREMENT_ID=G-...
GOOGLE_SITE_VERIFICATION=...

# Shared
ZENMUX_API_KEY=...
SESSION_SECRET=...
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
```

### `REGION=cn` deployment (existing, no changes)

All existing env vars unchanged.

---

## Out of Scope

- Email/password auth (Google-only for overseas MVP)
- Multi-language UI (English-only for overseas, Chinese-only for CN — no locale routing)
- Account merging between Google and phone accounts
- Team/agency plans
- Referral program overseas
- In-app subscription management (Stripe Portal handles this)
- WeChat Pay overseas (separate spec if needed)
