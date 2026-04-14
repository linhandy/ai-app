# 云端历史 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 登录用户的生成历史存储在数据库，换设备不丢失；未登录用户继续使用 localStorage。

**Architecture:** 在 `orders` 表加 `userId` 列（migration），`create-order` 路由从 session cookie 中读取 userId 并关联订单；新增 `GET /api/history` 接口返回当前用户最近50条已完成订单；历史页检测登录状态，已登录时优先拉取 API 数据。

**Tech Stack:** Next.js 14 App Router · TypeScript · libsql (SQLite) · 现有 `lib/auth.ts` 的 `parseSessionToken()`

**前置条件：** 本 plan 独立于免费体验层 plan，可单独执行。

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `ai-room-designer/lib/orders.ts` | 新增 `userId` migration + `createOrder` 接受 userId + `getOrdersByUserId` 查询函数 |
| 修改 | `ai-room-designer/app/api/create-order/route.ts` | 从 session cookie 读取 userId，传入 createOrder |
| 新建 | `ai-room-designer/app/api/history/route.ts` | GET 接口返回用户订单列表 |
| 修改 | `ai-room-designer/app/history/page.tsx` | 已登录时 fetch API，未登录走 localStorage |
| 修改 | `ai-room-designer/__tests__/orders.test.ts` | 补充 userId 相关测试 |

---

### Task 1: `lib/orders.ts` — 新增 userId

**Files:**
- Modify: `ai-room-designer/lib/orders.ts`
- Modify: `ai-room-designer/__tests__/orders.test.ts`

- [ ] **Step 1: 写失败测试**

在 `__tests__/orders.test.ts` 末尾追加：

```typescript
test('createOrder stores userId when provided', async () => {
  const order = await createOrder({ style: '北欧简约', uploadId: 'abc', userId: 'usr_test1' })
  const found = await getOrder(order.id)
  expect(found?.userId).toBe('usr_test1')
})

test('getOrdersByUserId returns done orders for user', async () => {
  const o1 = await createOrder({ style: '现代轻奢', uploadId: 'x1', userId: 'usr_abc' })
  const o2 = await createOrder({ style: '新中式', uploadId: 'x2', userId: 'usr_abc' })
  const o3 = await createOrder({ style: '工业风', uploadId: 'x3', userId: 'usr_other' })

  await updateOrder(o1.id, { status: 'done', resultUrl: '/api/preview?uploadId=r1.png' })
  await updateOrder(o2.id, { status: 'done', resultUrl: '/api/preview?uploadId=r2.png' })
  await updateOrder(o3.id, { status: 'done', resultUrl: '/api/preview?uploadId=r3.png' })

  const { getOrdersByUserId } = await import('@/lib/orders')
  const results = await getOrdersByUserId('usr_abc')
  expect(results).toHaveLength(2)
  expect(results.map(r => r.id)).toContain(o1.id)
  expect(results.map(r => r.id)).toContain(o2.id)
})

test('getOrdersByUserId returns max 50 items', async () => {
  const { getOrdersByUserId } = await import('@/lib/orders')
  for (let i = 0; i < 55; i++) {
    const o = await createOrder({ style: '北欧简约', uploadId: `u${i}`, userId: 'usr_many' })
    await updateOrder(o.id, { status: 'done', resultUrl: `/api/preview?uploadId=r${i}.png` })
  }
  const results = await getOrdersByUserId('usr_many')
  expect(results.length).toBe(50)
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd ai-room-designer && npx jest __tests__/orders.test.ts --no-coverage 2>&1 | tail -8
```

Expected: `getOrdersByUserId is not a function` 或类似错误。

- [ ] **Step 3: 修改 `Order` 接口**

在 `lib/orders.ts` 的 `Order` interface 中，`isFree` 字段之后（或 `alipayTradeNo` 之后）添加：

```typescript
  userId?: string
```

- [ ] **Step 4: 在 `getClient()` 添加 migration**

在 `lib/orders.ts` 的 `getClient()` 函数中，最后一个 migration 块后追加：

```typescript
  // Migration: add userId column for cloud history
  try {
    await _client.execute(`ALTER TABLE orders ADD COLUMN userId TEXT`)
  } catch {
    // Column already exists — ignore
  }
```

- [ ] **Step 5: 在 `rowToOrder` 添加映射**

```typescript
    userId: row.userId ? String(row.userId) : undefined,
```

- [ ] **Step 6: `createOrder` 接受并存储 userId**

在 `createOrder` 的 `params` 类型中添加 `userId?: string`，在 order 对象中添加 `userId: params.userId`，在 INSERT SQL 中加入：

```typescript
// params type:
  userId?: string

// order object:
  userId: params.userId,

// INSERT SQL — change to include userId:
    sql: `INSERT INTO orders (id, status, style, quality, mode, uploadId, roomType, customPrompt, is_free, userId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [order.id, order.status, order.style, order.quality, order.mode,
           order.uploadId ?? '',
           order.roomType, order.customPrompt ?? null,
           order.isFree ? 1 : 0,
           order.userId ?? null,
           order.createdAt, order.updatedAt],
```

注意：如果免费体验层 plan 尚未执行，`is_free` 列不存在，INSERT 语句中去掉 `is_free, ` 及对应的 `order.isFree ? 1 : 0,`。

- [ ] **Step 7: 新增 `getOrdersByUserId` 函数**

在 `lib/orders.ts` 末尾追加：

```typescript
export async function getOrdersByUserId(userId: string, limit = 50): Promise<Order[]> {
  const client = await getClient()
  const result = await client.execute({
    sql: `SELECT * FROM orders
          WHERE userId = ? AND status = 'done'
          ORDER BY createdAt DESC
          LIMIT ?`,
    args: [userId, limit],
  })
  return result.rows.map(rowToOrder)
}
```

- [ ] **Step 8: 运行测试，确认通过**

```bash
cd ai-room-designer && npx jest __tests__/orders.test.ts --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 10 passed, 10 total`（原7条 + 新3条）

- [ ] **Step 9: Commit**

```bash
cd ai-room-designer && git add lib/orders.ts __tests__/orders.test.ts
git commit -m "feat: add userId to orders for cloud history"
```

---

### Task 2: `create-order` — 关联 userId

**Files:**
- Modify: `ai-room-designer/app/api/create-order/route.ts`

- [ ] **Step 1: 引入 parseSessionToken**

在 `create-order/route.ts` 顶部添加导入：

```typescript
import { parseSessionToken } from '@/lib/auth'
```

- [ ] **Step 2: 从 cookie 提取 userId**

在 `const ip = req.headers.get(...)` 行之后，找到 `try {` 块内、`const { uploadId, style... }` 解构之前，插入：

```typescript
    // Extract userId from session cookie (optional — guests have no userId)
    const sessionToken = req.cookies.get('session')?.value
    const session = sessionToken ? parseSessionToken(sessionToken) : null
    const userId = session?.userId
```

- [ ] **Step 3: 将 userId 传入 createOrder**

在 `createOrder({...})` 调用的参数对象末尾添加：

```typescript
      userId,
```

- [ ] **Step 4: Commit**

```bash
cd ai-room-designer && git add app/api/create-order/route.ts
git commit -m "feat: associate orders with logged-in user"
```

---

### Task 3: `GET /api/history` — 云端历史接口

**Files:**
- Create: `ai-room-designer/app/api/history/route.ts`

- [ ] **Step 1: 实现接口**

新建 `ai-room-designer/app/api/history/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { parseSessionToken } from '@/lib/auth'
import { getOrdersByUserId } from '@/lib/orders'

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get('session')?.value
  const session = sessionToken ? parseSessionToken(sessionToken) : null

  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const orders = await getOrdersByUserId(session.userId)

  const items = orders.map((o) => ({
    orderId: o.id,
    style: o.style,
    mode: o.mode,
    quality: o.quality,
    resultUrl: o.resultUrl,
    createdAt: o.createdAt,
    status: o.status,
  }))

  return NextResponse.json({ items })
}
```

- [ ] **Step 2: 手动测试接口（未登录）**

```bash
curl -s http://localhost:3000/api/history | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>console.log(JSON.parse(d)))"
```

Expected: `{ error: '未登录' }` (status 401)

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer && git add app/api/history/route.ts
git commit -m "feat: add GET /api/history endpoint for cloud order history"
```

---

### Task 4: 历史页 — 已登录读 DB，未登录读 localStorage

**Files:**
- Modify: `ai-room-designer/app/history/page.tsx`

- [ ] **Step 1: 添加 session 检测逻辑**

在 `app/history/page.tsx` 的 `useEffect` 中，在 `const history = getHistory()` 之前，先检测是否已登录并拉取云端数据。

完整替换现有 `useEffect` 为：

```typescript
  useEffect(() => {
    async function loadHistory() {
      // Try cloud history first (logged-in users)
      try {
        const res = await fetch('/api/history')
        if (res.ok) {
          const data = await res.json()
          // Cloud history items have the same shape as HistoryItem
          const cloudItems: HistoryItem[] = data.items.map((o: {
            orderId: string; style: string; mode?: string; quality?: string; createdAt: number
          }) => ({
            orderId: o.orderId,
            style: o.style,
            mode: o.mode ?? 'redesign',
            quality: o.quality ?? 'standard',
            createdAt: o.createdAt,
          }))
          setItems(cloudItems)
          // Fetch order statuses for cloud items
          const results = await Promise.all(
            cloudItems.map(async (item) => {
              try {
                const r = await fetch(`/api/query-order?orderId=${item.orderId}`)
                if (!r.ok) return [item.orderId, { status: 'done', resultUrl: undefined }] as const
                return [item.orderId, await r.json()] as const
              } catch {
                return [item.orderId, { status: 'done', resultUrl: undefined }] as const
              }
            })
          )
          setOrders(Object.fromEntries(results))
          setLoading(false)
          return
        }
      } catch {
        // Not logged in or network error — fall through to localStorage
      }

      // Fallback: localStorage
      const history = getHistory()
      setItems(history)
      if (history.length === 0) {
        setLoading(false)
        return
      }
      const results = await Promise.all(
        history.map(async (item) => {
          try {
            const res = await fetch(`/api/query-order?orderId=${item.orderId}`)
            if (!res.ok) return [item.orderId, { status: 'expired' }] as const
            const data = await res.json()
            return [item.orderId, data] as const
          } catch {
            return [item.orderId, { status: 'expired' }] as const
          }
        })
      )
      setOrders(Object.fromEntries(results))
      setLoading(false)
    }

    loadHistory()
  }, [])
```

- [ ] **Step 2: 更新页面说明文字**

找到现有文字 `保存在本设备，图片7天后自动清理`，修改为动态文字（基于是否有云端数据）。在 state 中添加 `const [isCloud, setIsCloud] = useState(false)`，在云端加载成功时设置 `setIsCloud(true)`，然后：

```tsx
<p className="text-gray-500 text-sm mt-1">
  {isCloud ? '已登录，历史同步至云端' : '保存在本设备，图片7天后自动清理'}
</p>
```

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer && git add app/history/page.tsx
git commit -m "feat: load history from DB for logged-in users, localStorage fallback"
```

---

### Task 5: 端到端验证

- [ ] **Step 1: 验证未登录用户走 localStorage**

1. 打开隐私窗口，访问 `http://localhost:3000/history`
2. 确认历史为空，无报错
3. 生成一张图，确认出现在历史记录中

- [ ] **Step 2: 验证已登录用户走云端**

1. 登录（手机号或微信）
2. 生成一张图
3. 访问 `/history`，确认显示该订单
4. 清除浏览器 localStorage，刷新页面，确认云端历史仍然显示

- [ ] **Step 3: 运行所有测试**

```bash
cd ai-room-designer && npx jest --no-coverage 2>&1 | tail -5
```

Expected: 全部通过。

- [ ] **Step 4: 最终 commit**

```bash
cd ai-room-designer && git add -A
git commit -m "feat: complete cloud history feature"
```
