# Style Match Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Match a Style" generation mode that lets users upload a reference photo and have the AI apply that photo's visual style to their own room.

**Architecture:** New `style-match` mode added to `DESIGN_MODES`; orders table gains a `referenceUploadId` column; generate page shows dual upload slots in this mode; both images passed as `inlineData` in a single Gemini call.

**Tech Stack:** Next.js 14 App Router, Turso/libsql (SQLite), Gemini via ZenMux (`@google/genai`), TypeScript, Jest

---

## File Map

| File | Change |
|------|--------|
| `lib/orders.ts` | Add `style-match` to `DesignMode`, add `referenceUploadId` to `Order`, DB migration, `rowToOrder`, `createOrder` |
| `lib/design-config.ts` | Add `style-match` entry to `DESIGN_MODES` |
| `lib/zenmux.ts` | Add `buildStylePrompt` branch + `referenceImagePath` param to `generateRoomImage` |
| `app/api/create-order/route.ts` | Accept + validate + store `referenceUploadId` |
| `app/api/generate/route.ts` | Load reference image, pass to `generateRoomImage` |
| `app/generate/page.tsx` | Dual upload UI, updated `canGenerate`, pass `referenceUploadId` |
| `app/result/[orderId]/page.tsx` | Title branch for `style-match` |
| `__tests__/orders.test.ts` | Test `referenceUploadId` roundtrip |
| `__tests__/zenmux.test.ts` | Test `buildStylePrompt` style-match branch, DESIGN_MODES count |

---

## Task 1: Extend Order Model for Reference Upload

**Files:**
- Modify: `ai-room-designer/lib/orders.ts`
- Test: `ai-room-designer/__tests__/orders.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `__tests__/orders.test.ts`:

```ts
test('createOrder stores referenceUploadId when provided', async () => {
  const order = await createOrder({
    style: 'nordic_minimal',
    uploadId: 'room_img_1',
    referenceUploadId: 'ref_img_1',
    mode: 'style-match',
    roomType: 'living_room',
  })
  expect(order.referenceUploadId).toBe('ref_img_1')
})

test('getOrder round-trips referenceUploadId', async () => {
  const created = await createOrder({
    style: 'nordic_minimal',
    uploadId: 'room_img_2',
    referenceUploadId: 'ref_img_2',
    mode: 'style-match',
    roomType: 'living_room',
  })
  const found = await getOrder(created.id)
  expect(found?.referenceUploadId).toBe('ref_img_2')
})

test('createOrder has undefined referenceUploadId when not provided', async () => {
  const order = await createOrder({ style: 'nordic_minimal', uploadId: 'abc' })
  expect(order.referenceUploadId).toBeUndefined()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ai-room-designer
npx jest __tests__/orders.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `style-match` not a valid `DesignMode`, `referenceUploadId` unknown.

- [ ] **Step 3: Add `style-match` to DesignMode, `referenceUploadId` to Order interface**

In `lib/orders.ts`, change line 7:

```ts
export type DesignMode = 'redesign' | 'virtual_staging' | 'add_furniture' | 'paint_walls' | 'change_lighting' | 'sketch2render' | 'freestyle' | 'outdoor_redesign' | 'style-match'
```

Add `referenceUploadId?: string` to the `Order` interface (after `uploadId`):

```ts
export interface Order {
  id: string
  status: OrderStatus
  style: string
  quality: QualityTier
  mode: DesignMode
  uploadId: string | null
  referenceUploadId?: string   // ← ADD THIS
  roomType: string
  customPrompt?: string
  resultUrl?: string
  alipayTradeNo?: string
  isFree?: boolean
  isPublicGallery?: boolean
  userId?: string
  createdAt: number
  updatedAt: number
}
```

- [ ] **Step 4: Add DB migration in `getClient()`**

After the `isPublicGallery` migration block in `getClient()`, add:

```ts
// Migration: add referenceUploadId for style-match mode
try {
  await _client.execute(`ALTER TABLE orders ADD COLUMN referenceUploadId TEXT`)
} catch {
  // Column already exists — ignore
}
```

- [ ] **Step 5: Update `rowToOrder()` to map the column**

In `rowToOrder()`, add after the `uploadId` line:

```ts
referenceUploadId: row.referenceUploadId ? String(row.referenceUploadId) : undefined,
```

- [ ] **Step 6: Update `createOrder()` to accept and store `referenceUploadId`**

Add `referenceUploadId?: string` to the `createOrder` params type:

```ts
export async function createOrder(params: {
  style: string
  uploadId?: string | null
  referenceUploadId?: string   // ← ADD THIS
  quality?: QualityTier
  mode?: DesignMode
  roomType?: string
  customPrompt?: string
  isFree?: boolean
  userId?: string
}): Promise<Order> {
```

Update the `order` object construction inside `createOrder`:

```ts
const order: Order = {
  id: `ord_${crypto.randomBytes(8).toString('hex')}`,
  status: 'pending',
  style: params.style,
  quality: params.quality ?? 'standard',
  mode: params.mode ?? 'redesign',
  uploadId: params.uploadId ?? null,
  referenceUploadId: params.referenceUploadId,   // ← ADD THIS
  roomType: params.roomType ?? 'living_room',
  customPrompt: params.customPrompt,
  isFree: params.isFree ?? false,
  isPublicGallery: false,
  userId: params.userId,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}
```

Update the INSERT statement to include the new column:

```ts
await client.execute({
  sql: `INSERT INTO orders (id, status, style, quality, mode, uploadId, referenceUploadId, roomType, customPrompt, is_free, userId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  args: [order.id, order.status, order.style, order.quality, order.mode,
         order.uploadId ?? '',
         order.referenceUploadId ?? null,
         order.roomType, order.customPrompt ?? null,
         order.isFree ? 1 : 0,
         order.userId ?? null,
         order.createdAt, order.updatedAt],
})
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npx jest __tests__/orders.test.ts --no-coverage 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add ai-room-designer/lib/orders.ts ai-room-designer/__tests__/orders.test.ts
git commit -m "feat: extend Order model with referenceUploadId for style-match mode"
```

---

## Task 2: Add Style-Match Mode to Design Config and AI Prompt

**Files:**
- Modify: `ai-room-designer/lib/design-config.ts`
- Modify: `ai-room-designer/lib/zenmux.ts`
- Test: `ai-room-designer/__tests__/zenmux.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `__tests__/zenmux.test.ts`:

```ts
test('DESIGN_MODES has 9 entries after adding style-match', () => {
  expect(DESIGN_MODES).toHaveLength(9)
})

test('style-match mode has needsStyle false and needsUpload true', () => {
  const mode = DESIGN_MODES.find((m) => m.key === 'style-match')
  expect(mode).toBeDefined()
  expect(mode?.needsStyle).toBe(false)
  expect(mode?.needsUpload).toBe(true)
})

test('buildStylePrompt style-match returns English prompt for standard quality', () => {
  const prompt = buildStylePrompt('', 'standard', 'style-match', 'living_room')
  expect(prompt).toContain('reference photo')
  expect(prompt).toContain('living room')
  expect(prompt.length).toBeGreaterThan(50)
})

test('buildStylePrompt style-match returns Chinese prompt for premium quality', () => {
  const prompt = buildStylePrompt('', 'premium', 'style-match', 'bedroom')
  expect(prompt).toContain('参考图')
  expect(prompt).toContain('卧室')
  expect(prompt.length).toBeGreaterThan(50)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/zenmux.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `DESIGN_MODES` has 8 entries, `style-match` not found, `buildStylePrompt` throws on empty style.

- [ ] **Step 3: Add `style-match` entry to `DESIGN_MODES` in `lib/design-config.ts`**

Append after `outdoor_redesign` inside the `DESIGN_MODES` array:

```ts
{ key: 'style-match', label: '风格参考', labelEn: 'Match a Style', icon: '🖼️', desc: '参考图片的风格', descEn: 'Copy style from a reference photo', needsStyle: false, needsUpload: true },
```

The full array becomes 9 entries.

- [ ] **Step 4: Add `style-match` branch in `buildStylePrompt` in `lib/zenmux.ts`**

In `buildStylePrompt`, add a new `else if` block for `style-match` BEFORE the final `else` block (before `const entry = findStyleByKey(style)`):

```ts
  } else if (mode === 'outdoor_redesign') {
    base = useEn
      ? 'Redesign this outdoor space...'
      : '重新设计这个户外空间...'
  } else if (mode === 'style-match') {
    base = useEn
      ? `Apply the interior design style from the reference photo to the room in the main photo. Preserve the room's architectural structure and dimensions. Match the style: colors, materials, furniture style, lighting mood, and decorative aesthetic.`
      : `将参考图片的室内设计风格应用到主照片中的房间。保留房间的建筑结构和尺寸。匹配风格：色彩、材质、家具风格、灯光氛围和装饰美感。`
  } else {
    const entry = findStyleByKey(style)
```

- [ ] **Step 5: Add `referenceImagePath` parameter to `generateRoomImage`**

Change the function signature in `lib/zenmux.ts`:

```ts
export async function generateRoomImage(params: {
  imagePath: string | null
  referenceImagePath?: string
  style: string
  quality?: string
  mode?: DesignMode
  roomType?: string
  customPrompt?: string
}): Promise<Buffer> {
```

Replace the `contentParts` construction block with:

```ts
  let contentParts: { inlineData?: { mimeType: string; data: string }; text?: string }[]

  if (mode === 'style-match' && params.imagePath && params.referenceImagePath) {
    // style-match: two images — room photo + reference photo
    const roomBuffer = fs.readFileSync(params.imagePath)
    const roomBase64 = roomBuffer.toString('base64')
    const roomMime = params.imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg'
    const refBuffer = fs.readFileSync(params.referenceImagePath)
    const refBase64 = refBuffer.toString('base64')
    const refMime = params.referenceImagePath.endsWith('.png') ? 'image/png' : 'image/jpeg'
    contentParts = [
      { inlineData: { mimeType: roomMime, data: roomBase64 } },
      { inlineData: { mimeType: refMime, data: refBase64 } },
      { text: prompt },
    ]
  } else if (params.imagePath) {
    const imageBuffer = fs.readFileSync(params.imagePath)
    const base64Image = imageBuffer.toString('base64')
    const mimeType = params.imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg'
    contentParts = [
      { inlineData: { mimeType, data: base64Image } },
      { text: prompt },
    ]
  } else {
    // Freestyle mode — text-only generation, no input image
    contentParts = [{ text: prompt }]
  }
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx jest __tests__/zenmux.test.ts --no-coverage 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add ai-room-designer/lib/design-config.ts ai-room-designer/lib/zenmux.ts ai-room-designer/__tests__/zenmux.test.ts
git commit -m "feat: add style-match mode to DESIGN_MODES and AI prompt builder"
```

---

## Task 3: Update Create-Order API to Accept referenceUploadId

**Files:**
- Modify: `ai-room-designer/app/api/create-order/route.ts`

No new test file — validated by the orders test (Task 1) and manual integration.

- [ ] **Step 1: Add `referenceUploadId` to request body type**

In `app/api/create-order/route.ts`, update the body type:

```ts
const body = await req.json() as {
  uploadId?: string
  referenceUploadId?: string   // ← ADD THIS
  style?: string
  quality?: QualityTier
  mode?: DesignMode
  roomType?: string
  customPrompt?: string
  unlockOrderId?: string
}
const {
  uploadId,
  referenceUploadId,           // ← ADD THIS
  style = '',
  quality = 'standard',
  mode = 'redesign',
  roomType = 'living_room',
  customPrompt,
  unlockOrderId,
} = body
```

- [ ] **Step 2: Validate `referenceUploadId` for overseas style-match orders**

In the overseas path, after the existing `if (modeConfig.needsUpload && uploadId)` validation block, add:

```ts
      // style-match requires a reference upload
      if (mode === 'style-match') {
        if (!referenceUploadId) return NextResponse.json({ error: ERR.uploadMissing }, { status: 400 })
        const refData = await getUploadData(referenceUploadId)
        if (!refData) return NextResponse.json({ error: ERR.fileNotFound }, { status: 400 })
      }
```

- [ ] **Step 3: Pass `referenceUploadId` to `createOrder` in the overseas path**

Update the overseas `createOrder` call:

```ts
      const order = await createOrder({
        style,
        uploadId: uploadId ?? null,
        referenceUploadId: referenceUploadId ?? undefined,   // ← ADD THIS
        quality,
        mode,
        roomType,
        customPrompt: trimmedPrompt,
        isFree,
        userId: session.userId,
      })
```

- [ ] **Step 4: Run the full test suite to confirm no regressions**

```bash
npx jest --no-coverage 2>&1 | tail -30
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add ai-room-designer/app/api/create-order/route.ts
git commit -m "feat: accept and store referenceUploadId in create-order API"
```

---

## Task 4: Update Generate API to Load and Pass Reference Image

**Files:**
- Modify: `ai-room-designer/app/api/generate/route.ts`

- [ ] **Step 1: Load reference image after the primary upload**

In `app/api/generate/route.ts`, after the existing `imagePath` loading block (the `if (order.uploadId)` block), add:

```ts
    // Load reference image for style-match mode
    let referenceImagePath: string | null = null
    if (order.referenceUploadId) {
      const refData = await getUploadData(order.referenceUploadId)
      if (refData) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true })
        referenceImagePath = path.join(UPLOAD_DIR, order.referenceUploadId)
        fs.writeFileSync(referenceImagePath, refData)
      }
    }
```

- [ ] **Step 2: Pass `referenceImagePath` to `generateRoomImage`**

Update the `generateRoomImage` call:

```ts
    const resultBuffer = await generateRoomImage({
      imagePath,
      referenceImagePath: referenceImagePath ?? undefined,   // ← ADD THIS
      style: order.style,
      quality: order.quality,
      mode: order.mode,
      roomType: order.roomType,
      customPrompt: order.customPrompt,
    })
```

- [ ] **Step 3: Run the full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -30
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add ai-room-designer/app/api/generate/route.ts
git commit -m "feat: load and pass reference image to AI in generate API"
```

---

## Task 5: Generate Page Dual Upload UI

**Files:**
- Modify: `ai-room-designer/app/generate/page.tsx`

- [ ] **Step 1: Add `referenceUploadId` state and update `canGenerate`**

In `GeneratePageInner`, after the existing `const [uploadId, setUploadId] = useState<string | null>(null)` line, add:

```ts
  const [referenceUploadId, setReferenceUploadId] = useState<string | null>(null)
```

Replace the `canGenerate` line:

```ts
  const canGenerate = !currentMode.needsUpload || (
    !!uploadId && (mode !== 'style-match' || !!referenceUploadId)
  )
```

- [ ] **Step 2: Reset `referenceUploadId` when mode changes away from style-match**

After `const [mode, setMode] = useState<DesignMode>('redesign')`, the `setMode` call in the mode selector already handles state — but `referenceUploadId` should reset when the user switches modes. Wrap the mode setter in a handler:

```ts
  const handleModeChange = (newMode: DesignMode) => {
    setMode(newMode)
    if (newMode !== 'style-match') setReferenceUploadId(null)
  }
```

In the mode selector buttons, replace `onClick={() => setMode(m.key)}` with:

```tsx
onClick={() => handleModeChange(m.key)}
```

- [ ] **Step 3: Show dual upload zones for style-match, single zone for other modes**

Replace the Left column upload section (the `<div className="w-full md:w-[520px] flex flex-col gap-4">` block) with:

```tsx
        {/* ── Left column: Upload ── */}
        <div className="w-full md:w-[520px] flex flex-col gap-4">
          {mode === 'style-match' ? (
            <>
              <div>
                <h2 className="text-white text-base md:text-xl font-bold">Your Room</h2>
                <p className="text-gray-500 text-xs md:text-sm mt-1">Upload a photo of the room you want to redesign</p>
              </div>
              <UploadZone onUpload={(id) => setUploadId(id)} />
              <div>
                <h2 className="text-white text-base md:text-xl font-bold mt-2">Style Reference</h2>
                <p className="text-gray-500 text-xs md:text-sm mt-1">
                  Upload a photo whose style you want to copy — works great with Pinterest, Houzz, or magazine photos
                </p>
              </div>
              <UploadZone onUpload={(id) => setReferenceUploadId(id)} />
            </>
          ) : (
            <>
              <div>
                <h2 className="text-white text-base md:text-xl font-bold">
                  {currentMode.needsUpload ? s.uploadTitle : s.freeGenTitle}
                </h2>
                <p className="text-gray-500 text-xs md:text-sm mt-1">
                  {currentMode.needsUpload
                    ? (currentMode.key === 'sketch2render' ? s.uploadSubtitleSketch : s.uploadSubtitle)
                    : s.freeGenSubtitle}
                </p>
              </div>
              {currentMode.needsUpload ? (
                <UploadZone onUpload={(id) => setUploadId(id)} />
              ) : (
                <div className="w-full h-[160px] md:h-[200px] border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center bg-gray-900/30">
                  <p className="text-gray-500 text-sm text-center leading-relaxed">
                    {isOverseas ? <>✨ Freestyle<br />AI generates from scratch</> : <>✨ 自由生成<br />AI 从零生成效果图</>}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
```

- [ ] **Step 4: Pass `referenceUploadId` in the create-order request body**

In the `handlePay` function, update the `fetch('/api/create-order', ...)` body:

```ts
body: JSON.stringify({
  uploadId,
  referenceUploadId: mode === 'style-match' ? referenceUploadId : undefined,   // ← ADD THIS
  style,
  quality,
  mode,
  roomType,
  customPrompt: customPrompt.trim() || undefined,
}),
```

- [ ] **Step 5: Start dev server and manually verify the UI**

```bash
npx next dev 2>&1 &
```

Open `http://localhost:3000/generate`, select "Match a Style" mode:
- Verify two upload zones appear (Your Room + Style Reference)
- Verify Generate button is disabled until both images are uploaded
- Verify switching to another mode shows one upload zone and clears `referenceUploadId`

- [ ] **Step 6: Commit**

```bash
git add ai-room-designer/app/generate/page.tsx
git commit -m "feat: dual upload UI for style-match mode on generate page"
```

---

## Task 6: Result Page Title for Style-Match

**Files:**
- Modify: `ai-room-designer/app/result/[orderId]/page.tsx`

- [ ] **Step 1: Add title branch for style-match mode**

In `app/result/[orderId]/page.tsx`, find the `<h1>` title block. The current overseas title logic is:

```tsx
{isOverseas
  ? (order.mode === 'paint_walls' ? 'Your wall repaint is ready'
    : order.mode === 'change_lighting' ? 'Your lighting redesign is ready'
    : order.mode === 'virtual_staging' ? `Your ${order.style} virtual staging is ready`
    : order.mode === 'add_furniture' ? `Your ${order.style} furnished design is ready`
    : `Your ${order.style} redesign is ready`)
```

Add `style-match` before the final fallback:

```tsx
{isOverseas
  ? (order.mode === 'paint_walls' ? 'Your wall repaint is ready'
    : order.mode === 'change_lighting' ? 'Your lighting redesign is ready'
    : order.mode === 'virtual_staging' ? `Your ${order.style} virtual staging is ready`
    : order.mode === 'add_furniture' ? `Your ${order.style} furnished design is ready`
    : order.mode === 'style-match' ? 'Your style-matched redesign is ready'
    : `Your ${order.style} redesign is ready`)
```

- [ ] **Step 2: Run full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -30
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add ai-room-designer/app/result/[orderId]/page.tsx
git commit -m "feat: add style-match title to result page"
```

---

## Final Verification

- [ ] Run full test suite one last time:

```bash
cd ai-room-designer && npx jest --no-coverage 2>&1 | tail -30
```

Expected: All tests PASS, 0 failures.
