# AI Room Designer — 部署说明

## 项目概览

AI Room Designer 是一个 AI 室内设计工具，支持上传房间照片生成改造效果图。项目分为**国内版**和**海外版**两套独立部署，通过 `NEXT_PUBLIC_REGION` 环境变量在构建时切换。

图像生成使用 Zenmux 代理调用 Gemini 模型：
- 标准（1024px）：`google/gemini-2.5-flash-image`
- 高清（2048px）：`google/gemini-3.1-flash-image-preview`
- 超清（4096px）：`google/gemini-3-pro-image-preview`
- API 地址：`https://zenmux.ai/api/vertex-ai`

---

## 两套部署

| 属性 | 国内版（CN） | 海外版（Overseas） |
|------|------------|-----------------|
| **Vercel 项目** | `ai-room-designer` | `ai-room-designer-overseas` |
| **生产 URL** | https://ai-room-designer-kohl.vercel.app | https://ai-room-designer-overseas.vercel.app |
| **区域标识** | `NEXT_PUBLIC_REGION=cn`（或不设） | `NEXT_PUBLIC_REGION=overseas` |
| **语言** | 中文 | English |
| **支付** | 支付宝扫码 | Stripe |
| **登录方式** | 手机短信验证码 + 微信扫码 | Google OAuth（NextAuth.js） |
| **AI 模型** | Zenmux → Gemini | Zenmux → Gemini |
| **文件存储** | Supabase Storage（bucket: room-designer） | Supabase Storage（bucket: room-designer） |
| **数据库** | Turso LibSQL | Turso LibSQL（独立数据库） |

---

## 环境变量

### 国内版（ai-room-designer）

```env
# 区域
NEXT_PUBLIC_REGION=cn           # 可不设，默认为 CN

# 数据库
ORDERS_DB=<turso-db-url>
LIBSQL_AUTH_TOKEN=<turso-token>

# Supabase 文件存储
NEXT_PUBLIC_SUPABASE_URL=https://zzqylewczbtqkltvxbut.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# 会话
SESSION_SECRET=<random-secret>

# AI 生成
ZENMUX_API_KEY=<zenmux-key>

# 支付宝
ALIPAY_NOTIFY_URL=https://ai-room-designer-kohl.vercel.app/api/notify

# 微信登录
WECHAT_APPID=<appid>
WECHAT_SECRET=<secret>

# 公开 URL
NEXT_PUBLIC_BASE_URL=https://ai-room-designer-kohl.vercel.app
```

### 海外版（ai-room-designer-overseas）

```env
# 区域（必须设置，驱动构建时切换）
NEXT_PUBLIC_REGION=overseas
REGION=overseas

# 数据库
ORDERS_DB=<turso-db-url>
LIBSQL_AUTH_TOKEN=<turso-token>

# Supabase 文件存储
NEXT_PUBLIC_SUPABASE_URL=https://zzqylewczbtqkltvxbut.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# 会话
SESSION_SECRET=<random-secret>
NEXTAUTH_SECRET=<nextauth-secret>

# NextAuth + Google OAuth
NEXTAUTH_URL=https://ai-room-designer-overseas.vercel.app
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>

# AI 生成
ZENMUX_API_KEY=<zenmux-key>

# Stripe 支付
STRIPE_SECRET_KEY=<sk_live_...>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<pk_live_...>
STRIPE_WEBHOOK_SECRET=<whsec_...>
STRIPE_PRO_MONTHLY_PRICE_ID=<price_id>
STRIPE_PRO_YEARLY_PRICE_ID=<price_id>
STRIPE_UNLIMITED_MONTHLY_PRICE_ID=<price_id>
STRIPE_UNLIMITED_YEARLY_PRICE_ID=<price_id>

# 公开 URL
NEXT_PUBLIC_BASE_URL=https://ai-room-designer-overseas.vercel.app
```

---

## 认证流程

### 国内版 — 手机短信验证码

1. 用户输入手机号 → `POST /api/auth/send-code`
2. 服务端生成 6 位验证码，写入 `codes` 表（5 分钟有效）
3. 开发模式（`DEV_SKIP_PAYMENT=true`）：验证码打印到控制台，任意 6 位可通过
4. 用户输入验证码 → `POST /api/auth/verify`
5. 服务端返回 HMAC 签名的 session cookie（7 天有效）
6. 后续请求通过 `parseSessionToken(cookie)` 校验身份

### 国内版 — 微信扫码

1. 用户点击「微信登录」→ `GET /api/auth/wechat`
2. 重定向到微信 OAuth，回调 `GET /api/auth/wechat/callback`
3. 服务端用 `openid` 查找或创建用户，设置同款 session cookie

### 海外版 — Google OAuth（NextAuth.js v5）

1. 用户点击「Sign in with Google」→ `GET /api/auth/signin/google`
2. 重定向到 Google，回调 `GET /api/auth/callback/google`
3. NextAuth `signIn` callback：用 `google_id` 查找或创建用户，将 `userId` 写入 JWT
4. 后续 API 路由通过 `getServerSession(req)` → `auth()` 读取 session

**Google Cloud Console 必须配置：**
- 授权 JavaScript 来源：`https://ai-room-designer-overseas.vercel.app`
- 授权重定向 URI：`https://ai-room-designer-overseas.vercel.app/api/auth/callback/google`

---

## 本地开发

```bash
cd ai-room-designer
npm install

# 国内版
# 确保 .env.local 包含国内 env vars
npm run dev

# 海外版
# 将 .env.overseas.local 中的值复制到 .env.local（覆盖 REGION 等）
npm run dev
```

开发模式设置 `DEV_SKIP_PAYMENT=true` 可跳过支付，直接生成效果图。

---

## 部署命令

```bash
# 在项目根目录 d:/code/ai-app 下执行

# 国内版
vercel deploy --prod --cwd ai-room-designer

# 海外版
vercel deploy --prod --cwd ai-room-designer --project ai-room-designer-overseas
# 注意：Vercel 会从项目已配置的 env vars 读取，无需手动传入
```

---

## 架构说明

- **`lib/region.ts`**：`export const isOverseas = process.env.NEXT_PUBLIC_REGION === 'overseas'`，构建时固化，全站通过此常量切换语言、支付、登录方式
- **`lib/region-config.ts`**：i18n 字符串集中管理（`strings.xxx`）
- **Supabase Storage**：上传文件持久化（Vercel serverless `/tmp` 不跨调用持久）
- **`lib/auth.ts`**：`getServerSession(req)` — CN 读 HMAC session cookie，Overseas 调 NextAuth `auth()`

---

*最后更新：2026-04-18*
