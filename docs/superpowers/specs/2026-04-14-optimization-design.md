# 装AI 优化方案 Spec

**日期：** 2026-04-14  
**状态：** 已批准  
**范围：** 免费体验层 · 云端历史 · 管理后台 · 分享裂变

---

## 背景与目标

当前项目已具备完整的 AI 设计生成能力（40+ 风格、8 种模式、Alipay 按次付费）。核心问题是**冷启动难**（付费门槛阻断首次体验）和**运营不可见**（无法查看订单和收入）。

本次优化保持现有架构不变（本地图片存储、Alipay 按次付费 ¥1-5），在此基础上增加 4 个独立功能模块。

---

## 不在本次范围内

- 图片存储迁移（保留本地磁盘）
- 充值包 / 余额钱包系统
- 月卡订阅制
- 微信支付
- SEO / API 开放

---

## 功能 1：免费体验层

### 目标
去掉首次使用的付费门槛，降低用户进入漏斗的摩擦；通过水印机制驱动付费转化。

### 规则
- 每个 IP 每 **7 天** 享有 **3 次** 免费生成额度
- 免费生成结果服务端叠加半透明水印（"装AI" 字样，30% 不透明度，斜向重复）
- 付费订单（任意金额）生成的结果**不加水印**，返回原始图片
- IP 额度用尽时，生成按钮触发付费弹窗（现有 PaymentModal）

### 实现

**数据存储：** 在现有 `orders` 表 / 独立 `ip_free_uses` 表中记录。推荐独立表：

```sql
CREATE TABLE ip_free_uses (
  ip TEXT NOT NULL,
  used_count INTEGER DEFAULT 0,
  last_reset_at INTEGER NOT NULL  -- Unix timestamp
);
CREATE UNIQUE INDEX ON ip_free_uses(ip);
```

重置逻辑：查询时若 `last_reset_at` 距今超过 7 天，则重置 `used_count = 0`。

**水印：** 使用 `sharp` 库（**需新增依赖：`npm install sharp`**）在 `/api/generate` 返回结果时叠加。
- 免费订单（`order.is_free = true`）：生成完毕后叠水印，返回水印图 URL
- 付费订单：直接返回原图 URL

**`/api/create-order` 改动：**
1. 读取请求 IP
2. 查 `ip_free_uses`：若 `used_count < 3` 且未过期 → 创建免费订单（`amount = 0`，跳过 Alipay）
3. 否则 → 走现有付费流程

**前端改动：**
- 结果页：免费结果显示"去水印"按钮 → 点击触发付款弹窗，付款成功后重新拉取无水印图
- 生成页：额度用尽时在生成按钮下方显示提示文案

### 约束
- IP 来自 `X-Forwarded-For` 或 `req.ip`，取第一个非私有地址
- 免费生成仍走完整生成流程，消耗 Gemini API 调用
- 水印不覆盖付费用户的历史记录

---

## 功能 2：云端历史

### 目标
登录用户的生成历史存储在数据库，换设备不丢失。

### 规则
- 已登录用户：历史从 `/api/history` 接口加载（DB 查询）
- 未登录用户：维持现有 localStorage 逻辑（向后兼容）
- 最多返回最近 **50 条**记录
- 历史条目包含：缩略图 URL、风格名、模式、生成时间、订单状态

### 实现

**`orders` 表：** 当前无 `user_id` 字段，通过 migration 添加（遵循现有 ALTER TABLE 模式）。

**新接口 `GET /api/history`：**
- 读取 Cookie `session` → 调用现有 `parseSessionToken(token)` 获取 `userId`（来自 `lib/auth.ts`）
- 查询 `orders WHERE userId = ? AND status = 'done' ORDER BY createdAt DESC LIMIT 50`
- 返回 JSON 数组

**`history` 页面改动：**
- 组件挂载时：检测登录状态
  - 已登录 → fetch `/api/history`，渲染 DB 数据
  - 未登录 → 读 localStorage（现有逻辑）
- 登录后触发重新加载，合并 localStorage 数据（去重，以 orderId 为 key）

### 约束
- 不迁移旧的 localStorage 数据，用户登录后会看到云端历史（可能为空）
- 历史页的"轮询刷新"逻辑对云端历史同样适用

---

## 功能 3：管理后台

### 目标
提供最小可用的运营看板，能查看订单、收入、用户数和生成状态。

### 路由
`/admin` — 服务端渲染页面（Next.js Server Component）

### 鉴权
请求携带 query 参数 `?token=<ADMIN_TOKEN>` 或 Cookie，与环境变量 `ADMIN_TOKEN` 比对。不匹配返回 403。

### 页面内容

**概览卡片（今日 / 本周 / 本月）：**
- 订单数（付费）
- GMV（收入总额，单位 ¥）
- 注册用户数 / 今日新增

**订单列表（最近 100 条）：**

| 时间 | 订单ID | 状态 | 金额 | 风格 | 模式 | 质量 |
|------|--------|------|------|------|------|------|

**生成指标（最近 7 天）：**
- 成功率 = `status='done'` / `status IN ('done','failed')`
- 平均生成耗时（`updatedAt - createdAt` where status='done'）

### 实现
- 纯服务端查询，直接调用 `lib/orders.ts` 中的 DB 方法
- 无需新的 API 路由，直接在 Server Component 中 await 数据
- 样式沿用现有 Tailwind 组件风格

### 约束
- `ADMIN_TOKEN` 必须在部署环境变量中设置，否则后台不可访问
- 不支持数据修改操作（只读）

---

## 功能 4：分享裂变

### 目标
通过结果页的分享链接实现低成本拉新，双方各得 1 次免费额度。

### 规则
- 结果页生成专属分享链接：`/r/<orderId>?ref=<refCode>`
- `refCode` = 分享者的 IP hash（6位）
- 新访客（IP 未见过）通过该链接访问：
  - 分享者 IP：`ip_free_uses.used_count -= 1`（等效于 +1 次额度，最多补偿到 3 次）
  - 访客 IP：`ip_free_uses.used_count -= 1`（同上，首次进入送1次）
- 同一访客 IP 重复访问同一分享链接：不重复奖励

### 实现

**新表 `referral_clicks`：**
```sql
CREATE TABLE referral_clicks (
  ref_code TEXT NOT NULL,
  visitor_ip TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (ref_code, visitor_ip)
);
```

**`/r/[orderId]` 页面（Server Component）：**
1. 解析 `ref` 参数
2. 检查 `referral_clicks` 是否已有该 `(ref_code, visitor_ip)` 记录
3. 若无：插入记录，更新 `ip_free_uses`（分享者和访客各 -1 used_count，下限 0）
4. 重定向到 `/result/<orderId>`

**结果页 SharePanel 改动：**
- 生成分享链接时附加 `?ref=<ip_hash>`（前端计算或后端返回）
- 显示"已分享 N 人"统计（查 referral_clicks 计数）

### 约束
- ref 奖励只影响 `ip_free_uses`，不影响付费订单流程
- 奖励上限：每个 IP 通过分享累计最多补偿 10 次（防刷）
- 分享链接永久有效（不过期）

---

## 数据库变更汇总

```sql
-- 功能1：新表
CREATE TABLE IF NOT EXISTS ip_free_uses (
  ip TEXT PRIMARY KEY,
  used_count INTEGER DEFAULT 0,
  last_reset_at INTEGER NOT NULL
);

-- 功能1：orders 表增加 is_free 字段（migration，遵循现有 try/catch 模式）
ALTER TABLE orders ADD COLUMN is_free INTEGER NOT NULL DEFAULT 0;

-- 功能2：orders 表增加 userId 字段（migration）
ALTER TABLE orders ADD COLUMN userId TEXT;

-- 功能4：新表
CREATE TABLE IF NOT EXISTS referral_clicks (
  ref_code TEXT NOT NULL,
  visitor_ip TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (ref_code, visitor_ip)
);
```

所有 migration 均在 `lib/orders.ts` 的 `getClient()` 中用 `try/catch ALTER TABLE` 方式追加，与现有 `mode`、`roomType`、`customPrompt` 的 migration 保持一致。

---

## 执行顺序

| 顺序 | 功能 | 原因 |
|------|------|------|
| 1 | 免费体验层 | 直接影响上线后获客，最优先 |
| 2 | 云端历史 | 留存机制，上线后第二步 |
| 3 | 管理后台 | 有用户后需要看数据 |
| 4 | 分享裂变 | 有一定用户基础后效果更好 |

每个功能独立，可单独上线，互不阻塞。
