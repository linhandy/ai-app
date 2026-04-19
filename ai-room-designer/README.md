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
| **自定义域名** | — | https://www.roomai.shop |
| **区域标识** | `REGION=cn`（或不设） | `REGION=overseas` |
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
REGION=cn           # 可不设，默认为 CN

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

# 国内版（ai-room-designer-kohl.vercel.app）
cd ai-room-designer
vercel deploy --prod --yes

# 海外版（www.roomai.shop 和 ai-room-designer-overseas.vercel.app）
cd ai-room-designer
# 确保 .vercel/project.json 指向正确的项目ID：
# {"projectId":"prj_rflYYV6AJBNvGHLTcKCAuKbw7Gpr",...}
vercel deploy --prod --yes
```

### 部署注意事项

1. **⚠️ 重要：确认目标项目**
   - 部署前检查 `.vercel/project.json` 中的 `projectId`
   - 国内版：`prj_Vu7dHakw4VI1gnE3I3ez1Ske0mEK`
   - 海外版：`prj_rflYYV6AJBNvGHLTcKCAuKbw7Gpr`

2. **环境变量自动注入**
   - 国内版：Vercel 项目设置中自动包含 `REGION=cn`（或不设）
   - 海外版：**必须**在 Vercel 项目 Settings → Environment Variables 中设置 `REGION=overseas`
     - 也可在 `vercel.json` 中配置：`{"env": {"REGION": "overseas"}}`

3. **验证部署**
   ```bash
   # 部署完成后
   # 海外版：访问 https://www.roomai.shop 检查标题是否为 "RoomAI"
   # 尝试登录、升级支付计划等流程
   ```

---

## 架构说明

- **`lib/region.ts`**：`export const isOverseas = process.env.NEXT_PUBLIC_REGION === 'overseas'`，构建时固化，全站通过此常量切换语言、支付、登录方式
- **`lib/region-config.ts`**：i18n 字符串集中管理（`strings.xxx`）
- **Supabase Storage**：上传文件持久化（Vercel serverless `/tmp` 不跨调用持久）
- **`lib/auth.ts`**：`getServerSession(req)` — CN 读 HMAC session cookie，Overseas 调 NextAuth `auth()`

---

## ADMIN_TOKEN 配置

ADMIN_TOKEN 用于后台管理接口认证，在 Vercel 项目环境变量中配置：
- **海外版**已配置：`ADMIN_TOKEN=prod-admin-sec-kjX9mP2vQ4wL7nR8tY5sZ`
- **ADMIN_EMAILS**：`51332lin@gmail.com`

---

## 海外版bug修复（2026-04-19）

修复了三个关键bug：

1. **Sign in to RoomAI 失败**
   - **原因**：NextAuth cookie domain 仅在生产环境设置，本地/预览环境跨域失败
   - **修复**：`lib/next-auth.ts` 第66行，添加 `isOverseas` 判定
   - **结果**：本地开发和 Vercel 预览环境可正常处理 Google OAuth 回调

2. **www.roomai.shop 浏览器标题是中文**
   - **原因**：Vercel 部署时 `REGION` 环境变量未设置为 `overseas`，导致 `isOverseas=false`
   - **修复**：在 `vercel.json` 添加 `{"env": {"REGION": "overseas"}}`
   - **结果**：所有国际化字符串自动切换到英文版本

3. **未登录点 pro/premium 报错"Payment setup failed"**
   - **原因**：错误字符串不匹配（API 返回 `"Sign in required."`，前端检查 `"authRequired"`）
   - **修复**：`components/PricingCards.tsx` 第78行，检查 `res.status === 401` 和正确的错误消息
   - **结果**：未登录用户点击升级正确重定向到登录页

---

*最后更新：2026-04-19*
