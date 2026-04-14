# Generation UX + SEO + Sharing Spec
**Date:** 2026-04-14  
**Project:** ai-room-designer  
**Scope:** Three independent feature groups to complete before first deploy

---

## 1. Generation Waiting UX

### Problem
Current waiting experience on `/result/[orderId]` is a spinner with static text "大约需要 20-30 秒". If the user navigates away, `PollingRefresh` unmounts and polling stops — the user has no way to get notified when their image is ready.

### Feature: Fake Progress Bar

Replace the spinner on the result page waiting state with an animated progress bar.

**Progress schedule (elapsed time → displayed %)**

| Elapsed | Progress | Label |
|---------|----------|-------|
| 0s | 0% | 付款完成 ✅ |
| 0–20s | 0 → 75% | AI 分析房间中... |
| 20–done | 75 → 95% | 渲染效果图中... |
| done | 100% | ✅ 完成！ |

- Implemented in a new `components/ProgressBar.tsx` — accepts `isComplete: boolean`
- Uses `useEffect` + `setInterval` (1s tick, +3.5% per tick up to 75%, then +0.3%/tick after)
- On `isComplete=true`, immediately sets to 100% and cancels the interval
- Step indicators below the bar: 三个阶段 label，当前阶段 pulse 动画

**"可以离开" 提示**

Below the progress bar, always visible:

> 你也可以去其他页面，完成后在 [历史记录 →](/history) 查看

### Feature: Persist Order to localStorage Before Completion

**Current behavior:** `saveToHistory` is called only after `status=done`.  
**New behavior:** Save to localStorage as soon as the order is created (in `PaymentModal` after payment detected, or after free-tier order creation), with `status: 'generating'`. Update to `status: 'done'` when result arrives.

This ensures the order appears in History even if the user closes the tab during generation.

**Change:** `lib/history.ts` — add `updateHistoryItemStatus(orderId, status, resultUrl?)` function.  
**Change:** `components/PaymentModal.tsx` — call `saveToHistory(...)` with `status: 'generating'` immediately after triggering `/api/generate`.  
**Change:** `components/PollingRefresh.tsx` — call `updateHistoryItemStatus(orderId, 'done', resultUrl)` when polling detects completion.

### Feature: History Page Auto-Refresh for Pending Orders

**Current behavior:** History page fetches order statuses once on mount.  
**New behavior:** If any order has `status: 'generating'`, set a `setInterval` every 30 seconds to re-check those orders via `/api/query-order`. Clear the interval when all are done.

### Feature: Completion Notification

When polling detects `status=done`:

1. **Toast (in-site):** `sonner` toast appears on any page the user is on — "✅ 你的效果图已生成！点击查看" — links to `/result/{orderId}`
2. **Tab title:** `document.title` set to `"✅ 效果图已生成 - 装AI"` so the browser tab flashes if unfocused

Toast is triggered from two places (mutually exclusive to avoid double-toast):
- `PollingRefresh.tsx` — only shows toast if `document.visibilityState === 'hidden'` (user has switched tabs); if visible, the result page itself handles the ShareModal
- `app/history/page.tsx` — shows toast when auto-refresh detects a generating order flipped to done (user navigated to history instead of staying on result page)

**Library:** `sonner` (install as dependency). Add `<Toaster position="top-center" />` to `app/layout.tsx`.

---

## 2. SEO Optimization

### Files

**`app/robots.ts`** (new — Next.js App Router built-in)
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Sitemap: {NEXT_PUBLIC_BASE_URL}/sitemap.xml
```
(`NEXT_PUBLIC_BASE_URL` already exists in env, e.g. `https://zhuang.ai`)

**`app/sitemap.ts`** (new — dynamic)
- Static entries: `/` and `/generate`
- Dynamic entries: recent 100 `done` orders from DB, with `lastModified: order.updatedAt`
- URLs format: `/result/{orderId}`

**`app/layout.tsx`** — expand root `metadata`:
- `openGraph.images`: static OG image (use existing `/og-image.png` or first style thumbnail)
- `openGraph.type: 'website'`
- `keywords`: `AI装修效果图, 室内设计AI, 装修效果图免费生成`
- `other['baidu-site-verification']`: placeholder for future Baidu Search Console

**`app/result/[orderId]/page.tsx`** — add `generateMetadata()`:
- Title: `"AI装修效果图 - {style}风格 | 装AI"`
- `openGraph.images`: `[{ url: order.resultUrl }]` — the actual result image as preview
- Description: `"用AI生成的{style}风格装修效果图"`

---

## 3. Post-Generation Share Modal

### Trigger
When `PollingRefresh` detects `status=done`, after navigating to the done state, wait 1.5 seconds then show the share modal.

### Component: `components/ShareModal.tsx` (new)

A bottom sheet that slides up:

```
╔══════════════════════════════════╗
║  ✨ 效果图已生成！               ║
║  [缩略图 — 结果图]               ║
║                                  ║
║  分享给好友，每带来 1 位新访客   ║
║  你就多 1 次免费机会（最多10次） ║
║                                  ║
║  [微信] [抖音] [小红书] [链接]   ║
║                                  ║
║      [跳过，直接下载]            ║
╚══════════════════════════════════╝
```

**Sharing buttons:** Reuse logic from existing `components/SharePanel.tsx` — extract share action functions into a shared utility `lib/share.ts` to avoid duplication.

**Dismiss behavior:**
- Close button (×) or "跳过" dismisses
- Persisted via `sessionStorage` key `share_modal_shown_{orderId}` — only shows once per session per order
- Does NOT block download

**Integration:**
- `app/result/[orderId]/page.tsx` — add `showShareModal` state; set to `true` 1.5s after the page first renders with `order.status === 'done'` (use `useRef<boolean>` to fire only once, guard against re-render loops)
- `PollingRefresh.tsx` calls `router.refresh()` on completion; the result page re-renders with `status=done` and the 1.5s timer fires from there — PollingRefresh does NOT trigger the modal directly

---

## Implementation Order

1. Install `sonner`
2. `components/ProgressBar.tsx` — new component
3. `lib/history.ts` — add `updateHistoryItemStatus`
4. `components/PollingRefresh.tsx` — toast + title + updateHistory on complete
5. `components/PaymentModal.tsx` — early saveToHistory
6. `app/result/[orderId]/page.tsx` — swap spinner → ProgressBar, add ShareModal trigger
7. `app/history/page.tsx` — auto-refresh interval
8. `app/layout.tsx` — add Toaster
9. `components/ShareModal.tsx` — new component
10. `lib/share.ts` — extract share utils from SharePanel
11. `app/robots.ts` — new
12. `app/sitemap.ts` — new
13. `app/layout.tsx` — expand metadata
14. `app/result/[orderId]/page.tsx` — add generateMetadata

---

## Out of Scope

- Browser Push Notifications (requires service worker + permission UX, too heavy for MVP)
- Email notification when done
- Subscription system (separate spec)
- WeChat Pay (separate spec)
