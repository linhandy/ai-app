# 微信公众号登录 + 统一 NavBar 设计文档

**日期：** 2026-04-14
**范围：** 微信公众号网页授权登录、手机号登录 dev 模式保持不变、全局共用 NavBar

---

## 背景

登录页已有手机号验证码 UI 和后端，但微信登录按钮处于 `disabled` 状态。本次目标：
1. 实现微信公众号网页授权（`snsapi_userinfo`）完整登录流程
2. 非微信浏览器优雅降级
3. 抽取共用 `NavBar` Server Component，显示当前登录用户状态

手机号登录保持现有 dev 模式不变，后续单独接入真实短信。

---

## 数据层

### users 表 migration

在 `lib/auth.ts` 的 `getClient()` 中追加三条 migration：

```sql
ALTER TABLE users ADD COLUMN wechat_openid   TEXT
ALTER TABLE users ADD COLUMN wechat_nickname TEXT
ALTER TABLE users ADD COLUMN wechat_avatar   TEXT
```

- `wechat_openid` 不加数据库层 UNIQUE 约束（SQLite ALTER 不支持），改为在 INSERT 时先 SELECT 去重
- `phone` 列改为允许 NULL（微信用户无手机号），`CREATE TABLE` 语句中去掉 `NOT NULL`
- 现有手机号用户三列均为 NULL，行为不变

### `lib/auth.ts` 新增函数

```typescript
export async function findOrCreateWechatUser(params: {
  openid: string
  nickname: string
  avatar: string
}): Promise<{ userId: string; openid: string; nickname: string; avatar: string }>
```

逻辑：
1. `SELECT id FROM users WHERE wechat_openid = ?`
2. 找到 → `UPDATE wechat_nickname, wechat_avatar` → 返回
3. 找不到 → `INSERT` 新用户（id = `usr_` + 8 bytes hex，phone = NULL）→ 返回

---

## API 层

### `GET /api/auth/wechat`

发起微信授权。

1. 生成 `state = crypto.randomBytes(16).toString('hex')`
2. 将 state 写入 httpOnly cookie `wechat_state`，maxAge = 300s（5分钟）
3. 读取 `WECHAT_APPID` 和 `NEXT_PUBLIC_BASE_URL`（或从 `Host` header 推断）
4. 302 跳转：

```
https://open.weixin.qq.com/connect/oauth2/authorize
  ?appid={WECHAT_APPID}
  &redirect_uri={encodeURIComponent(BASE_URL + '/api/auth/wechat/callback')}
  &response_type=code
  &scope=snsapi_userinfo
  &state={state}
  #wechat_redirect
```

错误：`WECHAT_APPID` 未配置时返回 302 → `/login?error=wechat_not_configured`

### `GET /api/auth/wechat/callback`

处理微信回调。Query params：`code`、`state`。

1. 读取 cookie `wechat_state`，与 query `state` 比对；不一致 → 302 `/login?error=wechat_failed`
2. 清除 `wechat_state` cookie
3. 请求微信 access_token：
   ```
   GET https://api.weixin.qq.com/sns/oauth2/access_token
     ?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
   ```
   响应含 `errcode` → 302 `/login?error=wechat_failed`
4. 请求用户信息：
   ```
   GET https://api.weixin.qq.com/sns/userinfo
     ?access_token=TOKEN&openid=OPENID&lang=zh_CN
   ```
   响应含 `errcode` → 302 `/login?error=wechat_failed`
5. 调 `findOrCreateWechatUser({ openid, nickname, headimgurl })`
6. 调 `createSessionToken(userId)`，写 `auth_token` cookie（httpOnly, 7天）
7. 302 跳回：读取 `redirect` query param（白名单：只允许同站相对路径），默认跳 `/`

---

## UI 层

### 登录页 `app/login/page.tsx`

- 新增 `useEffect` 检测 `navigator.userAgent.includes('MicroMessenger')`，设置 `isWechat` state
- 微信按钮：
  - `isWechat === true`：`<a href="/api/auth/wechat">` 绿色按钮，正常可点
  - `isWechat === false`：灰色按钮，`cursor-not-allowed`，hover tooltip「请在微信中打开使用」
  - `isWechat === undefined`（SSR/初始）：灰色，避免 hydration mismatch
- URL 含 `?error=wechat_failed` 时，表单上方显示红色 banner「微信登录失败，请重试」
- URL 含 `?error=wechat_not_configured` 时，显示「微信登录暂未开通」

### 共用 NavBar — `components/NavBar.tsx`

Server Component，内部调用 `cookies()` 读取 `auth_token`，解析用户。

Props：无（直接读 cookie）

渲染逻辑：

```
未登录：
  [风格展示] [价格] [常见问题] [历史记录]  [登录/注册]  [开始体验]

已登录（手机号）：
  [风格展示] [价格] [常见问题] [历史记录]  158****8888  [退出]  [开始体验]

已登录（微信）：
  [风格展示] [价格] [常见问题] [历史记录]  <头像> 昵称(≤8字)  [退出]  [开始体验]
```

- 头像：`<img>` 圆形 24px，src 为微信头像 URL（外部域名，需在 `next.config.mjs` 加 `remotePatterns`）
- 手机号脱敏：`158****8888`（前3位 + `****` + 后4位）
- 「退出」：`<form action="/api/auth/logout" method="POST">` 提交按钮，退出后跳首页

### 各页面改造

移除 `app/page.tsx`、`app/generate/page.tsx`、`app/history/page.tsx`、`app/result/[orderId]/page.tsx` 中内联的 `<nav>` 块，改为引入 `<NavBar />`。

`app/layout.tsx` **不**引入 NavBar（各页面布局不同，generate 页的 Nav 内容也不同，保持各页面自行引入）。

---

## 环境变量

新增到 `lib/env.ts` 的可选检查（仅在非 dev 模式下报错）：

```
WECHAT_APPID      # 公众号 AppID
WECHAT_SECRET     # 公众号 AppSecret
NEXT_PUBLIC_BASE_URL  # 部署域名，如 https://zhuangai.com（用于构造回调 URL）
```

公众号后台需配置：**网页授权域名** → 填部署域名（不含 `https://`）

---

## 不在本次范围内

- 手机号接入真实短信（保持 dev 模式）
- 微信与手机号账号合并
- 订单关联用户（userId 写入 orders 表）
- 微信开放平台扫码登录（PC 网页）
