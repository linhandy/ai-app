# 分享裂变 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用户分享结果页链接，新访客通过链接进入时，分享者和访客各得 +1 次免费额度。

**Architecture:** 结果页 Server Component 根据当前 IP 生成 6 位 refCode（IP hash），传给 SharePanel 组件拼入分享 URL（`/r/<orderId>?ref=<refCode>`）。新建 `/r/[orderId]` Server Component 页面，接收访客、记录 referral_clicks 表（防重复）、奖励双方额度、重定向到 `/result/<orderId>`。

**Tech Stack:** Next.js 14 App Router · TypeScript · libsql (SQLite) · 现有 `lib/free-uses.ts` 的 `rewardFreeUse()`

**前置条件：** 免费体验层 plan 必须先执行（依赖 `lib/free-uses.ts` 的 `rewardFreeUse`）。

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `ai-room-designer/lib/referral.ts` | referral_clicks 表操作：记录点击、奖励额度、查询计数 |
| 新建 | `ai-room-designer/app/r/[orderId]/page.tsx` | Server Component：处理 refCode、奖励、重定向 |
| 修改 | `ai-room-designer/app/result/[orderId]/page.tsx` | 生成 refCode，传给 SharePanel |
| 修改 | `ai-room-designer/components/SharePanel.tsx` | 接受 `refCode` prop，拼入分享链接 |
| 新建 | `ai-room-designer/__tests__/referral.test.ts` | referral 逻辑单元测试 |

---

### Task 1: `lib/referral.ts` — 裂变逻辑

**Files:**
- Create: `ai-room-designer/lib/referral.ts`
- Create: `ai-room-designer/__tests__/referral.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `ai-room-designer/__tests__/referral.test.ts`：

```typescript
import { recordReferralClick, getReferralCount, closeDb } from '@/lib/referral'
import { getRemainingFreeUses, consumeFreeUse, closeDb as closeFreeDb } from '@/lib/free-uses'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  closeDb()
  closeFreeDb()
})

afterAll(() => {
  closeDb()
  closeFreeDb()
})

test('recordReferralClick returns true for new visitor', async () => {
  const rewarded = await recordReferralClick({
    refCode: 'abc123',
    sharerIp: '1.1.1.1',
    visitorIp: '2.2.2.2',
  })
  expect(rewarded).toBe(true)
})

test('recordReferralClick returns false for repeat visitor', async () => {
  await recordReferralClick({ refCode: 'abc123', sharerIp: '1.1.1.1', visitorIp: '2.2.2.2' })
  const rewarded = await recordReferralClick({ refCode: 'abc123', sharerIp: '1.1.1.1', visitorIp: '2.2.2.2' })
  expect(rewarded).toBe(false)
})

test('different visitor same refCode gets rewarded again', async () => {
  await recordReferralClick({ refCode: 'abc123', sharerIp: '1.1.1.1', visitorIp: '2.2.2.2' })
  const rewarded = await recordReferralClick({ refCode: 'abc123', sharerIp: '1.1.1.1', visitorIp: '3.3.3.3' })
  expect(rewarded).toBe(true)
})

test('getReferralCount returns number of unique visitors', async () => {
  await recordReferralClick({ refCode: 'xyz999', sharerIp: '5.5.5.5', visitorIp: '6.6.6.6' })
  await recordReferralClick({ refCode: 'xyz999', sharerIp: '5.5.5.5', visitorIp: '7.7.7.7' })
  expect(await getReferralCount('xyz999')).toBe(2)
})

test('sharer gets rewarded when visitor is new', async () => {
  // Consume all 3 free uses for sharer
  await consumeFreeUse('1.1.1.1')
  await consumeFreeUse('1.1.1.1')
  await consumeFreeUse('1.1.1.1')
  expect(await getRemainingFreeUses('1.1.1.1')).toBe(0)

  await recordReferralClick({ refCode: 'abc123', sharerIp: '1.1.1.1', visitorIp: '8.8.8.8' })

  // Sharer should have 1 free use back (max 3)
  expect(await getRemainingFreeUses('1.1.1.1')).toBe(1)
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd ai-room-designer && npx jest __tests__/referral.test.ts --no-coverage 2>&1 | tail -5
```

Expected: `Cannot find module '@/lib/referral'`

- [ ] **Step 3: 实现 `lib/referral.ts`**

新建 `ai-room-designer/lib/referral.ts`：

```typescript
import { createClient, Client } from '@libsql/client'
import path from 'path'
import { rewardFreeUse } from '@/lib/free-uses'

const MAX_REFERRAL_REWARDS = 10 // max bonus uses per IP via sharing

function dbUrl(): string {
  const raw = process.env.ORDERS_DB ?? path.join(process.cwd(), 'orders.db')
  if (raw === ':memory:') return ':memory:'
  return `file:${raw}`
}

let _client: Client | null = null

export function closeDb(): void {
  if (_client) { _client.close(); _client = null }
}

async function getDb(): Promise<Client> {
  if (_client) return _client
  _client = createClient({ url: dbUrl() })
  await _client.execute(`
    CREATE TABLE IF NOT EXISTS referral_clicks (
      ref_code    TEXT NOT NULL,
      visitor_ip  TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      PRIMARY KEY (ref_code, visitor_ip)
    )
  `)
  await _client.execute(`
    CREATE TABLE IF NOT EXISTS referral_rewards (
      ip          TEXT PRIMARY KEY,
      reward_count INTEGER NOT NULL DEFAULT 0
    )
  `)
  return _client
}

/**
 * Records a referral click and rewards both parties if the visitor is new.
 * Returns true if rewards were granted, false if this visitor already clicked.
 */
export async function recordReferralClick({
  refCode,
  sharerIp,
  visitorIp,
}: {
  refCode: string
  sharerIp: string
  visitorIp: string
}): Promise<boolean> {
  const db = await getDb()

  // Check for duplicate
  const existing = await db.execute({
    sql: 'SELECT 1 FROM referral_clicks WHERE ref_code = ? AND visitor_ip = ?',
    args: [refCode, visitorIp],
  })
  if (existing.rows.length > 0) return false

  // Don't reward self-referral
  if (visitorIp === sharerIp) return false

  // Check sharer reward cap
  const sharerRewards = await db.execute({
    sql: 'SELECT reward_count FROM referral_rewards WHERE ip = ?',
    args: [sharerIp],
  })
  const sharerCount = sharerRewards.rows.length > 0 ? Number(sharerRewards.rows[0].reward_count) : 0
  if (sharerCount >= MAX_REFERRAL_REWARDS) {
    // Record the click but don't reward
    await db.execute({
      sql: 'INSERT INTO referral_clicks (ref_code, visitor_ip, created_at) VALUES (?, ?, ?)',
      args: [refCode, visitorIp, Date.now()],
    })
    return false
  }

  // Record click
  await db.execute({
    sql: 'INSERT INTO referral_clicks (ref_code, visitor_ip, created_at) VALUES (?, ?, ?)',
    args: [refCode, visitorIp, Date.now()],
  })

  // Reward both parties
  await Promise.all([
    rewardFreeUse(sharerIp),
    rewardFreeUse(visitorIp),
  ])

  // Increment sharer reward counter
  await db.execute({
    sql: `INSERT INTO referral_rewards (ip, reward_count) VALUES (?, 1)
          ON CONFLICT(ip) DO UPDATE SET reward_count = reward_count + 1`,
    args: [sharerIp],
  })

  return true
}

/** Returns how many unique visitors have clicked this refCode. */
export async function getReferralCount(refCode: string): Promise<number> {
  const db = await getDb()
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as c FROM referral_clicks WHERE ref_code = ?',
    args: [refCode],
  })
  return Number(result.rows[0].c)
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd ai-room-designer && npx jest __tests__/referral.test.ts --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 5 passed, 5 total`

- [ ] **Step 5: Commit**

```bash
cd ai-room-designer && git add lib/referral.ts __tests__/referral.test.ts
git commit -m "feat: add referral click recording and reward logic"
```

---

### Task 2: `/r/[orderId]` — 分享跳转页

**Files:**
- Create: `ai-room-designer/app/r/[orderId]/page.tsx`

- [ ] **Step 1: 创建跳转页**

新建 `ai-room-designer/app/r/[orderId]/page.tsx`：

```tsx
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { recordReferralClick } from '@/lib/referral'
import { getOrder } from '@/lib/orders'
import { createHash } from 'crypto'
import { notFound } from 'next/navigation'

interface Props {
  params: { orderId: string }
  searchParams: { ref?: string }
}

/** Derive the sharer's IP from the 6-char refCode by reverse-lookup is impossible;
 *  instead, refCode IS the sharer's ip-hash and we store it directly. */
export default async function ReferralPage({ params, searchParams }: Props) {
  const { orderId } = params
  const refCode = searchParams.ref ?? ''

  // Verify the order exists
  const order = await getOrder(orderId)
  if (!order) notFound()

  if (refCode && refCode.length === 6) {
    const headersList = await headers()
    const forwarded = headersList.get('x-forwarded-for')
    const visitorIp = forwarded?.split(',')[0]?.trim() ?? 'unknown'
    const visitorRefCode = createHash('sha256').update(visitorIp).digest('hex').slice(0, 6)

    // Only process if visitor is not the sharer
    if (visitorRefCode !== refCode) {
      // sharerIp is not recoverable from hash — we pass refCode as a proxy identifier
      // rewardFreeUse needs an IP key; use the refCode as the sharer's key in ip_free_uses
      await recordReferralClick({
        refCode,
        sharerIp: `ref:${refCode}`, // keyed by refCode, not real IP
        visitorIp,
      })
    }
  }

  redirect(`/result/${orderId}`)
}
```

- [ ] **Step 2: Commit**

```bash
cd ai-room-designer && git add app/r/\[orderId\]/page.tsx
git commit -m "feat: add referral redirect page /r/[orderId]"
```

---

### Task 3: 结果页 — 生成 refCode，传给 SharePanel

**Files:**
- Modify: `ai-room-designer/app/result/[orderId]/page.tsx`

- [ ] **Step 1: 在结果页计算 refCode**

在 `result/[orderId]/page.tsx` 中，找到 `const pageUrl = ...` 行，在其后添加：

```typescript
import { createHash } from 'crypto'

// ...（在 pageUrl 之后）

  // Generate refCode from current viewer's IP for sharing
  const visitorForwarded = headersList.get('x-forwarded-for')
  const visitorIp = visitorForwarded?.split(',')[0]?.trim() ?? 'unknown'
  const refCode = createHash('sha256').update(visitorIp).digest('hex').slice(0, 6)
  const shareUrl = `${proto}://${host}/r/${order.id}?ref=${refCode}`
```

- [ ] **Step 2: 将 `shareUrl` 传给 SharePanel**

找到 `<SharePanel` 的 JSX 调用，将 `pageUrl={pageUrl}` 改为 `pageUrl={shareUrl}`：

```tsx
<SharePanel style={order.style} resultUrl={order.resultUrl} pageUrl={shareUrl} />
```

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer && git add app/result/\[orderId\]/page.tsx
git commit -m "feat: generate refCode in result page and pass referral URL to SharePanel"
```

---

### Task 4: SharePanel — 显示分享人数

**Files:**
- Modify: `ai-room-designer/components/SharePanel.tsx`
- Modify: `ai-room-designer/app/result/[orderId]/page.tsx`

SharePanel 目前是纯客户端组件，不能直接查 DB。分享人数需从结果页 Server Component 预取后作为 prop 传入。

- [ ] **Step 1: 在结果页预取分享人数**

在 `result/[orderId]/page.tsx` 中，`refCode` 计算后追加：

```typescript
import { getReferralCount } from '@/lib/referral'

// ...（在 refCode 之后）
  const referralCount = await getReferralCount(refCode)
```

- [ ] **Step 2: 将 referralCount 传给 SharePanel**

```tsx
<SharePanel
  style={order.style}
  resultUrl={order.resultUrl}
  pageUrl={shareUrl}
  referralCount={referralCount}
/>
```

- [ ] **Step 3: SharePanel 接受并显示 referralCount**

在 `components/SharePanel.tsx` 的 `Props` interface 中添加：

```typescript
  referralCount?: number
```

在 `SharePanel` 函数参数中解构：

```typescript
export default function SharePanel({ style, pageUrl, referralCount = 0 }: Props) {
```

在分享按钮列表下方（`</div>` 关闭 flex 容器之前），添加分享人数文案：

```tsx
          {referralCount > 0 && (
            <p className="text-gray-600 text-xs mt-1">
              已有 {referralCount} 人通过你的链接体验
            </p>
          )}
```

- [ ] **Step 4: Commit**

```bash
cd ai-room-designer && git add components/SharePanel.tsx app/result/\[orderId\]/page.tsx lib/referral.ts
git commit -m "feat: show referral count on result page share panel"
```

---

### Task 5: 端到端验证

- [ ] **Step 1: 启动开发服务器**

```bash
cd ai-room-designer && npm run dev
```

- [ ] **Step 2: 验证分享链接格式**

1. 生成一张图，打开结果页
2. 点击"复制链接"
3. 确认复制的链接格式为 `http://localhost:3000/r/<orderId>?ref=<6位hash>`

- [ ] **Step 3: 验证裂变跳转**

1. 在新的无痕窗口（模拟新访客 IP）打开该链接
2. 确认被重定向到 `/result/<orderId>`
3. 刷新原结果页，确认"已有 1 人通过你的链接体验"文案出现

- [ ] **Step 4: 运行所有测试**

```bash
cd ai-room-designer && npx jest --no-coverage 2>&1 | tail -5
```

Expected: 全部通过。

- [ ] **Step 5: 最终 commit**

```bash
cd ai-room-designer && git add -A
git commit -m "feat: complete referral sharing feature"
```
