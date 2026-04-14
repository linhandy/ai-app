# 免费体验层 + 水印 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每个 IP 每7天可免费生成3次，免费结果加水印；用户付费后可解锁无水印版本。

**Architecture:** 新增 `lib/free-uses.ts` 管理 IP 额度，新增 `lib/watermark.ts` 处理水印叠加；`create-order` 路由检测 IP 额度并决定是否走付费流程；`generate` 路由在免费订单生成完毕后叠水印并存盘；结果页针对免费订单显示"去水印"按钮，触发 unlock 付款流程。

**Tech Stack:** Next.js 14 App Router · TypeScript · libsql (SQLite) · sharp (新增) · 现有 Alipay SDK

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `ai-room-designer/lib/free-uses.ts` | IP 免费额度的读取、消耗、奖励逻辑 |
| 新建 | `ai-room-designer/lib/watermark.ts` | sharp 水印叠加工具函数 |
| 修改 | `ai-room-designer/lib/orders.ts` | 新增 `is_free` migration + Order 类型 + unlock 支持 |
| 修改 | `ai-room-designer/app/api/create-order/route.ts` | 加 IP 免费检测 + unlock 订单创建 |
| 修改 | `ai-room-designer/app/api/generate/route.ts` | 免费订单叠水印 + unlock 订单处理 |
| 修改 | `ai-room-designer/app/result/[orderId]/page.tsx` | 免费订单显示"去水印"按钮 |
| 修改 | `ai-room-designer/app/generate/page.tsx` | 额度用尽时显示提示 |
| 新建 | `ai-room-designer/__tests__/free-uses.test.ts` | free-uses 单元测试 |

---

### Task 1: 安装 sharp

**Files:**
- Modify: `ai-room-designer/package.json`

- [ ] **Step 1: 安装依赖**

```bash
cd ai-room-designer && npm install sharp
npm install --save-dev @types/sharp
```

Expected: `package.json` dependencies 中出现 `"sharp": "^0.33.x"` 。

- [ ] **Step 2: 验证可导入**

```bash
cd ai-room-designer && node -e "const s = require('sharp'); console.log('sharp ok', s.versions)"
```

Expected: 输出 `sharp ok { ... }` ，无报错。

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer && git add package.json package-lock.json
git commit -m "chore: install sharp for watermark generation"
```

---

### Task 2: `lib/free-uses.ts` — IP 额度管理

**Files:**
- Create: `ai-room-designer/lib/free-uses.ts`
- Create: `ai-room-designer/__tests__/free-uses.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `ai-room-designer/__tests__/free-uses.test.ts`：

```typescript
import { getRemainingFreeUses, consumeFreeUse, rewardFreeUse, closeDb } from '@/lib/free-uses'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  closeDb()
})

afterAll(() => {
  closeDb()
})

test('新 IP 有 3 次免费额度', async () => {
  expect(await getRemainingFreeUses('1.2.3.4')).toBe(3)
})

test('consumeFreeUse 减少额度并返回 true', async () => {
  const ok = await consumeFreeUse('1.2.3.4')
  expect(ok).toBe(true)
  expect(await getRemainingFreeUses('1.2.3.4')).toBe(2)
})

test('连续消耗 3 次后返回 false', async () => {
  await consumeFreeUse('5.6.7.8')
  await consumeFreeUse('5.6.7.8')
  await consumeFreeUse('5.6.7.8')
  expect(await consumeFreeUse('5.6.7.8')).toBe(false)
  expect(await getRemainingFreeUses('5.6.7.8')).toBe(0)
})

test('rewardFreeUse 减少 used_count（等效于 +1 次），最低到 0', async () => {
  await consumeFreeUse('9.9.9.9')
  await rewardFreeUse('9.9.9.9')
  expect(await getRemainingFreeUses('9.9.9.9')).toBe(3)
})

test('7天后额度重置', async () => {
  // Manually insert an expired record
  const { getDb } = await import('@/lib/free-uses')
  const db = await getDb()
  const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
  await db.execute({
    sql: 'INSERT OR REPLACE INTO ip_free_uses (ip, used_count, last_reset_at) VALUES (?, ?, ?)',
    args: ['2.3.4.5', 3, eightDaysAgo],
  })
  expect(await getRemainingFreeUses('2.3.4.5')).toBe(3)
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd ai-room-designer && npx jest __tests__/free-uses.test.ts --no-coverage 2>&1 | tail -5
```

Expected: `Cannot find module '@/lib/free-uses'`

- [ ] **Step 3: 实现 `lib/free-uses.ts`**

新建 `ai-room-designer/lib/free-uses.ts`：

```typescript
import { createClient, Client } from '@libsql/client'
import path from 'path'

const FREE_USES_PER_PERIOD = 3
const RESET_PERIOD_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function dbUrl(): string {
  const raw = process.env.ORDERS_DB ?? path.join(process.cwd(), 'orders.db')
  if (raw === ':memory:') return ':memory:'
  return `file:${raw}`
}

let _client: Client | null = null

export function closeDb(): void {
  if (_client) {
    _client.close()
    _client = null
  }
}

export async function getDb(): Promise<Client> {
  if (_client) return _client
  _client = createClient({ url: dbUrl() })
  await _client.execute(`
    CREATE TABLE IF NOT EXISTS ip_free_uses (
      ip TEXT PRIMARY KEY,
      used_count INTEGER NOT NULL DEFAULT 0,
      last_reset_at INTEGER NOT NULL
    )
  `)
  return _client
}

/** Returns how many free uses this IP has left (0–3). Resets if expired. */
export async function getRemainingFreeUses(ip: string): Promise<number> {
  const db = await getDb()
  const result = await db.execute({ sql: 'SELECT used_count, last_reset_at FROM ip_free_uses WHERE ip = ?', args: [ip] })
  if (result.rows.length === 0) return FREE_USES_PER_PERIOD

  const row = result.rows[0]
  const lastReset = Number(row.last_reset_at)
  if (Date.now() - lastReset > RESET_PERIOD_MS) {
    await db.execute({ sql: 'UPDATE ip_free_uses SET used_count = 0, last_reset_at = ? WHERE ip = ?', args: [Date.now(), ip] })
    return FREE_USES_PER_PERIOD
  }
  return Math.max(0, FREE_USES_PER_PERIOD - Number(row.used_count))
}

/**
 * Attempts to consume one free use for the IP.
 * Returns true if consumed, false if quota exhausted.
 */
export async function consumeFreeUse(ip: string): Promise<boolean> {
  const remaining = await getRemainingFreeUses(ip)
  if (remaining <= 0) return false

  const db = await getDb()
  await db.execute({
    sql: `INSERT INTO ip_free_uses (ip, used_count, last_reset_at) VALUES (?, 1, ?)
          ON CONFLICT(ip) DO UPDATE SET used_count = used_count + 1`,
    args: [ip, Date.now()],
  })
  return true
}

/**
 * Rewards the IP with +1 free use (decrements used_count, min 0).
 * Used for referral bonuses.
 */
export async function rewardFreeUse(ip: string): Promise<void> {
  const db = await getDb()
  await db.execute({
    sql: `INSERT INTO ip_free_uses (ip, used_count, last_reset_at) VALUES (?, 0, ?)
          ON CONFLICT(ip) DO UPDATE SET used_count = MAX(0, used_count - 1)`,
    args: [ip, Date.now()],
  })
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd ai-room-designer && npx jest __tests__/free-uses.test.ts --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 5 passed, 5 total`

- [ ] **Step 5: Commit**

```bash
cd ai-room-designer && git add lib/free-uses.ts __tests__/free-uses.test.ts
git commit -m "feat: add IP free-uses quota management"
```

---

### Task 3: `lib/watermark.ts` — 水印工具

**Files:**
- Create: `ai-room-designer/lib/watermark.ts`

- [ ] **Step 1: 实现水印函数**

新建 `ai-room-designer/lib/watermark.ts`：

```typescript
import sharp from 'sharp'

const WATERMARK_TEXT = '装AI'
const OPACITY = 77 // ~30% of 255

/**
 * Applies a tiled diagonal "装AI" watermark to the input image buffer.
 * Returns a new PNG buffer with the watermark applied.
 */
export async function applyWatermark(inputBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(inputBuffer).metadata()
  const width = meta.width ?? 1024
  const height = meta.height ?? 1024

  // Build a single tile as SVG (120×60, text rotated -25°)
  const tileW = 150
  const tileH = 80
  const tileSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}">
      <text
        x="50%"
        y="55%"
        font-family="sans-serif"
        font-size="22"
        font-weight="bold"
        fill="white"
        fill-opacity="0.30"
        text-anchor="middle"
        dominant-baseline="middle"
        transform="rotate(-25, ${tileW / 2}, ${tileH / 2})"
      >${WATERMARK_TEXT}</text>
    </svg>
  `)

  // Tile the SVG across the full image
  const cols = Math.ceil(width / tileW) + 1
  const rows = Math.ceil(height / tileH) + 1
  const composites: sharp.OverlayOptions[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      composites.push({
        input: tileSvg,
        top: row * tileH,
        left: col * tileW,
      })
    }
  }

  return sharp(inputBuffer)
    .composite(composites)
    .png()
    .toBuffer()
}
```

- [ ] **Step 2: 手动验证（可选）**

```bash
cd ai-room-designer && node -e "
const {applyWatermark} = require('./lib/watermark');
const fs = require('fs');
// Only run if a test image exists
const img = Buffer.alloc(100);
applyWatermark(Buffer.from('fake')).catch(e => console.log('expected error for fake buffer:', e.message));
"
```

Expected: 输出 `expected error for fake buffer: ...`（fake buffer 会报错，说明函数可调用）

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer && git add lib/watermark.ts
git commit -m "feat: add server-side watermark utility using sharp"
```

---

### Task 4: `lib/orders.ts` — 新增 `is_free` migration

**Files:**
- Modify: `ai-room-designer/lib/orders.ts`

- [ ] **Step 1: 在 Order 接口添加 `isFree` 字段**

在 `lib/orders.ts` 的 `Order` interface 中，`alipayTradeNo` 字段后面添加：

```typescript
  isFree?: boolean
```

- [ ] **Step 2: 在 `getClient()` 添加 migration**

在 `lib/orders.ts` 的 `getClient()` 函数中，找到最后一个 migration 块（`customPrompt`），在其后追加：

```typescript
  // Migration: add is_free column for free tier
  try {
    await _client.execute(`ALTER TABLE orders ADD COLUMN is_free INTEGER NOT NULL DEFAULT 0`)
  } catch {
    // Column already exists — ignore
  }
```

- [ ] **Step 3: 在 `rowToOrder` 添加映射**

在 `rowToOrder` 函数的 return 对象中，`alipayTradeNo` 行后追加：

```typescript
    isFree: Boolean(row.is_free),
```

- [ ] **Step 4: `createOrder` 接受 `isFree` 参数**

在 `createOrder` 的 `params` 类型中添加 `isFree?: boolean`，在 `order` 对象中添加 `isFree: params.isFree ?? false`，在 INSERT SQL 和 args 中加入该字段：

```typescript
// params type addition:
  isFree?: boolean

// order object addition:
  isFree: params.isFree ?? false,

// INSERT SQL — change to:
    sql: `INSERT INTO orders (id, status, style, quality, mode, uploadId, roomType, customPrompt, is_free, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [order.id, order.status, order.style, order.quality, order.mode,
           order.uploadId ?? '',
           order.roomType, order.customPrompt ?? null,
           order.isFree ? 1 : 0,
           order.createdAt, order.updatedAt],
```

- [ ] **Step 5: `updateOrder` 支持更新 `isFree`**

在 `updateOrder` 函数的字段更新列表中追加：

```typescript
  if (patch.isFree !== undefined) { fields.push('is_free = ?'); values.push(patch.isFree ? 1 : 0) }
```

- [ ] **Step 6: 运行现有测试，确认不回归**

```bash
cd ai-room-designer && npx jest __tests__/orders.test.ts --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 7 passed, 7 total`

- [ ] **Step 7: Commit**

```bash
cd ai-room-designer && git add lib/orders.ts
git commit -m "feat: add is_free field to orders for free tier tracking"
```

---

### Task 5: `create-order` — IP 免费检测

**Files:**
- Modify: `ai-room-designer/app/api/create-order/route.ts`

- [ ] **Step 1: 在文件顶部引入 free-uses**

在 `create-order/route.ts` 现有 import 列表末尾添加：

```typescript
import { getRemainingFreeUses, consumeFreeUse } from '@/lib/free-uses'
```

- [ ] **Step 2: 在 `createOrder()` 调用之前插入免费检测逻辑**

找到 `const order = await createOrder({` 这行，在其前面插入：

```typescript
    // Free tier check: if IP has quota, skip Alipay
    const remaining = await getRemainingFreeUses(ip)
    const isFree = remaining > 0

    if (isFree) {
      await consumeFreeUse(ip)
    }
```

- [ ] **Step 3: 将 `isFree` 传入 createOrder**

在 `createOrder({...})` 的参数对象末尾加上 `isFree,`：

```typescript
    const order = await createOrder({
      style,
      uploadId: uploadId ?? null,
      quality,
      mode,
      roomType,
      customPrompt: trimmedPrompt,
      isFree,
    })
```

- [ ] **Step 4: 免费订单跳过 Alipay，直接标记为 paid**

找到 `if (process.env.DEV_SKIP_PAYMENT === 'true')` 块，在其后（`const qrCodeUrl` 之前）插入：

```typescript
    if (isFree) {
      await updateOrder(order.id, { status: 'paid' })
      return NextResponse.json({ orderId: order.id, isFree: true })
    }
```

- [ ] **Step 5: 返回 `remainingFreeUses` 供前端提示**

在现有最终 `return NextResponse.json({ orderId: order.id, qrDataUrl })` 中追加字段（已付费路径）：

```typescript
    return NextResponse.json({ orderId: order.id, qrDataUrl, remainingFreeUses: Math.max(0, remaining - 1) })
```

- [ ] **Step 6: Commit**

```bash
cd ai-room-designer && git add app/api/create-order/route.ts
git commit -m "feat: skip payment for IPs with free quota"
```

---

### Task 6: `generate` — 免费订单叠水印

**Files:**
- Modify: `ai-room-designer/app/api/generate/route.ts`

- [ ] **Step 1: 引入 watermark 和 getOrder 已有，添加 watermark 导入**

在 `generate/route.ts` 顶部现有 import 后追加：

```typescript
import { applyWatermark } from '@/lib/watermark'
```

- [ ] **Step 2: 在保存生成图之后，对免费订单叠水印**

找到现有代码：

```typescript
    const resultFilename = `result-${orderId}.png`
    const resultPath = path.join(UPLOAD_DIR, resultFilename)
    fs.writeFileSync(resultPath, resultBuffer)

    // Store a URL that the preview API can serve
    const resultUrl = `/api/preview?uploadId=${encodeURIComponent(resultFilename)}`
    await updateOrder(orderId, { status: 'done', resultUrl })
```

替换为：

```typescript
    const resultFilename = `result-${orderId}.png`
    const resultPath = path.join(UPLOAD_DIR, resultFilename)
    fs.writeFileSync(resultPath, resultBuffer)

    let resultUrl = `/api/preview?uploadId=${encodeURIComponent(resultFilename)}`

    // For free orders, apply watermark and serve the watermarked version
    if (order.isFree) {
      const watermarkedBuffer = await applyWatermark(resultBuffer)
      const wmFilename = `result-${orderId}-wm.png`
      fs.writeFileSync(path.join(UPLOAD_DIR, wmFilename), watermarkedBuffer)
      resultUrl = `/api/preview?uploadId=${encodeURIComponent(wmFilename)}`
    }

    await updateOrder(orderId, { status: 'done', resultUrl })
```

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer && git add app/api/generate/route.ts
git commit -m "feat: apply watermark to free-tier generated images"
```

---

### Task 7: unlock 订单流程

**Files:**
- Modify: `ai-room-designer/app/api/create-order/route.ts`
- Modify: `ai-room-designer/app/api/generate/route.ts`

允许用户为免费结果付 ¥1 解锁无水印版本。unlock 订单通过 `mode='unlock'`、`uploadId=originalOrderId` 标识。

- [ ] **Step 1: `create-order` 支持 unlock 请求**

在 `create-order/route.ts` 中，找到 `const { uploadId, style... } = await req.json()` 解构，添加 `unlockOrderId` 字段：

```typescript
    const {
      uploadId,
      style = '',
      quality = 'standard',
      mode = 'redesign',
      roomType = 'living_room',
      customPrompt,
      unlockOrderId,          // new: orderId of the free order to unlock
    } = await req.json() as {
      uploadId?: string
      style?: string
      quality?: QualityTier
      mode?: DesignMode
      roomType?: string
      customPrompt?: string
      unlockOrderId?: string  // new
    }
```

- [ ] **Step 2: 在现有校验之前处理 unlock 请求**

在 `const validModes` 校验之前插入：

```typescript
    // Unlock flow: pay ¥1 to remove watermark from a free order
    if (unlockOrderId) {
      const targetOrder = await getOrder(unlockOrderId)
      if (!targetOrder || !targetOrder.isFree || targetOrder.status !== 'done') {
        return NextResponse.json({ error: '无效的解锁订单' }, { status: 400 })
      }
      const unlockOrder = await createOrder({
        style: 'unlock',
        uploadId: unlockOrderId,
        quality: 'standard',
        mode: 'unlock' as DesignMode,
        roomType: 'living_room',
      })
      const qrCodeUrl = await createQROrder({ orderId: unlockOrder.id, style: '去水印', amount: 1 })
      const qrDataUrl = await QRCode.toDataURL(qrCodeUrl, { width: 240, margin: 2 })
      return NextResponse.json({ orderId: unlockOrder.id, qrDataUrl })
    }
```

注意：需要在 `DESIGN_MODES` 的 `validModes` 校验中豁免 `'unlock'` mode。在 `validModes` 校验行后添加：

```typescript
    if (mode !== 'unlock' && !validModes.includes(mode as string)) {
```

（替换原有的 `if (!validModes.includes(mode as string))`）

- [ ] **Step 3: `generate` 处理 unlock 模式**

在 `generate/route.ts` 中，找到 `await updateOrder(orderId, { status: 'generating' })` 后，在 `const startTime = Date.now()` 之前插入：

```typescript
    // Unlock mode: remove watermark from linked free order
    if (order.mode === 'unlock' && order.uploadId) {
      const linkedOrderId = order.uploadId
      const linked = await getOrder(linkedOrderId)
      if (!linked) {
        await updateOrder(orderId, { status: 'failed' })
        return NextResponse.json({ error: '原订单不存在' }, { status: 404 })
      }
      // Point linked order's resultUrl to the clean (non-watermarked) image
      const cleanFilename = `result-${linkedOrderId}.png`
      const cleanUrl = `/api/preview?uploadId=${encodeURIComponent(cleanFilename)}`
      await updateOrder(linkedOrderId, { isFree: false, resultUrl: cleanUrl })
      await updateOrder(orderId, { status: 'done', resultUrl: cleanUrl })
      return NextResponse.json({ resultUrl: cleanUrl })
    }
```

- [ ] **Step 4: Commit**

```bash
cd ai-room-designer && git add app/api/create-order/route.ts app/api/generate/route.ts
git commit -m "feat: add unlock order flow to remove watermark after payment"
```

---

### Task 8: 结果页 — "去水印"按钮

**Files:**
- Modify: `ai-room-designer/app/result/[orderId]/page.tsx`

- [ ] **Step 1: 传递 `isFree` 到结果页渲染**

在 `result/[orderId]/page.tsx` 中，找到 `if (order.status !== 'done' || !order.resultUrl) notFound()` 行之后，找到 JSX return 中显示结果图的区域。

在 `<ComparePanel>` 组件之后，`<SharePanel>` 之前，添加条件渲染的"去水印"按钮区块：

```tsx
      {/* De-watermark CTA for free orders */}
      {order.isFree && (
        <div className="w-full max-w-[1100px] mt-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between gap-4">
          <div>
            <p className="text-amber-400 font-semibold text-sm">当前为免费体验版（含水印）</p>
            <p className="text-gray-500 text-xs mt-0.5">支付 ¥1 解锁无水印高清版本</p>
          </div>
          <UnwatermarkButton orderId={order.id} />
        </div>
      )}
```

- [ ] **Step 2: 新建 `UnwatermarkButton` 客户端组件**

`PaymentModal` 的实际接口是 `{ orderId, qrDataUrl, onClose }`，付款后会 `router.push('/result/<orderId>')`（导航到解锁订单页）。这里改用自定义轮询，付款后重载原始结果页。

新建 `ai-room-designer/components/UnwatermarkButton.tsx`：

```tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface Props {
  orderId: string  // the original FREE order to unlock
}

type Step = 'idle' | 'loading' | 'qr' | 'polling' | 'done' | 'error'

export default function UnwatermarkButton({ orderId }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [unlockOrderId, setUnlockOrderId] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  const handleClick = async () => {
    setStep('loading')
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlockOrderId: orderId }),
      })
      const data = await res.json()
      if (!data.orderId || !data.qrDataUrl) { setStep('error'); return }
      setUnlockOrderId(data.orderId)
      setQrDataUrl(data.qrDataUrl)
      setStep('qr')
    } catch {
      setStep('error')
    }
  }

  // Poll for payment after QR is shown
  useEffect(() => {
    if (step !== 'qr' || !unlockOrderId) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/query-order?orderId=${unlockOrderId}`)
        const data = await res.json()
        if (data.status === 'paid') {
          setStep('polling')
          // Trigger generate for the unlock order
          await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: unlockOrderId }),
          })
          setStep('done')
          clearInterval(pollRef.current)
          // Reload current page to show clean image
          window.location.reload()
        }
        if (data.status === 'failed') { setStep('error'); clearInterval(pollRef.current) }
      } catch { /* ignore */ }
    }, 2000)
    return () => clearInterval(pollRef.current)
  }, [step, unlockOrderId])

  if (step === 'qr') {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4" onClick={() => setStep('idle')}>
        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-8 flex flex-col items-center gap-4 w-80" onClick={e => e.stopPropagation()}>
          <h3 className="text-white font-bold text-lg">扫码支付 ¥1</h3>
          <p className="text-gray-400 text-sm">支付后自动去除水印</p>
          {qrDataUrl && <img src={qrDataUrl} alt="支付二维码" className="w-44 h-44 rounded-xl bg-white p-1" />}
          <button onClick={() => setStep('idle')} className="text-gray-600 text-sm hover:text-gray-400 transition-colors">关闭</button>
        </div>
      </div>
    )
  }

  if (step === 'polling') {
    return <span className="shrink-0 text-amber-400 text-sm font-semibold px-5 h-10 flex items-center">处理中...</span>
  }

  return (
    <button
      onClick={handleClick}
      disabled={step === 'loading'}
      className="shrink-0 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-5 h-10 rounded-lg transition-colors disabled:opacity-50"
    >
      {step === 'loading' ? '请稍候...' : step === 'error' ? '重试' : '¥1 去水印'}
    </button>
  )
}
```

- [ ] **Step 3: 在结果页 import UnwatermarkButton**

在 `result/[orderId]/page.tsx` 顶部 import 列表中添加：

```typescript
import UnwatermarkButton from '@/components/UnwatermarkButton'
```

- [ ] **Step 5: Commit**

```bash
cd ai-room-designer && git add app/result/\[orderId\]/page.tsx components/UnwatermarkButton.tsx
git commit -m "feat: show unwatermark CTA on result page for free orders"
```

---

### Task 9: 生成页 — 额度提示

**Files:**
- Modify: `ai-room-designer/app/generate/page.tsx`

- [ ] **Step 1: 查看生成页的提交按钮区域**

```bash
grep -n "生成\|submit\|onClick\|button" d:/code/ai-app/ai-room-designer/app/generate/page.tsx | head -20
```

- [ ] **Step 2: 在提交按钮附近添加免费额度状态**

在生成页的提交按钮下方（或上方）添加免费次数提示。找到提交按钮所在位置，在其旁边添加：

从 `create-order` 响应中读取 `remainingFreeUses`，并在 state 中保存。在提交后更新显示。具体实现取决于生成页现有 state 结构，但核心逻辑为：

```tsx
// Add to component state:
const [freeRemaining, setFreeRemaining] = useState<number | null>(null)

// After successful create-order response, update:
if (data.isFree) {
  setFreeRemaining(0) // just used last free
} else if (typeof data.remainingFreeUses === 'number') {
  setFreeRemaining(data.remainingFreeUses)
}

// In JSX, below the submit button:
{freeRemaining !== null && freeRemaining > 0 && (
  <p className="text-gray-500 text-xs text-center mt-2">
    还剩 {freeRemaining} 次免费体验
  </p>
)}
{freeRemaining === 0 && (
  <p className="text-gray-500 text-xs text-center mt-2">
    免费次数已用完，后续生成将按质量收费
  </p>
)}
```

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer && git add app/generate/page.tsx
git commit -m "feat: show remaining free uses on generate page"
```

---

### Task 10: 端到端验证

- [ ] **Step 1: 启动开发服务器**

```bash
cd ai-room-designer && npm run dev
```

- [ ] **Step 2: 验证免费生成流程**

1. 打开 `http://localhost:3000/generate`
2. 上传图片，选择风格，点击生成
3. 确认无支付弹窗，直接进入等待页
4. 确认结果图带有 "装AI" 水印
5. 确认页面显示"去水印"按钮

- [ ] **Step 3: 验证第4次触发付款**

刷新多次生成直到用完3次，确认第4次出现支付二维码弹窗。

- [ ] **Step 4: 运行所有测试**

```bash
cd ai-room-designer && npx jest --no-coverage 2>&1 | tail -10
```

Expected: 所有测试通过，无失败。

- [ ] **Step 5: 最终 commit**

```bash
cd ai-room-designer && git add -A
git commit -m "feat: complete free trial + watermark feature"
```
