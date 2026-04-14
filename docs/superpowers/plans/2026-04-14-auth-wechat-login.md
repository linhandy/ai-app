# 微信公众号登录 + NavBar 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现微信公众号网页授权登录，手机号登录保持 dev 模式，首页显示已登录用户状态。

**Architecture:** 微信 OAuth 用纯服务端 redirect 完成（GET /api/auth/wechat → 微信授权页 → GET /api/auth/wechat/callback），session 通过 httpOnly cookie 传递。NavBar 作为 Server Component 读取 cookie 直接渲染登录状态，仅用于首页（history/generate 页是 Client Component，暂不改动）。

**Tech Stack:** Next.js 14 App Router, @libsql/client (SQLite), httpOnly cookie session, WeChat OAuth 2.0

---

## 文件清单

| 文件 | 操作 | 职责 |
|------|------|------|
| `ai-room-designer/lib/auth.ts` | 修改 | 加 wechat 字段 migration、`findOrCreateWechatUser`、`closeAuthDb`、更新 `getUser` |
| `ai-room-designer/app/api/auth/wechat/route.ts` | 新建 | 发起微信 OAuth，设 state cookie，302 跳微信 |
| `ai-room-designer/app/api/auth/wechat/callback/route.ts` | 新建 | 验证 state，换 token，拉用户信息，写 session cookie |
| `ai-room-designer/components/NavBar.tsx` | 新建 | Server Component，读 cookie 渲染登录状态 |
| `ai-room-designer/app/page.tsx` | 修改 | 替换内联 `<nav>` 为 `<NavBar />` |
| `ai-room-designer/app/login/page.tsx` | 修改 | 启用微信按钮（检测 UA），显示错误提示 |
| `ai-room-designer/next.config.mjs` | 修改 | 无需改动（使用 `<img>` 而非 `<Image>`，unoptimized 已全局开启） |
| `ai-room-designer/__tests__/auth.test.ts` | 新建 | `findOrCreateWechatUser` 单元测试 |

---

## Task 1: 为 auth.ts 添加 closeAuthDb + 写失败测试

**Files:**
- Modify: `ai-room-designer/lib/auth.ts`
- Create: `ai-room-designer/__tests__/auth.test.ts`

- [ ] **Step 1: 在 lib/auth.ts 末尾添加 closeAuthDb 函数**

在 `ai-room-designer/lib/auth.ts` 末尾追加（`getUser` 函数之后）：

```typescript
/** Close and reset the auth DB client (used in tests). */
export function closeAuthDb(): void {
  if (_client) {
    _client.close()
    _client = null
  }
}
```

- [ ] **Step 2: 写失败测试**

新建 `ai-room-designer/__tests__/auth.test.ts`：

```typescript
import { findOrCreateWechatUser, closeAuthDb } from '@/lib/auth'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  process.env.DEV_SKIP_PAYMENT = 'true'
  closeAuthDb()
})

afterAll(() => {
  closeAuthDb()
})

test('findOrCreateWechatUser creates a new user', async () => {
  const user = await findOrCreateWechatUser({
    openid: 'wx_openid_001',
    nickname: '测试用户',
    avatar: 'https://thirdwx.qlogo.cn/avatar.jpg',
  })
  expect(user.userId).toMatch(/^usr_/)
  expect(user.openid).toBe('wx_openid_001')
  expect(user.nickname).toBe('测试用户')
})

test('findOrCreateWechatUser returns same userId for same openid', async () => {
  const first = await findOrCreateWechatUser({
    openid: 'wx_openid_002',
    nickname: '用户A',
    avatar: 'https://thirdwx.qlogo.cn/a.jpg',
  })
  const second = await findOrCreateWechatUser({
    openid: 'wx_openid_002',
    nickname: '用户A改名',
    avatar: 'https://thirdwx.qlogo.cn/b.jpg',
  })
  expect(second.userId).toBe(first.userId)
  expect(second.nickname).toBe('用户A改名')
})

test('findOrCreateWechatUser creates independent user from phone user', async () => {
  const { verifyCode, sendCode } = await import('@/lib/auth')
  const wechatUser = await findOrCreateWechatUser({
    openid: 'wx_openid_003',
    nickname: '微信用户',
    avatar: '',
  })
  await sendCode('13800138000')
  const phoneResult = await verifyCode('13800138000', '123456')
  expect(phoneResult).not.toBeNull()
  expect(phoneResult!.userId).not.toBe(wechatUser.userId)
})
```

- [ ] **Step 3: 运行测试，确认失败**

```bash
cd ai-room-designer && npx jest __tests__/auth.test.ts --no-coverage 2>&1 | tail -20
```

预期：`findOrCreateWechatUser is not a function` 或类似错误。

---

## Task 2: DB migration + findOrCreateWechatUser 实现

**Files:**
- Modify: `ai-room-designer/lib/auth.ts`

- [ ] **Step 1: 更新 getClient() 中的 CREATE TABLE 和 migration**

在 `lib/auth.ts` 找到 `getClient()` 函数，将整个函数替换为：

```typescript
async function getClient(): Promise<Client> {
  if (_client) return _client

  _client = createClient({ url: dbUrl() })

  // phone 允许 NULL（微信用户无手机号）
  await _client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id               TEXT PRIMARY KEY,
      phone            TEXT UNIQUE,
      wechat_openid    TEXT,
      wechat_nickname  TEXT,
      wechat_avatar    TEXT,
      createdAt        INTEGER NOT NULL
    )
  `)

  await _client.execute(`
    CREATE TABLE IF NOT EXISTS codes (
      phone     TEXT NOT NULL,
      code      TEXT NOT NULL,
      expiresAt INTEGER NOT NULL
    )
  `)

  // Migrations for existing DBs
  try { await _client.execute(`ALTER TABLE users ADD COLUMN wechat_openid   TEXT`) } catch { /* already exists */ }
  try { await _client.execute(`ALTER TABLE users ADD COLUMN wechat_nickname TEXT`) } catch { /* already exists */ }
  try { await _client.execute(`ALTER TABLE users ADD COLUMN wechat_avatar   TEXT`) } catch { /* already exists */ }

  return _client
}
```

- [ ] **Step 2: 在 lib/auth.ts 添加 findOrCreateWechatUser**

在 `verifyCode` 函数之后，`createSessionToken` 之前插入：

```typescript
export async function findOrCreateWechatUser(params: {
  openid: string
  nickname: string
  avatar: string
}): Promise<{ userId: string; openid: string; nickname: string; avatar: string }> {
  const client = await getClient()

  const existing = await client.execute({
    sql: 'SELECT id FROM users WHERE wechat_openid = ?',
    args: [params.openid],
  })

  let userId: string
  if (existing.rows.length > 0) {
    userId = String(existing.rows[0].id)
    await client.execute({
      sql: 'UPDATE users SET wechat_nickname = ?, wechat_avatar = ? WHERE id = ?',
      args: [params.nickname, params.avatar, userId],
    })
  } else {
    userId = `usr_${crypto.randomBytes(8).toString('hex')}`
    await client.execute({
      sql: `INSERT INTO users (id, phone, wechat_openid, wechat_nickname, wechat_avatar, createdAt)
            VALUES (?, NULL, ?, ?, ?, ?)`,
      args: [userId, params.openid, params.nickname, params.avatar, Date.now()],
    })
  }

  return { userId, openid: params.openid, nickname: params.nickname, avatar: params.avatar }
}
```

- [ ] **Step 3: 运行测试，确认通过**

```bash
cd ai-room-designer && npx jest __tests__/auth.test.ts --no-coverage 2>&1 | tail -20
```

预期：`Tests: 3 passed, 3 total`

- [ ] **Step 4: 运行全部测试，确认无回归**

```bash
cd ai-room-designer && npx jest --no-coverage 2>&1 | tail -20
```

预期：全部 pass。

- [ ] **Step 5: Commit**

```bash
cd ai-room-designer && git add lib/auth.ts __tests__/auth.test.ts
git commit -m "feat: add wechat user migration and findOrCreateWechatUser"
```

---

## Task 3: 更新 getUser 返回 wechat 字段

**Files:**
- Modify: `ai-room-designer/lib/auth.ts`

- [ ] **Step 1: 替换 getUser 函数**

找到 `lib/auth.ts` 中的 `getUser` 函数，整体替换为：

```typescript
export async function getUser(id: string): Promise<{
  id: string
  phone: string | null
  wechat_openid: string | null
  wechat_nickname: string | null
  wechat_avatar: string | null
  createdAt: number
} | null> {
  const client = await getClient()
  const result = await client.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [id],
  })
  if (result.rows.length === 0) return null
  const row = result.rows[0]
  return {
    id: String(row.id),
    phone: row.phone != null ? String(row.phone) : null,
    wechat_openid: row.wechat_openid != null ? String(row.wechat_openid) : null,
    wechat_nickname: row.wechat_nickname != null ? String(row.wechat_nickname) : null,
    wechat_avatar: row.wechat_avatar != null ? String(row.wechat_avatar) : null,
    createdAt: Number(row.createdAt),
  }
}
```

- [ ] **Step 2: 运行全部测试**

```bash
cd ai-room-designer && npx jest --no-coverage 2>&1 | tail -20
```

预期：全部 pass。

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer && git add lib/auth.ts
git commit -m "feat: getUser returns wechat fields"
```

---

## Task 4: 创建 GET /api/auth/wechat（发起授权）

**Files:**
- Create: `ai-room-designer/app/api/auth/wechat/route.ts`

- [ ] **Step 1: 创建文件**

新建 `ai-room-designer/app/api/auth/wechat/route.ts`：

```typescript
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(req: Request) {
  const appId = process.env.WECHAT_APPID
  if (!appId) {
    return NextResponse.redirect(new URL('/login?error=wechat_not_configured', req.url))
  }

  const state = crypto.randomBytes(16).toString('hex')
  const reqUrl = new URL(req.url)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `${reqUrl.protocol}//${reqUrl.host}`
  const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/wechat/callback`)

  const wechatUrl =
    `https://open.weixin.qq.com/connect/oauth2/authorize` +
    `?appid=${appId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=snsapi_userinfo` +
    `&state=${state}` +
    `#wechat_redirect`

  const res = NextResponse.redirect(wechatUrl)
  res.cookies.set('wechat_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 300, // 5 minutes
    path: '/',
  })
  return res
}
```

- [ ] **Step 2: Commit**

```bash
cd ai-room-designer && git add app/api/auth/wechat/route.ts
git commit -m "feat: add GET /api/auth/wechat to initiate WeChat OAuth"
```

---

## Task 5: 创建 GET /api/auth/wechat/callback（处理回调）

**Files:**
- Create: `ai-room-designer/app/api/auth/wechat/callback/route.ts`

- [ ] **Step 1: 创建文件**

新建 `ai-room-designer/app/api/auth/wechat/callback/route.ts`：

```typescript
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { findOrCreateWechatUser, createSessionToken } from '@/lib/auth'

function failRedirect(baseUrl: string) {
  const res = NextResponse.redirect(`${baseUrl}/login?error=wechat_failed`)
  res.cookies.delete('wechat_state')
  return res
}

export async function GET(req: Request) {
  const reqUrl = new URL(req.url)
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`
  const code = reqUrl.searchParams.get('code')
  const state = reqUrl.searchParams.get('state')

  const cookieStore = await cookies()
  const savedState = cookieStore.get('wechat_state')?.value

  // Validate CSRF state and code presence
  if (!code || !state || !savedState || state !== savedState) {
    return failRedirect(baseUrl)
  }

  const appId = process.env.WECHAT_APPID
  const secret = process.env.WECHAT_SECRET
  if (!appId || !secret) return failRedirect(baseUrl)

  try {
    // Step 1: exchange code for access_token
    const tokenRes = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token` +
      `?appid=${appId}&secret=${secret}&code=${code}&grant_type=authorization_code`,
    )
    const tokenData = await tokenRes.json()
    if (tokenData.errcode) return failRedirect(baseUrl)

    // Step 2: fetch user info (openid, nickname, headimgurl)
    const userRes = await fetch(
      `https://api.weixin.qq.com/sns/userinfo` +
      `?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`,
    )
    const userData = await userRes.json()
    if (userData.errcode) return failRedirect(baseUrl)

    // Step 3: find or create user in DB
    const user = await findOrCreateWechatUser({
      openid: userData.openid,
      nickname: userData.nickname ?? '',
      avatar: userData.headimgurl ?? '',
    })

    // Step 4: write session cookie and redirect home
    const token = createSessionToken(user.userId)
    const res = NextResponse.redirect(baseUrl)
    res.cookies.delete('wechat_state')
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
    return res
  } catch (err) {
    console.error('wechat callback error:', err)
    return failRedirect(baseUrl)
  }
}
```

- [ ] **Step 2: 运行全部测试（API 路由无 unit test，运行已有测试确认无回归）**

```bash
cd ai-room-designer && npx jest --no-coverage 2>&1 | tail -20
```

预期：全部 pass。

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer && git add app/api/auth/wechat/callback/route.ts
git commit -m "feat: add GET /api/auth/wechat/callback to complete WeChat OAuth"
```

---

## Task 6: 创建 NavBar Server Component

**Files:**
- Create: `ai-room-designer/components/NavBar.tsx`

- [ ] **Step 1: 创建文件**

新建 `ai-room-designer/components/NavBar.tsx`：

```tsx
import { cookies } from 'next/headers'
import { parseSessionToken, getUser } from '@/lib/auth'
import Link from 'next/link'

function maskPhone(phone: string): string {
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

export default async function NavBar() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  const session = token ? parseSessionToken(token) : null
  const user = session ? await getUser(session.userId) : null

  return (
    <nav className="flex items-center px-6 md:px-[120px] h-16 border-b border-gray-900">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">装</div>
        <span className="font-bold text-xl">装AI</span>
      </Link>
      <div className="flex-1" />
      <a href="#examples" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">风格展示</a>
      <a href="#pricing" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">价格</a>
      <a href="#faq" className="text-gray-500 text-sm mr-4 hover:text-gray-300 transition-colors hidden md:block">常见问题</a>
      <Link href="/history" className="text-gray-500 text-sm mr-8 hover:text-gray-300 transition-colors hidden md:block">历史记录</Link>

      {user ? (
        <div className="flex items-center gap-3 mr-6 hidden md:flex">
          {user.wechat_avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.wechat_avatar}
              alt={user.wechat_nickname ?? ''}
              width={24}
              height={24}
              className="rounded-full"
            />
          ) : null}
          <span className="text-gray-400 text-sm">
            {user.wechat_nickname
              ? user.wechat_nickname.slice(0, 8)
              : maskPhone(user.phone ?? '')}
          </span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
              退出
            </button>
          </form>
        </div>
      ) : (
        <Link href="/login" className="text-gray-500 text-sm mr-6 hover:text-gray-300 transition-colors hidden md:block">
          登录/注册
        </Link>
      )}

      <Link
        href="/generate"
        className="bg-amber-500 text-black text-sm font-semibold px-5 h-9 rounded flex items-center hover:bg-amber-400 transition-colors"
      >
        开始体验
      </Link>
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd ai-room-designer && git add components/NavBar.tsx
git commit -m "feat: add NavBar Server Component with login state"
```

---

## Task 7: 首页替换内联 nav 为 NavBar

**Files:**
- Modify: `ai-room-designer/app/page.tsx`

- [ ] **Step 1: 在 page.tsx 顶部添加 NavBar import**

在 `app/page.tsx` 第 1-3 行（import 区域）末尾添加：

```typescript
import NavBar from '@/components/NavBar'
```

- [ ] **Step 2: 替换内联 nav 块**

找到 `app/page.tsx` 中从 `{/* Nav */}` 到第一个 `</nav>` 的整个块（约第 8-23 行），替换为：

```tsx
      <NavBar />
```

- [ ] **Step 3: 检查页面在浏览器中正常渲染**

```bash
cd ai-room-designer && npm run build 2>&1 | tail -30
```

预期：build 成功，无 TypeScript 错误。

- [ ] **Step 4: Commit**

```bash
cd ai-room-designer && git add app/page.tsx
git commit -m "feat: replace home page inline nav with NavBar component"
```

---

## Task 8: 更新登录页——启用微信按钮 + 错误提示

**Files:**
- Modify: `ai-room-designer/app/login/page.tsx`

- [ ] **Step 1: 更新 import，添加 useEffect**

在 `app/login/page.tsx` 第一行，将：

```typescript
import { useState } from 'react'
```

替换为：

```typescript
import { useState, useEffect } from 'react'
```

- [ ] **Step 2: 添加 isWechat 和 authError state，更新 useEffect**

在 `app/login/page.tsx` 中，找到现有的 state 声明（`const [phone, setPhone]` 等），在其后添加：

```typescript
  const [isWechat, setIsWechat] = useState<boolean | undefined>(undefined)
  const [authError, setAuthError] = useState<string | null>(null)
```

找到现有的 `const DEV_MODE = ...` 行之后，整个组件函数体内找到第一个 `return (` 之前，添加 `useEffect`：

```typescript
  useEffect(() => {
    setIsWechat(/MicroMessenger/i.test(navigator.userAgent))
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err) setAuthError(err)
  }, [])
```

- [ ] **Step 3: 在 DEV_MODE banner 之前添加 authError banner**

找到 `app/login/page.tsx` 中 `{DEV_MODE && (` 的位置，在其前面插入：

```tsx
          {authError === 'wechat_failed' && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm">
              微信登录失败，请重试
            </div>
          )}
          {authError === 'wechat_not_configured' && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm">
              微信登录暂未开通
            </div>
          )}
```

- [ ] **Step 4: 替换微信登录按钮**

找到当前被 `disabled` 的微信按钮（`<button disabled ...>微信一键登录（即将上线）</button>`），整体替换为：

```tsx
            {isWechat ? (
              <a
                href="/api/auth/wechat"
                className="w-full h-12 bg-[#07c160] text-white font-bold text-base rounded flex items-center justify-center gap-2 hover:bg-[#06ad56] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.5 3C4.91 3 2 5.69 2 9c0 2.1 1.47 3.93 3.5 4.78.25.1.42.34.42.62 0 .13-.02.26-.08.38l-.4 1.45c-.13.47.32.85.74.61l1.64-.88c.2-.11.42-.16.64-.16.17 0 .34.03.5.08.57.2 1.2.31 1.84.31 3.59 0 6.5-2.69 6.5-6C18 5.69 15.09 3 8.5 3zM5.5 7.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z" />
                </svg>
                微信一键登录
              </a>
            ) : (
              <div
                className="w-full h-12 bg-[#07c160]/30 text-white/40 font-bold text-base rounded flex items-center justify-center gap-2 cursor-not-allowed select-none"
                title="请在微信中打开使用"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.5 3C4.91 3 2 5.69 2 9c0 2.1 1.47 3.93 3.5 4.78.25.1.42.34.42.62 0 .13-.02.26-.08.38l-.4 1.45c-.13.47.32.85.74.61l1.64-.88c.2-.11.42-.16.64-.16.17 0 .34.03.5.08.57.2 1.2.31 1.84.31 3.59 0 6.5-2.69 6.5-6C18 5.69 15.09 3 8.5 3zM5.5 7.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z" />
                </svg>
                微信登录（请在微信中打开）
              </div>
            )}
```

- [ ] **Step 5: Build 确认无错误**

```bash
cd ai-room-designer && npm run build 2>&1 | tail -30
```

预期：build 成功。

- [ ] **Step 6: Commit**

```bash
cd ai-room-designer && git add app/login/page.tsx
git commit -m "feat: enable WeChat login button with UA detection and error display"
```

---

## Task 9: 更新 lib/env.ts，记录微信相关 env 变量

**Files:**
- Modify: `ai-room-designer/lib/env.ts`

- [ ] **Step 1: 添加微信变量说明注释**

在 `lib/env.ts` 末尾追加：

```typescript

/**
 * Optional WeChat environment variables.
 * Required for WeChat login to work in production.
 * Set in .env.local:
 *
 *   WECHAT_APPID=wx1234567890abcdef
 *   WECHAT_SECRET=your_appsecret_here
 *   NEXT_PUBLIC_BASE_URL=https://your-domain.com
 *
 * In WeChat Official Account backend, register the following
 * as the "网页授权域名": your-domain.com (without https://)
 */
export function warnMissingWechatEnv(): void {
  const missing = ['WECHAT_APPID', 'WECHAT_SECRET'].filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.warn(`[warn] WeChat login disabled — missing env vars: ${missing.join(', ')}`)
  }
}
```

- [ ] **Step 2: 运行全部测试**

```bash
cd ai-room-designer && npx jest --no-coverage 2>&1 | tail -20
```

预期：全部 pass。

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer && git add lib/env.ts
git commit -m "docs: document WeChat env vars and add warnMissingWechatEnv helper"
```

---

## 完成验收清单

- [ ] `npx jest --no-coverage` 全部通过
- [ ] `npm run build` 无 TypeScript 错误
- [ ] 在微信内置浏览器打开 `/login`，微信按钮为绿色可点击
- [ ] 在普通浏览器打开 `/login`，微信按钮为灰色不可点击
- [ ] 配置 `WECHAT_APPID` + `WECHAT_SECRET` 后，微信授权完整流程可走通
- [ ] 授权成功后首页 NavBar 显示微信头像 + 昵称
- [ ] 点击「退出」后 NavBar 恢复显示「登录/注册」
- [ ] `/login?error=wechat_failed` 显示红色错误提示
