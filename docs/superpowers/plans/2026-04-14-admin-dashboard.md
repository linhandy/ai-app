# 管理后台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/admin?token=<ADMIN_TOKEN>` 提供只读运营看板，显示订单数、GMV、用户数和生成指标。

**Architecture:** 纯 Server Component，直接在页面中调用 DB 查询函数，无需新的 API 路由。token 从 query 参数读取，与环境变量 `ADMIN_TOKEN` 比对，不匹配返回 403。新增 `lib/admin-queries.ts` 封装所有统计查询，与现有 `lib/orders.ts` 保持隔离。

**Tech Stack:** Next.js 14 App Router · TypeScript · libsql (SQLite) · Tailwind CSS

**前置条件：** 独立 plan，可单独执行。建议在 `lib/orders.ts` 已有 userId 字段（云端历史 plan）后执行，但不强制。

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `ai-room-designer/lib/admin-queries.ts` | 统计查询：订单数、GMV、用户数、成功率、耗时 |
| 新建 | `ai-room-designer/app/admin/page.tsx` | Server Component：token 鉴权 + 渲染看板 |
| 新建 | `ai-room-designer/__tests__/admin-queries.test.ts` | 统计函数单元测试 |

---

### Task 1: `lib/admin-queries.ts` — 统计查询

**Files:**
- Create: `ai-room-designer/lib/admin-queries.ts`
- Create: `ai-room-designer/__tests__/admin-queries.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `ai-room-designer/__tests__/admin-queries.test.ts`：

```typescript
import { createOrder, updateOrder, closeDb } from '@/lib/orders'
import {
  getOrderStats,
  getRecentOrders,
  getGenerationMetrics,
} from '@/lib/admin-queries'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  closeDb()
})

afterAll(() => {
  closeDb()
})

async function makeOrder(style: string, status: 'done' | 'failed' | 'pending', createdAt?: number) {
  const o = await createOrder({ style, uploadId: 'u1', quality: 'standard' })
  if (status !== 'pending') {
    await updateOrder(o.id, { status, resultUrl: status === 'done' ? '/img.png' : undefined })
  }
  return o
}

test('getOrderStats returns zeros for empty DB', async () => {
  const stats = await getOrderStats()
  expect(stats.todayCount).toBe(0)
  expect(stats.totalGmv).toBe(0)
})

test('getOrderStats counts paid orders', async () => {
  await makeOrder('北欧简约', 'done')
  await makeOrder('新中式', 'done')
  await makeOrder('工业风', 'pending') // not counted
  const stats = await getOrderStats()
  expect(stats.totalCount).toBe(2)
})

test('getRecentOrders returns last 100 orders newest first', async () => {
  for (let i = 0; i < 5; i++) await makeOrder(`style${i}`, 'done')
  const orders = await getRecentOrders()
  expect(orders.length).toBe(5)
  expect(orders[0].createdAt).toBeGreaterThanOrEqual(orders[1].createdAt)
})

test('getGenerationMetrics calculates success rate', async () => {
  await makeOrder('A', 'done')
  await makeOrder('B', 'done')
  await makeOrder('C', 'failed')
  const metrics = await getGenerationMetrics()
  expect(metrics.successRate).toBeCloseTo(0.667, 2)
  expect(metrics.totalCount).toBe(3)
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd ai-room-designer && npx jest __tests__/admin-queries.test.ts --no-coverage 2>&1 | tail -5
```

Expected: `Cannot find module '@/lib/admin-queries'`

- [ ] **Step 3: 实现 `lib/admin-queries.ts`**

新建 `ai-room-designer/lib/admin-queries.ts`：

```typescript
import { createClient, Client } from '@libsql/client'
import path from 'path'

function dbUrl(): string {
  const raw = process.env.ORDERS_DB ?? path.join(process.cwd(), 'orders.db')
  if (raw === ':memory:') return ':memory:'
  return `file:${raw}`
}

let _client: Client | null = null

async function getDb(): Promise<Client> {
  if (_client) return _client
  _client = createClient({ url: dbUrl() })
  return _client
}

// Re-export for test teardown
export function closeDb(): void {
  if (_client) { _client.close(); _client = null }
}

const QUALITY_PRICE: Record<string, number> = {
  standard: 1,
  premium: 3,
  ultra: 5,
}

export interface OrderStats {
  todayCount: number
  weekCount: number
  monthCount: number
  totalCount: number
  totalGmv: number       // ¥
  todayGmv: number
}

export interface RecentOrder {
  id: string
  status: string
  style: string
  quality: string
  mode: string
  createdAt: number
  amount: number
}

export interface GenerationMetrics {
  successRate: number    // 0–1
  avgDurationMs: number
  totalCount: number
  failedCount: number
}

export interface UserStats {
  totalUsers: number
  todayNewUsers: number
}

function dayStart(offsetDays = 0): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - offsetDays)
  return d.getTime()
}

export async function getOrderStats(): Promise<OrderStats> {
  const db = await getDb()
  const todayTs = dayStart()
  const weekTs = dayStart(7)
  const monthTs = dayStart(30)

  const [today, week, month, total] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) as c FROM orders WHERE status = 'done' AND createdAt >= ?`, args: [todayTs] }),
    db.execute({ sql: `SELECT COUNT(*) as c FROM orders WHERE status = 'done' AND createdAt >= ?`, args: [weekTs] }),
    db.execute({ sql: `SELECT COUNT(*) as c FROM orders WHERE status = 'done' AND createdAt >= ?`, args: [monthTs] }),
    db.execute({ sql: `SELECT COUNT(*) as c FROM orders WHERE status = 'done'`, args: [] }),
  ])

  // Calculate GMV from quality tiers (no amount column — derive from quality)
  const allDone = await db.execute({ sql: `SELECT quality FROM orders WHERE status = 'done'`, args: [] })
  const totalGmv = allDone.rows.reduce((sum, r) => sum + (QUALITY_PRICE[String(r.quality)] ?? 1), 0)

  const todayDone = await db.execute({ sql: `SELECT quality FROM orders WHERE status = 'done' AND createdAt >= ?`, args: [todayTs] })
  const todayGmv = todayDone.rows.reduce((sum, r) => sum + (QUALITY_PRICE[String(r.quality)] ?? 1), 0)

  return {
    todayCount: Number(today.rows[0].c),
    weekCount: Number(week.rows[0].c),
    monthCount: Number(month.rows[0].c),
    totalCount: Number(total.rows[0].c),
    totalGmv,
    todayGmv,
  }
}

export async function getRecentOrders(limit = 100): Promise<RecentOrder[]> {
  const db = await getDb()
  const result = await db.execute({
    sql: `SELECT id, status, style, quality, mode, createdAt FROM orders ORDER BY createdAt DESC LIMIT ?`,
    args: [limit],
  })
  return result.rows.map((r) => ({
    id: String(r.id),
    status: String(r.status),
    style: String(r.style),
    quality: String(r.quality ?? 'standard'),
    mode: String(r.mode ?? 'redesign'),
    createdAt: Number(r.createdAt),
    amount: QUALITY_PRICE[String(r.quality ?? 'standard')] ?? 1,
  }))
}

export async function getGenerationMetrics(): Promise<GenerationMetrics> {
  const db = await getDb()
  const result = await db.execute({
    sql: `SELECT status, createdAt, updatedAt FROM orders WHERE status IN ('done', 'failed') AND createdAt >= ?`,
    args: [dayStart(7)],
  })

  const rows = result.rows
  const total = rows.length
  const failed = rows.filter((r) => r.status === 'failed').length
  const done = rows.filter((r) => r.status === 'done')

  const avgDurationMs = done.length > 0
    ? done.reduce((sum, r) => sum + (Number(r.updatedAt) - Number(r.createdAt)), 0) / done.length
    : 0

  return {
    successRate: total > 0 ? (total - failed) / total : 0,
    avgDurationMs,
    totalCount: total,
    failedCount: failed,
  }
}

export async function getUserStats(): Promise<UserStats> {
  const db = await getDb()
  const todayTs = dayStart()

  // Users table may not exist yet if auth isn't set up
  try {
    const [total, today] = await Promise.all([
      db.execute({ sql: `SELECT COUNT(*) as c FROM users`, args: [] }),
      db.execute({ sql: `SELECT COUNT(*) as c FROM users WHERE createdAt >= ?`, args: [todayTs] }),
    ])
    return { totalUsers: Number(total.rows[0].c), todayNewUsers: Number(today.rows[0].c) }
  } catch {
    return { totalUsers: 0, todayNewUsers: 0 }
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd ai-room-designer && npx jest __tests__/admin-queries.test.ts --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 4 passed, 4 total`

- [ ] **Step 5: Commit**

```bash
cd ai-room-designer && git add lib/admin-queries.ts __tests__/admin-queries.test.ts
git commit -m "feat: add admin query functions for stats and order listing"
```

---

### Task 2: `/admin` — Server Component 页面

**Files:**
- Create: `ai-room-designer/app/admin/page.tsx`

- [ ] **Step 1: 创建管理页面**

新建 `ai-room-designer/app/admin/page.tsx`：

```tsx
import { redirect } from 'next/navigation'
import { getOrderStats, getRecentOrders, getGenerationMetrics, getUserStats } from '@/lib/admin-queries'

interface Props {
  searchParams: { token?: string }
}

function formatGmv(amount: number) {
  return `¥${amount.toFixed(2)}`
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

function formatDuration(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`
}

const MODE_LABELS: Record<string, string> = {
  redesign: '风格改造',
  virtual_staging: '虚拟家装',
  add_furniture: '添加家具',
  paint_walls: '墙面换色',
  change_lighting: '灯光优化',
  sketch2render: '草图渲染',
  freestyle: '自由生成',
  outdoor_redesign: '户外设计',
  unlock: '去水印',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  generating: '生成中',
  done: '完成',
  failed: '失败',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400',
  paid: 'text-blue-400',
  generating: 'text-amber-400',
  done: 'text-green-400',
  failed: 'text-red-400',
}

export default async function AdminPage({ searchParams }: Props) {
  const adminToken = process.env.ADMIN_TOKEN
  if (!adminToken || searchParams.token !== adminToken) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg font-semibold">403 — 无权访问</p>
          <p className="text-gray-600 text-sm mt-2">请携带正确的 token 参数访问</p>
        </div>
      </main>
    )
  }

  const [stats, orders, metrics, users] = await Promise.all([
    getOrderStats(),
    getRecentOrders(100),
    getGenerationMetrics(),
    getUserStats(),
  ])

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <h1 className="text-2xl font-bold mb-8">装AI 运营后台</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="今日订单" value={String(stats.todayCount)} sub={`本月 ${stats.monthCount} 单`} />
        <StatCard label="今日 GMV" value={formatGmv(stats.todayGmv)} sub={`总计 ${formatGmv(stats.totalGmv)}`} />
        <StatCard label="注册用户" value={String(users.totalUsers)} sub={`今日新增 ${users.todayNewUsers}`} />
        <StatCard
          label="生成成功率（7天）"
          value={`${(metrics.successRate * 100).toFixed(1)}%`}
          sub={`平均 ${formatDuration(metrics.avgDurationMs)}`}
        />
      </div>

      {/* Recent orders */}
      <h2 className="text-lg font-semibold mb-4">最近订单（{orders.length} 条）</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500">
              <th className="text-left px-4 py-3 font-medium">时间</th>
              <th className="text-left px-4 py-3 font-medium">订单ID</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-right px-4 py-3 font-medium">金额</th>
              <th className="text-left px-4 py-3 font-medium">风格</th>
              <th className="text-left px-4 py-3 font-medium">模式</th>
              <th className="text-left px-4 py-3 font-medium">质量</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-gray-900 hover:bg-gray-900/40 transition-colors">
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatTime(o.createdAt)}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{o.id.slice(-8)}</td>
                <td className={`px-4 py-2.5 font-medium ${STATUS_COLORS[o.status] ?? 'text-gray-400'}`}>
                  {STATUS_LABELS[o.status] ?? o.status}
                </td>
                <td className="px-4 py-2.5 text-right text-amber-400 font-semibold">¥{o.amount}</td>
                <td className="px-4 py-2.5 text-gray-300">{o.style}</td>
                <td className="px-4 py-2.5 text-gray-400">{MODE_LABELS[o.mode] ?? o.mode}</td>
                <td className="px-4 py-2.5 text-gray-500">{o.quality}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-600">暂无订单</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <p className="text-gray-500 text-xs mb-2">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-600 text-xs mt-1">{sub}</p>
    </div>
  )
}
```

- [ ] **Step 2: 确认页面可访问（需要启动 dev server）**

```bash
cd ai-room-designer && npm run dev &
sleep 5
curl -s "http://localhost:3000/admin" | grep -o "403\|无权访问" | head -1
```

Expected: 输出 `无权访问`

```bash
curl -s "http://localhost:3000/admin?token=test123" | grep -o "无权访问\|运营后台" | head -1
```

设置 `ADMIN_TOKEN=test123` 后 Expected: 输出 `运营后台`

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer && git add app/admin/page.tsx
git commit -m "feat: add read-only admin dashboard at /admin"
```

---

### Task 3: 环境变量配置

**Files:**
- Modify: `.env.local` （本地）
- Modify: `ai-room-designer/README.md`

- [ ] **Step 1: 添加 ADMIN_TOKEN 到本地环境变量**

在项目的 `.env.local` 中添加（自行生成一个随机字符串）：

```
ADMIN_TOKEN=your-secret-admin-token-here
```

- [ ] **Step 2: 在 README 记录该变量**

在 README 的环境变量说明部分追加：

```markdown
| `ADMIN_TOKEN` | 管理后台访问 token，访问 `/admin?token=<value>` | 必须设置，否则后台不可访问 |
```

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer && git add README.md
# 不要 commit .env.local（已在 .gitignore 中）
git commit -m "docs: document ADMIN_TOKEN environment variable"
```

---

### Task 4: 端到端验证

- [ ] **Step 1: 启动开发服务器并验证**

```bash
cd ai-room-designer && ADMIN_TOKEN=testtoken123 npm run dev
```

访问 `http://localhost:3000/admin?token=testtoken123`，确认：
- 4 个统计卡片正常显示
- 订单列表渲染（可能为空）
- 无 JS 报错

- [ ] **Step 2: 运行所有测试**

```bash
cd ai-room-designer && npx jest --no-coverage 2>&1 | tail -5
```

Expected: 全部通过。

- [ ] **Step 3: 最终 commit**

```bash
cd ai-room-designer && git add -A
git commit -m "feat: complete admin dashboard feature"
```
