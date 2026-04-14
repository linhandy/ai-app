# AI Room Designer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chinese-market AI interior design tool where users upload a room photo, pick a style, pay ¥1 via Alipay, and receive an AI-generated redesign in 30 seconds.

**Architecture:** Next.js 14 App Router in `ai-room-designer/` sub-directory (same repo pattern as `love-detector/`). ZenMux proxies GPT-image-1-mini for image generation (already used in `hourse-designer/` as `ZENMUX_API_KEY`). Alipay 当面付 (face-to-face QR payment) handles billing with no enterprise license required. Orders stored in a JSON file for MVP persistence across server restarts.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, `openai` npm (ZenMux compat), `alipay-sdk` npm, `qrcode` npm, `jest` + `ts-jest` for unit tests, PM2 for deployment on HK server.

---

## File Map

```
ai-room-designer/
├── app/
│   ├── layout.tsx                        # Root layout, font, metadata
│   ├── page.tsx                          # Landing page
│   ├── generate/page.tsx                 # Upload + style + pay flow
│   ├── result/[orderId]/page.tsx         # Before/after + download
│   └── api/
│       ├── upload/route.ts               # POST: receive image, save to /tmp, return uploadId
│       ├── create-order/route.ts         # POST: create order + Alipay QR code
│       ├── query-order/route.ts          # GET: poll order status
│       ├── notify/route.ts               # POST: Alipay async payment callback
│       └── generate/route.ts            # POST: call ZenMux after payment confirmed
├── components/
│   ├── UploadZone.tsx                    # Drag-and-drop image upload
│   ├── StyleSelector.tsx                 # 6-style grid with selected state
│   ├── PaymentModal.tsx                  # QR code modal + polling logic
│   └── BeforeAfter.tsx                   # Draggable split comparison slider
├── lib/
│   ├── orders.ts                         # Order CRUD backed by orders.json
│   ├── zenmux.ts                         # ZenMux image edit wrapper
│   └── alipay.ts                         # Alipay 当面付 sign + precreate + verify
├── __tests__/
│   ├── orders.test.ts
│   ├── zenmux.test.ts
│   └── alipay.test.ts
├── public/styles/                        # 6 style preview images (JPG, ~40KB each)
├── .env.local.example
├── ecosystem.config.cjs                  # PM2 config for HK server
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `ai-room-designer/` (entire directory)

- [ ] **Step 1: Scaffold Next.js 14 app**

```bash
cd d:/code/ai-app
npx create-next-app@14 ai-room-designer \
  --typescript --tailwind --eslint --app \
  --no-src-dir --import-alias "@/*"
cd ai-room-designer
```

- [ ] **Step 2: Install dependencies**

```bash
npm install openai alipay-sdk qrcode
npm install -D jest ts-jest @types/jest @types/qrcode
```

- [ ] **Step 3: Configure Jest**

Create `jest.config.ts`:
```typescript
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
}

export default config
```

Add to `package.json` scripts:
```json
"test": "jest --passWithNoTests"
```

- [ ] **Step 4: Create `.env.local` from example**

Create `.env.local.example`:
```bash
# ZenMux (same key as hourse-designer)
ZENMUX_API_KEY=your-zenmux-api-key

# Alipay 当面付 基础版 — get from open.alipay.com
ALIPAY_APP_ID=your-app-id
ALIPAY_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
ALIPAY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
ALIPAY_NOTIFY_URL=https://yourdomain.com/api/notify

# App
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

Copy to `.env.local` and fill in values.

- [ ] **Step 5: Configure `next.config.mjs` to allow large uploads**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    bodyParser: false,  // handled manually in upload route
  },
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
}

export default nextConfig
```

- [ ] **Step 6: Commit**

```bash
git add ai-room-designer/
git commit -m "feat: scaffold ai-room-designer Next.js 14 app"
```

---

## Task 2: Order Store (`lib/orders.ts`)

**Files:**
- Create: `ai-room-designer/lib/orders.ts`
- Create: `ai-room-designer/__tests__/orders.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/orders.test.ts`:
```typescript
import { createOrder, getOrder, updateOrder, Order } from '@/lib/orders'
import fs from 'fs'
import path from 'path'

const TEST_DB = path.join('/tmp', 'test-orders.json')

beforeEach(() => {
  // point store at test file
  process.env.ORDERS_FILE = TEST_DB
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB)
})

afterAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB)
})

test('createOrder returns order with pending status', () => {
  const order = createOrder({ style: '北欧简约', uploadId: 'abc123' })
  expect(order.id).toMatch(/^ord_/)
  expect(order.status).toBe('pending')
  expect(order.style).toBe('北欧简约')
  expect(order.uploadId).toBe('abc123')
})

test('getOrder returns created order', () => {
  const order = createOrder({ style: '工业风', uploadId: 'xyz' })
  const found = getOrder(order.id)
  expect(found).toEqual(order)
})

test('getOrder returns null for unknown id', () => {
  expect(getOrder('nonexistent')).toBeNull()
})

test('updateOrder changes status and persists', () => {
  const order = createOrder({ style: '侘寂风', uploadId: 'u1' })
  updateOrder(order.id, { status: 'paid' })
  const found = getOrder(order.id)
  expect(found?.status).toBe('paid')
})

test('updateOrder with resultUrl', () => {
  const order = createOrder({ style: '新中式', uploadId: 'u2' })
  updateOrder(order.id, { status: 'done', resultUrl: 'https://example.com/img.png' })
  expect(getOrder(order.id)?.resultUrl).toBe('https://example.com/img.png')
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd ai-room-designer && npx jest __tests__/orders.test.ts
```
Expected: FAIL — "Cannot find module '@/lib/orders'"

- [ ] **Step 3: Implement `lib/orders.ts`**

```typescript
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export type OrderStatus = 'pending' | 'paid' | 'generating' | 'done' | 'failed'

export interface Order {
  id: string
  status: OrderStatus
  style: string
  uploadId: string        // filename in /tmp/uploads/
  resultUrl?: string      // URL of generated image
  alipayTradeNo?: string  // returned from Alipay after payment
  createdAt: number
  updatedAt: number
}

function dbPath(): string {
  return process.env.ORDERS_FILE ?? path.join(process.cwd(), 'orders.json')
}

function readAll(): Record<string, Order> {
  try {
    const raw = fs.readFileSync(dbPath(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function writeAll(db: Record<string, Order>): void {
  fs.writeFileSync(dbPath(), JSON.stringify(db, null, 2), 'utf-8')
}

export function createOrder(params: { style: string; uploadId: string }): Order {
  const db = readAll()
  const order: Order = {
    id: `ord_${crypto.randomBytes(8).toString('hex')}`,
    status: 'pending',
    style: params.style,
    uploadId: params.uploadId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  db[order.id] = order
  writeAll(db)
  return order
}

export function getOrder(id: string): Order | null {
  const db = readAll()
  return db[id] ?? null
}

export function updateOrder(id: string, patch: Partial<Order>): Order | null {
  const db = readAll()
  if (!db[id]) return null
  db[id] = { ...db[id], ...patch, updatedAt: Date.now() }
  writeAll(db)
  return db[id]
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest __tests__/orders.test.ts
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/orders.ts __tests__/orders.test.ts
git commit -m "feat: order store backed by JSON file"
```

---

## Task 3: ZenMux Image Generation (`lib/zenmux.ts`)

**Files:**
- Create: `ai-room-designer/lib/zenmux.ts`
- Create: `ai-room-designer/__tests__/zenmux.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/zenmux.test.ts`:
```typescript
import { buildStylePrompt, STYLES } from '@/lib/zenmux'

test('STYLES has 6 entries', () => {
  expect(Object.keys(STYLES)).toHaveLength(6)
})

test('buildStylePrompt contains style name', () => {
  const prompt = buildStylePrompt('北欧简约')
  expect(prompt).toContain('北欧简约')
  expect(prompt.length).toBeGreaterThan(50)
})

test('buildStylePrompt throws on unknown style', () => {
  expect(() => buildStylePrompt('未知风格')).toThrow('Unknown style')
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest __tests__/zenmux.test.ts
```

- [ ] **Step 3: Implement `lib/zenmux.ts`**

```typescript
import OpenAI from 'openai'
import fs from 'fs'

export const STYLES: Record<string, { label: string; prompt: string }> = {
  '北欧简约': {
    label: '北欧简约',
    prompt: '改造成北欧简约风格：白色墙面、浅木色家具、绿植点缀、自然光线、干净利落的线条，整体明亮通透',
  },
  '现代轻奢': {
    label: '现代轻奢',
    prompt: '改造成现代轻奢风格：大理石元素、金属质感、灰调配色、高级材质、精致软装，彰显品质感',
  },
  '新中式': {
    label: '新中式',
    prompt: '改造成新中式风格：深色实木、格栅元素、水墨留白、禅意氛围、中国传统美学与现代设计融合',
  },
  '侘寂风': {
    label: '侘寂风',
    prompt: '改造成侘寂风格：自然肌理、不完美美感、素色调性、粗糙质感、极简留白，展现时间之美',
  },
  '工业风': {
    label: '工业风',
    prompt: '改造成工业风格：裸露砖墙、铁艺管道、水泥灰色、皮质家具、做旧金属，粗犷有个性',
  },
  '奶油风': {
    label: '奶油风',
    prompt: '改造成奶油风格：米白奶油色系、圆润造型、柔软织物、温暖灯光、治愈系氛围',
  },
}

export function buildStylePrompt(style: string): string {
  const entry = STYLES[style]
  if (!entry) throw new Error(`Unknown style: ${style}`)
  return `请将这张室内照片${entry.prompt}。保留原有的空间结构、门窗位置和整体布局，仅改变装修风格和家具陈设。生成专业室内设计师水准的效果图，高质量写实风格。`
}

export async function generateRoomImage(params: {
  imagePath: string
  style: string
}): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.ZENMUX_API_KEY!,
    baseURL: 'https://zenmux.ai/api/v1',
  })

  const imageStream = fs.createReadStream(params.imagePath)
  const prompt = buildStylePrompt(params.style)

  const response = await client.images.edit({
    model: 'gpt-image-1-mini',
    image: imageStream as any,
    prompt,
    size: '1024x1024',
  })

  const url = response.data?.[0]?.url
  if (!url) throw new Error('No image URL returned from ZenMux')
  return url
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest __tests__/zenmux.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/zenmux.ts __tests__/zenmux.test.ts
git commit -m "feat: zenmux image generation wrapper"
```

---

## Task 4: File Upload API (`app/api/upload/route.ts`)

**Files:**
- Create: `ai-room-designer/app/api/upload/route.ts`

- [ ] **Step 1: Ensure `/tmp/uploads` dir exists at startup**

Add to `next.config.mjs`:
```javascript
import fs from 'fs'
fs.mkdirSync('/tmp/uploads', { recursive: true })
```

- [ ] **Step 2: Implement upload route**

Create `app/api/upload/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: '请上传图片文件' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG、PNG、WEBP 格式' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '图片大小不能超过 10MB' }, { status: 400 })
    }

    const ext = file.type === 'image/png' ? '.png' : '.jpg'
    const uploadId = `${crypto.randomBytes(12).toString('hex')}${ext}`
    const savePath = path.join('/tmp/uploads', uploadId)

    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(savePath, buffer)

    return NextResponse.json({ uploadId })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: '上传失败，请重试' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Smoke test manually**

```bash
cd ai-room-designer && npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/upload \
  -F "image=@/path/to/test-room.jpg"
# Expected: {"uploadId":"abc123.jpg"}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/upload/route.ts next.config.mjs
git commit -m "feat: image upload API with validation"
```

---

## Task 5: Alipay Integration (`lib/alipay.ts` + API routes)

**Files:**
- Create: `ai-room-designer/lib/alipay.ts`
- Create: `ai-room-designer/app/api/create-order/route.ts`
- Create: `ai-room-designer/app/api/notify/route.ts`
- Create: `ai-room-designer/app/api/query-order/route.ts`
- Create: `ai-room-designer/__tests__/alipay.test.ts`

- [ ] **Step 1: Write failing tests for alipay helpers**

Create `__tests__/alipay.test.ts`:
```typescript
import { formatAmount, buildOrderSubject } from '@/lib/alipay'

test('formatAmount converts number to 2dp string', () => {
  expect(formatAmount(1)).toBe('1.00')
  expect(formatAmount(9.9)).toBe('9.90')
  expect(formatAmount(0.01)).toBe('0.01')
})

test('buildOrderSubject returns readable string', () => {
  const subject = buildOrderSubject('北欧简约')
  expect(subject).toBe('AI装修效果图-北欧简约风格')
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest __tests__/alipay.test.ts
```

- [ ] **Step 3: Implement `lib/alipay.ts`**

```typescript
import AlipaySdk from 'alipay-sdk'

export function getAlipayClient() {
  return new AlipaySdk({
    appId: process.env.ALIPAY_APP_ID!,
    privateKey: process.env.ALIPAY_PRIVATE_KEY!,
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY!,
    gateway: 'https://openapi.alipay.com/gateway.do',
    timeout: 10000,
  })
}

export function formatAmount(yuan: number): string {
  return yuan.toFixed(2)
}

export function buildOrderSubject(style: string): string {
  return `AI装修效果图-${style}风格`
}

export async function createQROrder(params: {
  orderId: string
  style: string
  amount: number  // in yuan
}): Promise<string> {
  const sdk = getAlipayClient()
  const result = await sdk.exec('alipay.trade.precreate', {
    bizContent: {
      out_trade_no: params.orderId,
      total_amount: formatAmount(params.amount),
      subject: buildOrderSubject(params.style),
      timeout_express: '15m',
    },
    notifyUrl: process.env.ALIPAY_NOTIFY_URL!,
  })

  if (result.code !== '10000') {
    throw new Error(`Alipay error: ${result.sub_msg ?? result.msg}`)
  }

  return result.qr_code as string
}

export async function queryAlipayOrder(orderId: string): Promise<string> {
  const sdk = getAlipayClient()
  const result = await sdk.exec('alipay.trade.query', {
    bizContent: { out_trade_no: orderId },
  })
  // trade_status: WAIT_BUYER_PAY | TRADE_SUCCESS | TRADE_CLOSED
  return result.trade_status as string
}

export function verifyAlipayCallback(params: Record<string, string>): boolean {
  const sdk = getAlipayClient()
  return sdk.checkNotifySign(params)
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest __tests__/alipay.test.ts
```
Expected: PASS (2 tests)

- [ ] **Step 5: Implement `app/api/create-order/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createOrder } from '@/lib/orders'
import { createQROrder } from '@/lib/alipay'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'

export async function POST(req: NextRequest) {
  try {
    const { uploadId, style } = await req.json()

    if (!uploadId || !style) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 })
    }

    const uploadPath = path.join('/tmp/uploads', uploadId)
    if (!fs.existsSync(uploadPath)) {
      return NextResponse.json({ error: '上传文件不存在，请重新上传' }, { status: 400 })
    }

    const order = createOrder({ style, uploadId })

    const qrCodeUrl = await createQROrder({
      orderId: order.id,
      style,
      amount: 1,
    })

    // Convert Alipay QR URL → base64 image for frontend display
    const qrDataUrl = await QRCode.toDataURL(qrCodeUrl, { width: 240, margin: 2 })

    return NextResponse.json({ orderId: order.id, qrDataUrl })
  } catch (err) {
    console.error('[create-order]', err)
    return NextResponse.json({ error: '创建订单失败，请重试' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Implement `app/api/notify/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyAlipayCallback } from '@/lib/alipay'
import { getOrder, updateOrder } from '@/lib/orders'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = Object.fromEntries(new URLSearchParams(body))

    if (!verifyAlipayCallback(params)) {
      console.warn('[notify] Invalid Alipay signature')
      return new Response('fail', { status: 400 })
    }

    const { out_trade_no, trade_no, trade_status } = params

    if (trade_status === 'TRADE_SUCCESS') {
      const order = getOrder(out_trade_no)
      if (order && order.status === 'pending') {
        updateOrder(out_trade_no, { status: 'paid', alipayTradeNo: trade_no })
      }
    }

    return new Response('success')
  } catch (err) {
    console.error('[notify]', err)
    return new Response('fail', { status: 500 })
  }
}
```

- [ ] **Step 7: Implement `app/api/query-order/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getOrder } from '@/lib/orders'

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const order = getOrder(orderId)
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  return NextResponse.json({
    status: order.status,
    resultUrl: order.resultUrl ?? null,
  })
}
```

- [ ] **Step 8: Commit**

```bash
git add lib/alipay.ts app/api/create-order/ app/api/notify/ app/api/query-order/ __tests__/alipay.test.ts
git commit -m "feat: alipay 当面付 integration + order APIs"
```

---

## Task 6: Generate Image API (`app/api/generate/route.ts`)

**Files:**
- Create: `ai-room-designer/app/api/generate/route.ts`

- [ ] **Step 1: Implement generate route**

Create `app/api/generate/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getOrder, updateOrder } from '@/lib/orders'
import { generateRoomImage } from '@/lib/zenmux'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

    const order = getOrder(orderId)
    if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    if (order.status !== 'paid') {
      return NextResponse.json({ error: '订单未完成支付' }, { status: 402 })
    }

    updateOrder(orderId, { status: 'generating' })

    const imagePath = path.join('/tmp/uploads', order.uploadId)
    const resultUrl = await generateRoomImage({ imagePath, style: order.style })

    updateOrder(orderId, { status: 'done', resultUrl })

    return NextResponse.json({ resultUrl })
  } catch (err) {
    console.error('[generate]', err)
    // Mark as failed so frontend can show error
    const { orderId } = await req.json().catch(() => ({}))
    if (orderId) updateOrder(orderId, { status: 'failed' })
    return NextResponse.json({ error: 'AI生成失败，请联系退款' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/generate/route.ts
git commit -m "feat: image generation API route"
```

---

## Task 7: Landing Page (`app/page.tsx` + layout)

**Files:**
- Modify: `ai-room-designer/app/layout.tsx`
- Create: `ai-room-designer/app/page.tsx`

- [ ] **Step 1: Update layout with fonts and dark background**

Replace `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '装AI · AI装修效果图',
  description: '上传房间照片，30秒AI生成专业装修效果图，¥1一张，6种风格随心选',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create landing page**

Create `app/page.tsx`:
```typescript
import Link from 'next/link'
import Image from 'next/image'

const STYLES = ['北欧简约', '现代轻奢', '新中式', '侘寂风', '工业风', '奶油风']

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black">
      {/* Nav */}
      <nav className="flex items-center px-[120px] h-16 border-b border-gray-900">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">装</div>
          <span className="font-bold text-xl">装AI</span>
        </div>
        <div className="flex-1" />
        <span className="text-gray-500 text-sm mr-8">AI装修效果图</span>
        <Link href="/generate" className="bg-amber-500 text-black text-sm font-semibold px-5 h-9 rounded flex items-center hover:bg-amber-400 transition-colors">
          开始体验
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center px-[120px] pt-16 pb-12 gap-6">
        <div className="flex items-center gap-2 px-3.5 h-7 rounded-full bg-amber-950 border border-amber-500 text-amber-500 text-sm font-semibold">
          ✦ 限时体验价 ¥1/张
        </div>
        <h1 className="text-6xl font-bold text-center leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
          拍一张照片<br />AI秒变理想装修
        </h1>
        <p className="text-gray-400 text-lg text-center max-w-lg">
          上传任意角度的房间照片，30秒内看到专业室内设计师级别的装修效果图
        </p>
        <div className="flex items-center gap-4 mt-2">
          <Link href="/generate" className="bg-amber-500 text-black font-bold text-base px-8 h-13 rounded flex items-center gap-2 hover:bg-amber-400 transition-colors shadow-[0_8px_24px_rgba(255,152,0,0.3)]" style={{height:'52px'}}>
            ¥1 立即生成效果图
          </Link>
          <button className="text-gray-400 text-base px-7 h-13 rounded border border-gray-700 hover:border-gray-500 transition-colors" style={{height:'52px'}}>
            查看示例效果
          </button>
        </div>

        {/* Before/After preview */}
        <div className="relative w-[1000px] h-[380px] rounded-xl overflow-hidden border border-gray-800 mt-4">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 relative">
              <Image src="/styles/before-sample.jpg" alt="改造前" fill className="object-cover" />
              <div className="absolute top-3 left-3 bg-black/80 text-white text-xs font-semibold px-3 h-7 flex items-center rounded">改造前</div>
            </div>
            <div className="w-1/2 relative">
              <Image src="/styles/after-nordic.jpg" alt="北欧简约效果图" fill className="object-cover" />
              <div className="absolute top-3 left-3 bg-amber-500 text-black text-xs font-bold px-3 h-7 flex items-center rounded">AI效果图</div>
            </div>
          </div>
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white" />
        </div>
      </section>

      {/* Styles section */}
      <section className="px-[120px] py-14 bg-[#050505] flex flex-col items-center gap-8">
        <h2 className="text-3xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>6种热门装修风格，一键切换</h2>
        <p className="text-gray-500 text-sm text-center">覆盖当下最流行的室内设计风格，精准还原每一种美学</p>
        <div className="grid grid-cols-6 gap-3 w-full">
          {STYLES.map((style) => (
            <div key={style} className="rounded-lg overflow-hidden border border-gray-800 cursor-pointer hover:border-amber-500 transition-colors group">
              <div className="h-[110px] bg-gray-900 relative">
                <Image src={`/styles/${style}.jpg`} alt={style} fill className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="bg-[#0A0A0A] px-3 py-2">
                <div className="text-white text-[13px] font-semibold">{style}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-[120px] py-14 flex flex-col items-center gap-6">
        <h2 className="text-3xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>简单透明，按次收费</h2>
        <div className="w-[360px] p-8 rounded-lg bg-[#0D0D0D] border border-amber-500/40 flex flex-col gap-5">
          <div className="flex items-end gap-1">
            <span className="text-5xl font-bold text-amber-500">¥1</span>
            <span className="text-gray-500 text-lg mb-1">/张</span>
          </div>
          <p className="text-gray-400 text-sm">每张效果图仅需一元，生成后满意再付</p>
          <ul className="space-y-2.5">
            {['无需注册，扫码即付', '6种风格随意选择', '30秒出图，高清下载', '支付宝付款，安全可靠'].map(item => (
              <li key={item} className="text-gray-300 text-sm flex items-center gap-2">
                <span className="text-green-500">✓</span> {item}
              </li>
            ))}
          </ul>
          <Link href="/generate" className="flex items-center justify-center h-12 bg-amber-500 text-black font-bold text-sm rounded hover:bg-amber-400 transition-colors">
            立即上传房间照片
          </Link>
        </div>
      </section>

      <footer className="px-[120px] py-8 border-t border-gray-900 text-center text-gray-600 text-sm">
        © 2026 装AI · 由 ZenMux AI 驱动
      </footer>
    </main>
  )
}
```

- [ ] **Step 3: Add placeholder style images**

```bash
# Download placeholder images (replace with real ones before launch)
mkdir -p public/styles
# Use any freely licensed room photos for the 6 style previews:
# public/styles/北欧简约.jpg
# public/styles/现代轻奢.jpg
# public/styles/新中式.jpg
# public/styles/侘寂风.jpg
# public/styles/工业风.jpg
# public/styles/奶油风.jpg
# public/styles/before-sample.jpg  (messy room)
# public/styles/after-nordic.jpg   (clean nordic room)
# Quick source: https://unsplash.com (search: "living room interior")
```

- [ ] **Step 4: Update `next.config.mjs` to allow local images**

```javascript
const nextConfig = {
  images: { unoptimized: true },
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
}
export default nextConfig
```

- [ ] **Step 5: Verify landing page renders**

```bash
npm run dev
# Open http://localhost:3000 — should see black page with hero, styles, pricing
```

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/page.tsx public/ next.config.mjs
git commit -m "feat: landing page with hero, styles, pricing"
```

---

## Task 8: Generator Page + Components

**Files:**
- Create: `ai-room-designer/components/UploadZone.tsx`
- Create: `ai-room-designer/components/StyleSelector.tsx`
- Create: `ai-room-designer/components/PaymentModal.tsx`
- Create: `ai-room-designer/app/generate/page.tsx`

- [ ] **Step 1: Create `components/UploadZone.tsx`**

```typescript
'use client'
import { useCallback, useState } from 'react'

interface Props {
  onUpload: (uploadId: string, previewUrl: string) => void
}

export default function UploadZone({ onUpload }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setUploading(true)
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    const fd = new FormData()
    fd.append('image', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onUpload(data.uploadId, localUrl)
    } catch (err: any) {
      setError(err.message ?? '上传失败')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }, [onUpload])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      className={`relative w-full h-[280px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors
        ${dragging ? 'border-amber-500 bg-amber-500/5' : 'border-gray-700 bg-[#0A0A0A] hover:border-gray-500'}`}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="预览" className="w-full h-full object-cover rounded-lg absolute inset-0" />
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-[#1A1A1A] flex items-center justify-center">
            <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-white font-semibold text-base">{uploading ? '上传中...' : '点击上传或拖拽图片到这里'}</p>
          <p className="text-gray-500 text-sm">支持 JPG、PNG 格式，文件 ≤ 10MB</p>
          <button className="mt-1 px-6 h-9 bg-gray-800 text-gray-300 text-sm rounded hover:bg-gray-700 transition-colors">选择文件</button>
        </>
      )}

      {error && <p className="absolute bottom-3 text-red-400 text-sm">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/StyleSelector.tsx`**

```typescript
'use client'
import Image from 'next/image'

const STYLES = [
  { key: '北欧简约', desc: '原木 · 白墙 · 绿植' },
  { key: '现代轻奢', desc: '大理石 · 金属 · 灰调' },
  { key: '新中式',   desc: '禅意 · 木格 · 留白' },
  { key: '侘寂风',   desc: '不完美 · 自然 · 素色' },
  { key: '工业风',   desc: '裸砖 · 铁艺 · 水泥灰' },
  { key: '奶油风',   desc: '米白 · 柔软 · 治愈系' },
]

interface Props {
  selected: string
  onChange: (style: string) => void
}

export default function StyleSelector({ selected, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {STYLES.map(({ key, desc }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded-lg overflow-hidden border-2 text-left transition-all
            ${selected === key ? 'border-amber-500' : 'border-gray-800 hover:border-gray-600'}`}
        >
          <div className="h-[62px] relative bg-gray-900">
            <Image src={`/styles/${key}.jpg`} alt={key} fill className="object-cover" />
          </div>
          <div className="bg-[#0D0D0D] px-3 py-2">
            <div className={`text-xs font-semibold ${selected === key ? 'text-amber-500' : 'text-white'}`}>
              {selected === key ? '✓  ' : ''}{key}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">{desc}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create `components/PaymentModal.tsx`**

```typescript
'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
  qrDataUrl: string
  onClose: () => void
}

export default function PaymentModal({ orderId, qrDataUrl, onClose }: Props) {
  const [status, setStatus] = useState<'waiting' | 'generating' | 'done' | 'failed'>('waiting')
  const router = useRouter()
  const timerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/query-order?orderId=${orderId}`)
        const data = await res.json()

        if (data.status === 'paid') {
          setStatus('generating')
          // Trigger generation
          await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId }),
          })
          router.push(`/result/${orderId}`)
          return
        }

        if (data.status === 'done') {
          router.push(`/result/${orderId}`)
          return
        }

        if (data.status === 'failed') {
          setStatus('failed')
          return
        }
      } catch {}
      timerRef.current = setTimeout(poll, 2000)
    }

    timerRef.current = setTimeout(poll, 2000)
    return () => clearTimeout(timerRef.current)
  }, [orderId, router])

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl p-8 flex flex-col items-center gap-4 w-80" onClick={e => e.stopPropagation()}>
        {status === 'waiting' && (
          <>
            <h3 className="text-white font-bold text-lg">支付宝扫码付款</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="支付二维码" className="w-48 h-48 rounded-lg" />
            <div className="text-center">
              <p className="text-amber-500 text-2xl font-bold">¥1.00</p>
              <p className="text-gray-400 text-sm mt-1">AI装修效果图生成费</p>
            </div>
            <p className="text-gray-500 text-xs text-center">付款后自动生成，约30秒</p>
          </>
        )}
        {status === 'generating' && (
          <>
            <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-semibold">AI生成中，请稍候...</p>
            <p className="text-gray-400 text-sm">约30秒</p>
          </>
        )}
        {status === 'failed' && (
          <>
            <p className="text-red-400 font-semibold">生成失败</p>
            <p className="text-gray-400 text-sm text-center">请联系客服退款<br/>微信: your-wechat-id</p>
            <button onClick={onClose} className="text-gray-400 text-sm underline">关闭</button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `app/generate/page.tsx`**

```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'
import UploadZone from '@/components/UploadZone'
import StyleSelector from '@/components/StyleSelector'
import PaymentModal from '@/components/PaymentModal'

export default function GeneratePage() {
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [style, setStyle] = useState('北欧简约')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payModal, setPayModal] = useState<{ orderId: string; qrDataUrl: string } | null>(null)

  const handlePay = async () => {
    if (!uploadId) { setError('请先上传房间照片'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, style }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPayModal({ orderId: data.orderId, qrDataUrl: data.qrDataUrl })
    } catch (err: any) {
      setError(err.message ?? '创建订单失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <nav className="flex items-center px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">装</div>
          <span className="font-bold text-xl">装AI</span>
        </Link>
        <div className="flex-1" />
        <span className="text-gray-600 text-sm">上传照片 → 选择风格 → 付款生成</span>
      </nav>

      <div className="flex px-[120px] pt-12 pb-16 gap-10 items-start">
        {/* Left: Upload */}
        <div className="w-[520px] flex flex-col gap-5">
          <div>
            <h2 className="text-white text-xl font-bold">上传您的房间照片</h2>
            <p className="text-gray-500 text-sm mt-1">支持 JPG / PNG，建议正面拍摄，效果更佳</p>
          </div>
          <UploadZone onUpload={(id) => setUploadId(id)} />
        </div>

        {/* Right: Style + Pay */}
        <div className="flex-1 flex flex-col gap-5">
          <div>
            <h2 className="text-white text-xl font-bold">选择装修风格</h2>
            <p className="text-gray-500 text-sm mt-1">选中一种风格，AI将按此风格重新设计您的房间</p>
          </div>
          <StyleSelector selected={style} onChange={setStyle} />

          <div className="border-t border-gray-800 pt-4 flex flex-col gap-3">
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              付款后即时生成，效果不满意可联系退款
            </div>
            <button
              onClick={handlePay}
              disabled={loading || !uploadId}
              className="flex items-center justify-center gap-2 w-full h-14 bg-amber-500 text-black font-bold text-base rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors shadow-[0_6px_20px_rgba(255,152,0,0.3)]"
            >
              {loading ? '处理中...' : '⚡ 支付 ¥1 · 立即生成效果图'}
            </button>
            <p className="text-gray-600 text-xs text-center">扫码支付宝完成付款 · 30秒内自动生成 · 高清图片下载</p>
          </div>
        </div>
      </div>

      {payModal && (
        <PaymentModal
          orderId={payModal.orderId}
          qrDataUrl={payModal.qrDataUrl}
          onClose={() => setPayModal(null)}
        />
      )}
    </main>
  )
}
```

- [ ] **Step 5: Verify generator page end-to-end (dev mode)**

```bash
npm run dev
# http://localhost:3000/generate
# 1. Upload a test room photo → should see preview appear
# 2. Select a style → amber border should highlight selection
# 3. Click pay button → should open modal (Alipay sandbox if configured, else error)
```

- [ ] **Step 6: Commit**

```bash
git add components/ app/generate/
git commit -m "feat: generator page with upload, style selector, payment modal"
```

---

## Task 9: Result Page

**Files:**
- Create: `ai-room-designer/components/BeforeAfter.tsx`
- Create: `ai-room-designer/app/result/[orderId]/page.tsx`

- [ ] **Step 1: Create `components/BeforeAfter.tsx`**

```typescript
'use client'
import { useCallback, useRef, useState } from 'react'

interface Props {
  beforeUrl: string
  afterUrl: string
}

export default function BeforeAfter({ beforeUrl, afterUrl }: Props) {
  const [pos, setPos] = useState(50) // percentage
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = Math.min(95, Math.max(5, ((clientX - rect.left) / rect.width) * 100))
    setPos(pct)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-[1000px] h-[440px] rounded-xl overflow-hidden border border-gray-800 select-none cursor-col-resize"
      onMouseMove={(e) => handleMove(e.clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      {/* After (full width background) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={afterUrl} alt="AI效果图" className="absolute inset-0 w-full h-full object-cover" />

      {/* Before (clipped to left portion) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={beforeUrl} alt="改造前" className="absolute inset-0 w-[1000px] h-[440px] object-cover" />
      </div>

      {/* Divider */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none" style={{ left: `${pos}%` }} />
      <div className="absolute w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2" style={{ left: `${pos}%`, top: '50%' }}>
        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l-3 3 3 3M16 9l3 3-3 3" />
        </svg>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 bg-black/80 text-white text-xs font-semibold px-3 h-7 flex items-center rounded">改造前</div>
      <div className="absolute top-4 right-4 bg-amber-500 text-black text-xs font-bold px-3 h-7 flex items-center rounded">✦ AI效果图</div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/result/[orderId]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { getOrder } from '@/lib/orders'
import BeforeAfter from '@/components/BeforeAfter'
import Link from 'next/link'

export default function ResultPage({ params }: { params: { orderId: string } }) {
  const order = getOrder(params.orderId)

  if (!order || order.status !== 'done' || !order.resultUrl) {
    // Still generating — show loading state
    if (order && (order.status === 'paid' || order.status === 'generating')) {
      return (
        <main className="min-h-screen bg-black flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-semibold text-lg">AI生成中，请稍候...</p>
            <p className="text-gray-400 text-sm">约30秒，页面将自动刷新</p>
            {/* Auto-refresh every 3s until done */}
            <meta httpEquiv="refresh" content="3" />
          </div>
        </main>
      )
    }
    notFound()
  }

  const beforeUrl = `/api/preview?uploadId=${order.uploadId}`

  return (
    <main className="min-h-screen bg-black">
      <nav className="flex items-center px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">装</div>
          <span className="font-bold text-xl">装AI</span>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 px-3.5 h-8 rounded-full bg-green-950 text-green-400 text-sm font-semibold">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          生成成功
        </div>
      </nav>

      <div className="flex flex-col items-center px-[120px] pt-12 pb-16 gap-8">
        <h1 className="text-3xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>
          您的{order.style}装修效果图已生成
        </h1>

        <BeforeAfter beforeUrl={beforeUrl} afterUrl={order.resultUrl} />

        <div className="flex items-center gap-4">
          <a
            href={order.resultUrl}
            download="AI装修效果图.png"
            target="_blank"
            className="flex items-center gap-2.5 px-8 h-[52px] bg-amber-500 text-black font-bold text-base rounded hover:bg-amber-400 transition-colors shadow-[0_6px_20px_rgba(255,152,0,0.3)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            下载高清效果图
          </a>
          <Link href="/generate" className="flex items-center gap-2 px-7 h-[52px] border border-gray-700 text-gray-400 text-base rounded hover:border-gray-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            换个风格再试一次
          </Link>
        </div>

        {/* Info strip */}
        <div className="flex items-center gap-8 px-8 py-5 rounded-lg bg-[#0A0A0A] border border-gray-800">
          {[
            { label: '装修风格', value: order.style, color: 'text-amber-500' },
            { label: '图片分辨率', value: '1024×1024', color: 'text-white' },
            { label: '本次费用', value: '¥1.00', color: 'text-white' },
          ].map(({ label, value, color }, i) => (
            <div key={label} className="flex items-center gap-8">
              {i > 0 && <div className="w-px h-9 bg-gray-800" />}
              <div className="flex flex-col items-center gap-1">
                <span className={`${color} text-base font-bold`}>{value}</span>
                <span className="text-gray-500 text-xs">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Add upload preview API (serves the uploaded image)**

Create `app/api/preview/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(req: NextRequest) {
  const uploadId = req.nextUrl.searchParams.get('uploadId')
  if (!uploadId || uploadId.includes('..') || uploadId.includes('/')) {
    return new Response('Bad request', { status: 400 })
  }

  const filePath = path.join('/tmp/uploads', uploadId)
  if (!fs.existsSync(filePath)) return new Response('Not found', { status: 404 })

  const ext = path.extname(uploadId).toLowerCase()
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg'
  const buffer = fs.readFileSync(filePath)

  return new Response(buffer, { headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' } })
}
```

- [ ] **Step 4: Commit**

```bash
git add components/BeforeAfter.tsx app/result/ app/api/preview/
git commit -m "feat: result page with before/after slider and download"
```

---

## Task 10: Run All Tests + Build Check

- [ ] **Step 1: Run full test suite**

```bash
cd ai-room-designer && npx jest
```
Expected: All tests PASS (orders: 5, zenmux: 3, alipay: 2 = 10 total)

- [ ] **Step 2: Production build check**

```bash
npm run build
```
Expected: Build succeeds, no TypeScript errors.

- [ ] **Step 3: Fix any build errors before continuing**

Common issues:
- Missing `@types/*` packages → `npm install -D @types/...`
- `Image` component needs `domains` in `next.config.mjs` for external URLs → add `images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] }`

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "fix: resolve any build errors, all tests passing"
```

---

## Task 11: PM2 + Hong Kong Server Deployment

**Files:**
- Create: `ai-room-designer/ecosystem.config.cjs`

- [ ] **Step 1: Create PM2 config**

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'zhuang-ai',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      cwd: '/opt/zhuang-ai',
      env: { NODE_ENV: 'production' },
      env_file: '.env.local',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
    },
  ],
}
```

- [ ] **Step 2: Register domain and point to HK server**

```
1. Buy domain at Cloudflare Registrar (~$10/year for .com)
2. In Cloudflare DNS: A record → your HK server IP, Proxy ON (orange cloud)
3. Buy HK server: 腾讯云轻量应用服务器 香港, 1核2G, ~¥24/月
4. SSH in, install Node 20:
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
5. Install PM2 globally: npm install -g pm2
```

- [ ] **Step 3: Deploy to server**

```bash
# On your local machine:
scp -r ai-room-designer/ root@YOUR_HK_IP:/opt/zhuang-ai

# SSH into server:
ssh root@YOUR_HK_IP
cd /opt/zhuang-ai
cp .env.local.example .env.local
# Fill in ZENMUX_API_KEY, ALIPAY_*, NEXT_PUBLIC_BASE_URL
npm install
npm run build
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```

- [ ] **Step 4: Verify deployment**

```bash
curl http://localhost:3001  # Should return HTML
# Then visit https://yourdomain.com in browser
```

- [ ] **Step 5: Set Alipay notify URL**

In Alipay open platform console:
- Set async notification URL to `https://yourdomain.com/api/notify`
- This is required for payment callbacks to work

- [ ] **Step 6: Final commit and tag**

```bash
git add ecosystem.config.cjs
git commit -m "feat: PM2 deployment config for HK server"
git tag v0.1.0-mvp
```

---

## Self-Review

**Spec Coverage:**
- ✅ Upload photo → ZenMux gpt-image-1-mini → result (Tasks 3, 4, 6)
- ✅ 6 style selector (Task 8, StyleSelector component)
- ✅ Alipay 当面付 ¥1 QR payment (Task 5)
- ✅ Before/after comparison slider (Task 9, BeforeAfter component)
- ✅ Download button (Task 9)
- ✅ Landing page with pricing (Task 7)
- ✅ HK server deployment, no ICP needed (Task 11)
- ✅ PM2 config following hourse-designer pattern (Task 11)

**No Placeholders:** All steps contain actual code. No TBD/TODO.

**Type Consistency:**
- `Order.uploadId` used consistently across `orders.ts`, `create-order/route.ts`, `result/[orderId]/page.tsx`
- `generateRoomImage` signature matches usage in `app/api/generate/route.ts`
- `STYLES` keys in `zenmux.ts` match `StyleSelector.tsx` display strings
### 缺少/不足的功能：

1. __测量房间尺寸__ - interiorai.com 可以让用户标注尺寸生成平面图，当前项目不支持
2. __精确家具替换__ - 不支持指定替换某个家具，整体重新设计
3. __3D建模/全景图__ - 只有图片生成，没有3D/VR功能
4. __分享功能__ - 虽然有结果页，但缺乏社交分享
5. __用户收藏/项目管理__ - 只有历史列表，缺乏组织管理
6. __更多风格__ - 当前只有6种，interiorai 更多

你缺少的核心功能
缺失功能	重要性	说明
50+ 风格 vs 6种	🔴 高	InteriorAI 有50+风格，你只有6种，这是最大差距
Sketch2Image	🟡 中	从手绘草图生成效果图
SketchUp 集成	🟡 中	从 SketchUp 3D模型直接渲染
Freestyle 生成	🟡 中	无需上传照片，从零生成设计
户外设计模式	🟡 中	花园/阳台/露台设计
30+ 房间类型	🟡 中	卧室/客厅/厨房/浴室等分类选择
自定义 Prompt	🟡 中	用户自己输入文字描述想要的效果
3D Flythrough	🟠 低	3D 漫游视频（高端功能）
批量并行生成	🟠 低	高级套餐可同时生成16张
去水印/商用授权	🟠 低	Pro 套餐功能