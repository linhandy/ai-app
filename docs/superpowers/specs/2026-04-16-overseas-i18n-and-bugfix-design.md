# Overseas Version i18n + Bug Fix Design

## Goal

Fix the overseas (English) version of AI Room Designer so it shows fully English UI, works correctly end-to-end (upload → generate → result), and is competitive with interiorai.com.

## Architecture

Inline `isOverseas` conditionals + expand `region-config.ts` strings. All English copy centralised in `lib/region-config.ts`. Structural sections (pricing, FAQ) swapped at the component level with `isOverseas ? <EnglishVersion> : <ChineseVersion>`. Follows the exact pattern already used in NavBar and other components.

## Tech Stack

Next.js 14 App Router, TypeScript, Tailwind CSS, Turso (libsql), Supabase Storage, Stripe (overseas payments), NextAuth (overseas auth).

---

## Bug 1 — Upload fails silently on Vercel serverless

**File:** `app/api/create-order/route.ts` lines 62–65

**Root cause:** The overseas path checks `fs.existsSync(uploadPath)` to verify an upload exists before creating an order. On Vercel serverless, each function invocation has an isolated ephemeral filesystem. The upload API saves images to the database (via `saveUploadData`), but create-order checks disk — different invocation, file not found → 400 error.

**Fix:** Replace `fs.existsSync` check in the overseas path with a DB check via `getUploadData(uploadId)`. If `null` is returned, respond 400. Remove `fs` and `path` imports from the overseas code path (they remain for the CN path).

```ts
// overseas path — replace lines 62-65:
if (modeConfig.needsUpload && uploadId) {
  const uploadData = await getUploadData(uploadId)
  if (!uploadData) return NextResponse.json({ error: ERR.fileNotFound }, { status: 400 })
}
```

---

## Bug 2 — Generate page overseas flow broken (Alipay modal shown)

**File:** `app/generate/page.tsx` `handlePay` function

**Root cause:** After `create-order` succeeds for an overseas subscription user, it returns `{ orderId }` only — no `qrDataUrl`, `devSkip`, or `creditUsed`. The function falls through to `setPayModal({ orderId, qrDataUrl: undefined, amount })`, opening a blank Alipay QR modal.

**Fix:** Import `isOverseas` and add an overseas branch in `handlePay` immediately after checking `devSkip` and `creditUsed`:

```ts
if (isOverseas) {
  setGenerating(true)
  const genRes = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: data.orderId }),
  })
  const genData = await genRes.json()
  if (!genRes.ok) throw new Error(genData.error || s.errorGenFailed)
  router.push(`/result/${data.orderId}`)
  return
}
```

---

## Section 1 — `lib/region-config.ts` new strings

Add the following to the `strings` object (overseas values only shown; CN fallbacks are Chinese equivalents):

```ts
// Hero before/after labels
beforeLabel:          isOverseas ? 'Before'                                       : '改造前',
afterLabel:           isOverseas ? 'AI Result'                                    : 'AI效果图',
beforeCaption:        isOverseas ? 'Plain unfurnished living room'                : '普通未装修的客厅',
afterCaption:         isOverseas ? 'Transformed with Nordic Minimal AI'           : 'AI 改造成北欧简约风',
// Pricing
pricingTitle:         isOverseas ? 'Simple, transparent pricing'                  : '选择适合你的方案',
pricingSubtitle:      isOverseas ? 'Generate free. Pay only when you love it.'   : '免费生成带水印预览 · 满意后付费下载无水印版',
// FAQ
faqTitle:             isOverseas ? 'Frequently Asked Questions'                   : '常见问题',
// Footer
footer:               isOverseas ? '© 2026 RoomAI · Powered by ZenMux AI'        : '© 2026 装AI · 由 ZenMux AI 驱动',
// Generate page nav
generateNavHint:      isOverseas ? 'Upload photo → Pick style → Generate'        : '上传照片 → 选择风格 → 生成',
generateNavHintFree:  isOverseas ? 'Pick style → Describe → Generate'            : '选择风格 → 描述需求 → 生成',
// Generate page sections
uploadTitle:          isOverseas ? 'Upload your room photo'                       : '上传房间照片',
uploadSubtitle:       isOverseas ? 'JPG / PNG / WEBP · Front-facing angle works best' : '支持 JPG / PNG，建议正面拍摄',
uploadSubtitleSketch: isOverseas ? 'Upload a hand-drawn sketch to convert to photorealistic render' : '上传手绘草图，AI转换为写实效果图',
freeGenTitle:         isOverseas ? 'Free generation mode'                         : '自由生成模式',
freeGenSubtitle:      isOverseas ? 'No photo needed — AI generates from scratch' : '无需照片，AI根据风格从零生成效果图',
designModeTitle:      isOverseas ? 'Design Mode'                                  : '设计模式',
roomTypeTitle:        isOverseas ? 'Room Type'                                    : '房间类型',
styleTitle:           isOverseas ? 'Interior Style'                               : '装修风格',
noStyleNeeded:        isOverseas ? 'No style selection needed for this mode'      : '此模式无需选择风格',
qualityTitle:         isOverseas ? 'Quality'                                      : '画质选择',
customPromptLabel:    isOverseas ? '+ Add description (optional)'                 : '+ 补充描述（可选）',
customPromptPlaceholder: isOverseas ? 'e.g. linen curtains, warm tones throughout...' : '例如：窗帘用亚麻材质，整体偏暖色调...',
// CTA
ctaDisclaimer:        isOverseas ? 'AI generation uses compute · No refunds after starting' : 'AI生成消耗计算资源，付款后不支持退款',
ctaGenerating:        isOverseas ? '⏳ Generating your design...'                 : 'AI生成中，请稍候...',
ctaGeneratingMobile:  isOverseas ? '⏳ Generating...'                             : '⏳ AI生成中...',
ctaProcessing:        isOverseas ? 'Processing...'                                : '处理中...',
ctaButton:            isOverseas ? '⚡ Generate Now'                              : '',   // CN uses dynamic price string
// Upload component
uploadBrowse:         isOverseas ? 'Browse Files'                                 : '选择文件',
uploading:            isOverseas ? 'Uploading...'                                 : '上传中...',
uploadFailed:         isOverseas ? 'Upload failed'                                : '上传失败',
// Credits / subscription
creditsRemaining:     isOverseas ? 'generations left this month'                  : '次免费体验',
creditsBalance:       isOverseas ? 'Credits remaining:'                           : '剩余额度:',
// Errors
errorUploadFirst:     isOverseas ? 'Please upload a room photo first'             : '请先上传房间照片',
errorOrderFailed:     isOverseas ? 'Failed to create order'                       : '创建订单失败',
errorGenFailed:       isOverseas ? 'Generation failed, please try again'          : 'AI 生成失败，请稍后重试',
// Mobile menu
mobileMenuTitle:      isOverseas ? 'Menu'                                         : '菜单',
mobileMenuOpen:       isOverseas ? 'Open menu'                                    : '打开菜单',
mobileMenuCta:        isOverseas ? 'Get Started'                                  : '开始体验',
```

---

## Section 2 — `app/page.tsx`

### Hero before/after labels
Replace the 4 hardcoded Chinese strings with `s.beforeLabel`, `s.afterLabel`, `s.beforeCaption`, `s.afterCaption`.

### Pricing section
Wrap current CN pricing with `isOverseas ? <OverseasPricing /> : <CNPricing />`.

Overseas pricing renders `<PricingCards />` (already exists, already English). Section title/subtitle use `s.pricingTitle`, `s.pricingSubtitle`.

CN pricing keeps existing code unchanged.

### FAQ section
Wrap with `isOverseas ? <OverseasFAQ /> : <CNFAQ />`.

**Overseas FAQ items (6 Q&As):**

1. **How does the AI redesign my room?**
   Upload a photo, pick one of 40+ interior styles, and our AI analyzes the space structure — walls, windows, layout — then generates a photorealistic redesign in about 30 seconds. No design skills needed.

2. **What room types are supported?**
   Living rooms, bedrooms, kitchens, bathrooms, dining rooms, home offices, outdoor spaces, and 20+ more. The AI preserves your room's dimensions and natural light while redesigning the aesthetic.

3. **What's the difference between Free, Pro, and Unlimited?**
   Free gives 3 watermarked generations per month. Pro ($9.99/mo) gives 30 HD watermark-free designs with commercial use rights. Unlimited ($19.99/mo) removes all limits and adds priority processing.

4. **How does billing work?**
   We use Stripe for secure card payments. Cancel anytime from your account dashboard — no lock-in, no hidden fees. You get immediate access after subscribing.

5. **Can I use the designs commercially?**
   Yes. All Pro and Unlimited designs include full commercial use rights — interior design proposals, real estate listings, social media, client presentations.

6. **How long are my images saved?**
   Images are stored for 30 days. Download anything you want to keep before then.

### Footer
Replace hardcoded `© 2026 装AI · 由 ZenMux AI 驱动` with `{s.footer}`.

---

## Section 3 — `app/generate/page.tsx`

### QUALITY_OPTIONS
Add `labelEn` to each option. Render `isOverseas ? opt.labelEn : opt.label` in the quality selector. Hide the price row entirely for overseas (subscription-based — no per-generation charge shown). Show quality label + resolution only.

```ts
const QUALITY_OPTIONS = [
  { key: 'standard', label: '标准', labelEn: 'Standard', price: 1, resolution: '1024px', color: '...' },
  { key: 'premium',  label: '高清', labelEn: 'HD',       price: 3, resolution: '2048px', color: '...' },
  { key: 'ultra',    label: '超清', labelEn: '4K',       price: 5, resolution: '4096px', color: '...' },
]
```

### Nav bar (generate page has its own inline nav)
```tsx
// Logo
<div className="...">{ isOverseas ? 'R' : '装' }</div>
<span>{ isOverseas ? 'RoomAI' : '装AI' }</span>
// Hint
<span>{ currentMode.needsUpload ? s.generateNavHint : s.generateNavHintFree }</span>
```

### Section headers
Replace all hardcoded Chinese section headers with `s.xxx`:
- `上传房间照片` / `自由生成模式` → `s.uploadTitle` / `s.freeGenTitle`
- Upload subtitle → `s.uploadSubtitle` / `s.uploadSubtitleSketch` / `s.freeGenSubtitle`
- `设计模式` → `s.designModeTitle`
- Mode labels: `isOverseas ? m.labelEn : m.label`
- `房间类型` → `s.roomTypeTitle`
- `装修风格` → `s.styleTitle`
- `此模式无需选择风格` → `s.noStyleNeeded`
- `+ 补充描述（可选）` → `s.customPromptLabel`
- Textarea placeholder → `s.customPromptPlaceholder`
- `画质选择` → `s.qualityTitle`

### Desktop CTA block
```tsx
<p>{s.ctaDisclaimer}</p>
<button>
  {generating ? s.ctaGenerating : loading ? s.ctaProcessing
    : isOverseas ? s.ctaButton
    : `⚡ 支付 ¥${currentOption.price} · 立即生成${currentOption.label}效果图`}
</button>
{/* CN-only Alipay hint */}
{!isOverseas && <p>扫码支付宝付款 · 30秒内自动生成</p>}
{/* credits display */}
{freeRemaining !== null && freeRemaining > 0 && (
  <p>{freeRemaining} {s.creditsRemaining}</p>
)}
{creditBalance > 0 && (
  <p>{s.creditsBalance} {creditBalance}</p>
)}
```

### Mobile sticky bar
Same string replacements as desktop CTA. Replace `请先上传房间照片` with `s.errorUploadFirst`.

### Error messages in `handlePay`
- `'请先上传房间照片'` → `s.errorUploadFirst`
- `'创建订单失败'` → `s.errorOrderFailed`
- `'AI 生成失败，请稍后重试'` → `s.errorGenFailed`

---

## Section 4 — `components/MobileMenu.tsx`

Add `isOverseas: boolean` to Props. NavBar passes `isOverseas` (imported from `lib/region`).

Conditional strings:
- `aria-label`: `isOverseas ? 'Open menu' : '打开菜单'`
- Drawer title: `isOverseas ? 'Menu' : '菜单'`
- Nav items:
  - Styles: `isOverseas ? 'Styles' : '风格展示'` → `/#examples`
  - Pricing: `isOverseas ? 'Pricing' : '价格'` → `isOverseas ? '/pricing' : '/#pricing'`
  - FAQ: `isOverseas ? 'FAQ' : '常见问题'` → `isOverseas ? '/#faq' : '/#faq'`
  - History: `isOverseas ? 'History' : '历史记录'` → `/history`
  - Sign in: `isOverseas ? 'Sign in' : '登录/注册'` → `isOverseas ? '/api/auth/signin' : '/login'`
  - Sign out form action: `isOverseas ? '/api/auth/signout' : '/api/auth/logout'`
- CTA button: `isOverseas ? 'Get Started' : '开始体验'`

---

## Section 5 — `components/UploadZone.tsx`

Three hardcoded strings replaced with regionConfig:
1. Button `选择文件` → `{s.uploadBrowse}`
2. `'上传中...'` in uploading state → `{s.uploading}`
3. Fallback error `'上传失败'` in `catch` block → uses `s.uploadFailed` as default

Also fix `alt="预览"` → `alt=""` (decorative image, empty alt is correct).

---

## Section 6 — `components/StyleGallery.tsx`

The gallery hardcodes 6 style keys. It already imports from design-config which has `labelEn` on each style. Replace Chinese label overlays with `isOverseas ? style.labelEn : style.label`.

---

## Files changed summary

| File | Change type |
|------|------------|
| `lib/region-config.ts` | Add ~30 new English strings |
| `app/api/create-order/route.ts` | Bug fix: DB check replaces fs.existsSync (overseas path) |
| `app/generate/page.tsx` | Bug fix: overseas direct-generate flow + all text strings |
| `app/page.tsx` | Pricing section, FAQ, hero labels, footer — overseas variants |
| `components/MobileMenu.tsx` | Accept isOverseas prop, conditional strings throughout |
| `components/NavBar.tsx` | Pass isOverseas to MobileMenu |
| `components/UploadZone.tsx` | 3 hardcoded Chinese strings → region-config |
| `components/StyleGallery.tsx` | Style label overlay uses labelEn for overseas |

---

## Testing checklist

1. Upload a room photo → no error (upload + create-order both succeed)
2. Click Generate → generation triggers, redirects to `/result/:id`
3. Result page shows English strings
4. Homepage shows English hero labels, English pricing (PricingCards), English FAQ, English footer
5. Generate page shows English labels throughout
6. Mobile menu shows English nav items
7. Sign in / sign out flow works
8. CN version (local with REGION=cn) shows Chinese unchanged
