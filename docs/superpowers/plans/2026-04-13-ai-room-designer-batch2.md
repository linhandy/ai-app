# AI Room Designer Batch 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sketch2Image, Freestyle (no-upload), and Outdoor Design modes to the existing room designer.

**Architecture:** Three new `DesignMode` values added to the existing config-driven system. `DESIGN_MODES` gains a `needsUpload: boolean` field. For Freestyle, `uploadId` uses an empty-string sentinel in the DB (existing `TEXT NOT NULL` column, no schema migration needed), converted to `null` at the app layer. `buildStylePrompt` gains three new mode branches. `generateRoomImage` accepts `imagePath: string | null`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, LibSQL (@libsql/client), Google GenAI SDK via ZenMux, Jest + ts-jest

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `ai-room-designer/lib/orders.ts:7` | Expand `DesignMode` union type |
| Modify | `ai-room-designer/lib/design-config.ts:392-398` | Add `needsUpload` to `DESIGN_MODES` type + 3 new modes |
| Modify | `ai-room-designer/lib/design-config.ts:365-390` | Append 5 outdoor room types to `ROOM_TYPES` |
| Modify | `ai-room-designer/lib/orders.ts:9,103-133` | `uploadId: string \| null` in interface + empty-string sentinel |
| Modify | `ai-room-designer/lib/zenmux.ts:16-68` | Add 3 new mode branches to `buildStylePrompt` |
| Modify | `ai-room-designer/lib/zenmux.ts:82-125` | `imagePath: string \| null` in `generateRoomImage` |
| Modify | `ai-room-designer/app/api/create-order/route.ts:32-68` | Conditional uploadId/style validation |
| Modify | `ai-room-designer/app/api/generate/route.ts:28-36` | Null imagePath for freestyle |
| Modify | `ai-room-designer/app/generate/page.tsx:91-237` | Conditional upload zone + button logic + nav text |
| Modify | `ai-room-designer/__tests__/zenmux.test.ts` | Tests for new modes, DESIGN_MODES, ROOM_TYPES |
| Modify | `ai-room-designer/__tests__/orders.test.ts` | Test uploadId: null for freestyle |

---

## Task 1: Extend DesignMode type, DESIGN_MODES, and outdoor room types

**Files:**
- Modify: `ai-room-designer/lib/orders.ts:7`
- Modify: `ai-room-designer/lib/design-config.ts`
- Test: `ai-room-designer/__tests__/zenmux.test.ts`

- [ ] **Step 1: Write failing tests**

Add to the end of `ai-room-designer/__tests__/zenmux.test.ts`:

```typescript
test('DESIGN_MODES has 8 entries', () => {
  expect(DESIGN_MODES).toHaveLength(8)
})

test('ALL_ROOM_TYPE_KEYS has 25 entries', () => {
  expect(ALL_ROOM_TYPE_KEYS).toHaveLength(25)
})

test('freestyle mode has needsUpload false', () => {
  const mode = DESIGN_MODES.find((m) => m.key === 'freestyle')
  expect(mode).toBeDefined()
  expect(mode?.needsUpload).toBe(false)
})

test('outdoor_redesign mode has needsStyle false and needsUpload true', () => {
  const mode = DESIGN_MODES.find((m) => m.key === 'outdoor_redesign')
  expect(mode).toBeDefined()
  expect(mode?.needsStyle).toBe(false)
  expect(mode?.needsUpload).toBe(true)
})

test('sketch2render mode has needsStyle true and needsUpload true', () => {
  const mode = DESIGN_MODES.find((m) => m.key === 'sketch2render')
  expect(mode).toBeDefined()
  expect(mode?.needsStyle).toBe(true)
  expect(mode?.needsUpload).toBe(true)
})
```

Also update the import at the top of `zenmux.test.ts` — add `DESIGN_MODES` and `ALL_ROOM_TYPE_KEYS` to the import from `@/lib/design-config`:

```typescript
import { STYLE_CATEGORIES, ALL_STYLE_KEYS, DESIGN_MODES, ALL_ROOM_TYPE_KEYS } from '@/lib/design-config'
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ai-room-designer && npm test -- --testPathPattern=zenmux 2>&1 | tail -20
```

Expected: FAIL — `DESIGN_MODES has 8 entries` (currently 5), `ALL_ROOM_TYPE_KEYS has 25 entries` (currently 20), and the three new mode tests.

- [ ] **Step 3: Expand DesignMode union in lib/orders.ts**

Replace line 7 in `ai-room-designer/lib/orders.ts`:

```typescript
export type DesignMode = 'redesign' | 'virtual_staging' | 'add_furniture' | 'paint_walls' | 'change_lighting' | 'sketch2render' | 'freestyle' | 'outdoor_redesign'
```

- [ ] **Step 4: Add needsUpload to DESIGN_MODES type and entries in lib/design-config.ts**

Replace the `DESIGN_MODES` array (lines 392–398) in `ai-room-designer/lib/design-config.ts`:

```typescript
export const DESIGN_MODES: { key: DesignMode; label: string; icon: string; desc: string; needsStyle: boolean; needsUpload: boolean }[] = [
  { key: 'redesign',         label: '风格改造', icon: '🎨', desc: '改变整体装修风格',   needsStyle: true,  needsUpload: true  },
  { key: 'virtual_staging',  label: '虚拟家装', icon: '🛋️', desc: '空房间添加全套家具', needsStyle: true,  needsUpload: true  },
  { key: 'add_furniture',    label: '添加家具', icon: '🪑', desc: '现有房间增添家具',   needsStyle: true,  needsUpload: true  },
  { key: 'paint_walls',      label: '墙面换色', icon: '🖌️', desc: '改变墙面颜色材质',   needsStyle: false, needsUpload: true  },
  { key: 'change_lighting',  label: '灯光优化', icon: '💡', desc: '改善房间光照效果',   needsStyle: false, needsUpload: true  },
  { key: 'sketch2render',    label: '草图生成', icon: '✏️', desc: '草图变效果图',       needsStyle: true,  needsUpload: true  },
  { key: 'freestyle',        label: '自由生成', icon: '✨', desc: '无需上传照片',       needsStyle: true,  needsUpload: false },
  { key: 'outdoor_redesign', label: '户外设计', icon: '🌿', desc: '庭院景观改造',       needsStyle: false, needsUpload: true  },
]
```

- [ ] **Step 5: Append 5 outdoor room types to ROOM_TYPES in lib/design-config.ts**

Replace the closing `]` of `ROOM_TYPES` (the `]` on its own line after the `gym` entry) with:

```typescript
  // 室外空间
  { key: 'garden',     label: '花园',     icon: '🌳', promptHint: 'backyard garden with lawn and plants',           promptHintCn: '花园，有草坪和植物' },
  { key: 'patio',      label: '露台',     icon: '🪑', promptHint: 'patio or terrace outdoor seating area',          promptHintCn: '露台，户外休闲区' },
  { key: 'front_yard', label: '前院',     icon: '🏡', promptHint: 'front yard entrance garden',                     promptHintCn: '前院，入口花园' },
  { key: 'rooftop',    label: '屋顶花园', icon: '🌇', promptHint: 'rooftop terrace garden with city view',          promptHintCn: '屋顶花园，城市景观' },
  { key: 'pool_area',  label: '泳池区',   icon: '🏊', promptHint: 'pool area with surrounding landscape',           promptHintCn: '泳池区，周边景观' },
]
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd ai-room-designer && npm test -- --testPathPattern=zenmux 2>&1 | tail -20
```

Expected: All zenmux tests PASS (existing 10 + 5 new = 15 passing).

- [ ] **Step 7: Commit**

```bash
cd ai-room-designer && git add lib/orders.ts lib/design-config.ts __tests__/zenmux.test.ts
git commit -m "feat: add sketch2render/freestyle/outdoor_redesign modes and outdoor room types"
```

---

## Task 2: Update buildStylePrompt for three new modes

**Files:**
- Modify: `ai-room-designer/lib/zenmux.ts:16-68`
- Test: `ai-room-designer/__tests__/zenmux.test.ts`

- [ ] **Step 1: Write failing tests**

Add to the end of `ai-room-designer/__tests__/zenmux.test.ts`:

```typescript
test('buildStylePrompt sketch2render returns English sketch prompt for standard', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'sketch2render', 'living_room')
  expect(prompt).toContain('sketch')
  expect(prompt.length).toBeGreaterThan(50)
})

test('buildStylePrompt sketch2render returns Chinese sketch prompt for premium', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'premium', 'sketch2render', 'bedroom')
  expect(prompt).toContain('草图')
})

test('buildStylePrompt freestyle returns English generation prompt for standard', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'freestyle', 'living_room')
  expect(prompt).toContain('Generate a brand new')
})

test('buildStylePrompt freestyle returns Chinese generation prompt for premium', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'premium', 'freestyle', 'bedroom')
  expect(prompt).toContain('生成一张全新')
})

test('buildStylePrompt outdoor_redesign returns English landscaping prompt for standard', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'outdoor_redesign', 'garden')
  expect(prompt).toContain('landscaping')
})

test('buildStylePrompt outdoor_redesign returns Chinese landscaping prompt for premium', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'premium', 'outdoor_redesign', 'patio')
  expect(prompt).toContain('户外')
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ai-room-designer && npm test -- --testPathPattern=zenmux 2>&1 | tail -20
```

Expected: 6 new tests FAIL — `buildStylePrompt sketch2render/freestyle/outdoor_redesign` not handled (falls through to `throw new Error('Unknown style')` or wrong output).

- [ ] **Step 3: Add three new mode branches to buildStylePrompt in lib/zenmux.ts**

Replace the entire `buildStylePrompt` function (lines 16–69) in `ai-room-designer/lib/zenmux.ts`:

```typescript
export function buildStylePrompt(
  style: string,
  quality: string,
  mode: DesignMode = 'redesign',
  roomType: string = 'living_room',
  customPrompt?: string,
): string {
  const useEn = quality === 'standard'
  const room = findRoomType(roomType)
  const roomHint = useEn
    ? (room?.promptHint ?? 'a room')
    : (room?.promptHintCn ?? '房间')

  let base: string

  if (mode === 'paint_walls') {
    base = useEn
      ? 'Change only the wall colors and wall materials in this room. Try warm white, light grey or pastel tones. Keep all furniture, fixtures and layout completely unchanged. Generate a photorealistic interior photo.'
      : '仅改变这个房间的墙面颜色和墙面材质，尝试暖白、浅灰或莫兰迪色调。保持所有家具、摆设和布局完全不变。生成真实感强的室内照片。'
  } else if (mode === 'change_lighting') {
    base = useEn
      ? 'Improve the lighting in this room dramatically. Add bright natural light from windows, warm ambient lighting, and accent lights. Make the room feel bright, inviting and well-lit. Keep furniture and layout unchanged. Generate a photorealistic interior photo.'
      : '大幅改善这个房间的光照效果。增加窗户自然光、暖色环境光和重点照明。让房间感觉明亮、温馨、光线充足。保持家具和布局不变。生成真实感强的室内照片。'
  } else if (mode === 'outdoor_redesign') {
    base = useEn
      ? 'Redesign this outdoor space with beautiful professional landscaping. Add lush plants, colorful flowers, trees, stone or wooden pathways, and stylish outdoor furniture. Keep the original space structure and architecture. Generate a photorealistic exterior landscape photo.'
      : '重新设计这个户外空间，打造专业景观效果。添加丰富的植物、五彩的花卉、树木、石板或木质小径和精致的户外家具。保留原有空间结构和建筑外形。生成真实感强的户外景观效果图。'
  } else {
    const entry = findStyleByKey(style)
    if (!entry) throw new Error(`Unknown style: ${style}`)

    if (mode === 'sketch2render') {
      base = useEn
        ? `Convert this hand-drawn sketch into a photorealistic interior design render in ${entry.promptEn} style. Add realistic materials, proper lighting, and detailed furniture. Keep the room structure shown in the sketch. Generate a professional photorealistic interior design image.`
        : `将这张手绘草图转换为${entry.prompt}风格的写实室内设计效果图。添加真实的材质、合适的光线和详细的家具细节，保留草图中展示的空间结构。生成专业室内设计师水准的写实效果图。`
    } else if (mode === 'freestyle') {
      base = useEn
        ? `Generate a brand new ${entry.promptEn} interior design for a ${roomHint}. Beautiful natural lighting, realistic materials, professional interior photography quality. No people, no text overlays. Photorealistic interior design image.`
        : `生成一张全新的${entry.prompt}风格${roomHint}效果图。自然光线充足，材质真实，专业室内摄影级别的画质。无人物，无文字。生成专业室内设计写实效果图，高质量照片真实感。`
    } else if (mode === 'virtual_staging') {
      base = useEn
        ? `Stage this empty room professionally with complete furniture and decor in ${entry.promptEn} style. Add sofa, tables, rugs, plants, art, lighting fixtures. Create a fully furnished, magazine-worthy interior. Keep room structure and windows. Generate a photorealistic interior design image.`
        : `请为这个空房间进行专业的虚拟家装布置，使用${entry.prompt}的风格。添加沙发、桌椅、地毯、绿植、装饰画、灯具等完整家具陈设。保留原有空间结构和门窗。生成专业室内设计师水准的效果图。`
    } else if (mode === 'add_furniture') {
      base = useEn
        ? `Add more stylish furniture and decor to this room in ${entry.promptEn} style. Add complementary pieces like accent chairs, side tables, plants, art, and decorative items. Keep existing furniture and room structure. Generate a photorealistic interior photo.`
        : `在这个房间中添加更多${entry.prompt}风格的家具和装饰品。添加点缀椅、边桌、绿植、装饰画、摆件等。保留现有家具和房间结构。生成真实感强的室内照片。`
    } else {
      // redesign (default)
      base = useEn
        ? `Redesign this room photo: ${entry.promptEn}. Keep the original room structure, windows and layout. Only change furniture, decor and style. Ensure bright lighting, clear details. Generate a professional photorealistic interior design image.`
        : `请将这张室内照片${entry.prompt}。保留原有的空间结构、门窗位置和整体布局，仅改变装修风格和家具陈设。保证充足的光线亮度，画面明亮清晰，不要偏暗。生成专业室内设计师水准的效果图，高质量写实风格，照片真实感强。`
    }
  }

  // Append room type context (skip for freestyle — room hint already embedded in base)
  if (mode !== 'freestyle') {
    const roomLine = useEn ? `Room: ${roomHint}.` : `房间：${roomHint}。`
    base = `${base}\n${roomLine}`
  }

  // Append optional custom prompt
  if (customPrompt?.trim()) {
    base += `\n${customPrompt.trim()}`
  }

  return base
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ai-room-designer && npm test -- --testPathPattern=zenmux 2>&1 | tail -20
```

Expected: All zenmux tests PASS (21 total).

- [ ] **Step 5: Commit**

```bash
cd ai-room-designer && git add lib/zenmux.ts __tests__/zenmux.test.ts
git commit -m "feat: add sketch2render/freestyle/outdoor_redesign branches to buildStylePrompt"
```

---

## Task 3: Make uploadId nullable in orders.ts (empty-string sentinel)

**Files:**
- Modify: `ai-room-designer/lib/orders.ts`
- Test: `ai-room-designer/__tests__/orders.test.ts`

**Background:** SQLite column is `TEXT NOT NULL`. We store `''` for freestyle (no upload), and convert `''` → `null` in `rowToOrder`. The app layer sees `string | null`.

- [ ] **Step 1: Write failing test**

Add to the end of `ai-room-designer/__tests__/orders.test.ts`:

```typescript
test('createOrder accepts null uploadId for freestyle mode', async () => {
  const order = await createOrder({
    style: 'nordic_minimal',
    uploadId: null,
    mode: 'freestyle',
    roomType: 'living_room',
  })
  expect(order.uploadId).toBeNull()
  expect(order.mode).toBe('freestyle')
})

test('getOrder returns null uploadId for freestyle order', async () => {
  const created = await createOrder({
    style: 'nordic_minimal',
    uploadId: null,
    mode: 'freestyle',
    roomType: 'living_room',
  })
  const found = await getOrder(created.id)
  expect(found?.uploadId).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ai-room-designer && npm test -- --testPathPattern=orders 2>&1 | tail -20
```

Expected: FAIL — TypeScript error: Argument of type `null` is not assignable to parameter type `string`.

- [ ] **Step 3: Update Order interface and createOrder in lib/orders.ts**

Make three changes to `ai-room-designer/lib/orders.ts`:

**Change 1** — `Order` interface, change `uploadId: string` to:
```typescript
  uploadId: string | null
```

**Change 2** — `rowToOrder` function, change `uploadId: String(row.uploadId)` to:
```typescript
    uploadId: row.uploadId === '' || row.uploadId == null ? null : String(row.uploadId),
```

**Change 3** — `createOrder` params and body. Replace the `createOrder` function signature and INSERT:

```typescript
export async function createOrder(params: {
  style: string
  uploadId?: string | null
  quality?: QualityTier
  mode?: DesignMode
  roomType?: string
  customPrompt?: string
}): Promise<Order> {
  const client = await getClient()
  const order: Order = {
    id: `ord_${crypto.randomBytes(8).toString('hex')}`,
    status: 'pending',
    style: params.style,
    quality: params.quality ?? 'standard',
    mode: params.mode ?? 'redesign',
    uploadId: params.uploadId ?? null,
    roomType: params.roomType ?? 'living_room',
    customPrompt: params.customPrompt,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await client.execute({
    sql: `INSERT INTO orders (id, status, style, quality, mode, uploadId, roomType, customPrompt, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [order.id, order.status, order.style, order.quality, order.mode,
           order.uploadId ?? '',   // store '' for null (TEXT NOT NULL column)
           order.roomType, order.customPrompt ?? null, order.createdAt, order.updatedAt],
  })

  return order
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ai-room-designer && npm test -- --testPathPattern=orders 2>&1 | tail -20
```

Expected: All orders tests PASS (10 total).

- [ ] **Step 5: Commit**

```bash
cd ai-room-designer && git add lib/orders.ts __tests__/orders.test.ts
git commit -m "feat: allow null uploadId in orders for freestyle mode (empty-string sentinel)"
```

---

## Task 4: Update create-order/route.ts for freestyle and outdoor_redesign

**Files:**
- Modify: `ai-room-designer/app/api/create-order/route.ts`

- [ ] **Step 1: Replace the validation and order-creation block in create-order/route.ts**

Replace lines 25–70 (from `const { uploadId, ...` to `const order = await createOrder(...)`) with:

```typescript
    const {
      uploadId,
      style = '',
      quality = 'standard',
      mode = 'redesign',
      roomType = 'living_room',
      customPrompt,
    } = await req.json() as {
      uploadId?: string
      style?: string
      quality?: QualityTier
      mode?: DesignMode
      roomType?: string
      customPrompt?: string
    }

    const validModes: string[] = DESIGN_MODES.map((m) => m.key)
    if (!validModes.includes(mode as string)) {
      return NextResponse.json({ error: '无效的设计模式' }, { status: 400 })
    }

    const modeConfig = DESIGN_MODES.find((m) => m.key === mode)!

    // uploadId required for all modes that need an upload
    if (modeConfig.needsUpload && !uploadId) {
      return NextResponse.json({ error: '请先上传图片' }, { status: 400 })
    }

    if (!ALL_ROOM_TYPE_KEYS.includes(roomType)) {
      return NextResponse.json({ error: '无效的房间类型' }, { status: 400 })
    }

    // style only validated when this mode requires a style selection
    if (modeConfig.needsStyle && !ALL_STYLE_KEYS.includes(style)) {
      return NextResponse.json({ error: '无效的风格' }, { status: 400 })
    }

    const trimmedPrompt = customPrompt?.trim().slice(0, 200) || undefined

    const amount = QUALITY_PRICE[quality] ?? 1

    // File existence check only when an upload is required
    if (modeConfig.needsUpload && uploadId) {
      const uploadPath = path.resolve(path.join(UPLOAD_DIR, uploadId))
      if (!uploadPath.startsWith(path.resolve(UPLOAD_DIR))) {
        return NextResponse.json({ error: 'Invalid upload ID' }, { status: 400 })
      }
      if (!fs.existsSync(uploadPath)) {
        return NextResponse.json({ error: '上传文件不存在，请重新上传' }, { status: 400 })
      }
    }

    const order = await createOrder({
      style,
      uploadId: uploadId ?? null,
      quality,
      mode,
      roomType,
      customPrompt: trimmedPrompt,
    })
```

- [ ] **Step 2: Run all tests to verify nothing broke**

```bash
cd ai-room-designer && npm test 2>&1 | tail -20
```

Expected: All 29 tests PASS.

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer && git add app/api/create-order/route.ts
git commit -m "feat: update create-order to skip uploadId/style validation for freestyle/outdoor modes"
```

---

## Task 5: Update generate/route.ts and generateRoomImage for null imagePath

**Files:**
- Modify: `ai-room-designer/app/api/generate/route.ts:28-36`
- Modify: `ai-room-designer/lib/zenmux.ts:82-125`

- [ ] **Step 1: Update generate/route.ts — null imagePath for freestyle**

Replace lines 28–36 in `ai-room-designer/app/api/generate/route.ts`:

```typescript
    const imagePath = order.uploadId
      ? path.join(UPLOAD_DIR, order.uploadId)
      : null

    const resultBuffer = await generateRoomImage({
      imagePath,
      style: order.style,
      quality: order.quality,
      mode: order.mode,
      roomType: order.roomType,
      customPrompt: order.customPrompt,
    })
```

Also remove the now-unused `import fs from 'fs'` only if `fs` is not used elsewhere in the file. (It is not used elsewhere — the file only used it for `fs.writeFileSync` which remains on line 44. Keep it.)

- [ ] **Step 2: Update generateRoomImage in lib/zenmux.ts — accept null imagePath**

Replace the `generateRoomImage` function signature and body (lines 82–125) in `ai-room-designer/lib/zenmux.ts`:

```typescript
export async function generateRoomImage(params: {
  imagePath: string | null
  style: string
  quality?: string
  mode?: DesignMode
  roomType?: string
  customPrompt?: string
}): Promise<Buffer> {
  const quality = params.quality ?? 'standard'
  const mode = params.mode ?? 'redesign'
  const roomType = params.roomType ?? 'living_room'
  const client = getGenAIClient()
  const model = QUALITY_MODEL[quality] ?? QUALITY_MODEL.standard
  const prompt = buildStylePrompt(params.style, quality, mode, roomType, params.customPrompt)

  let contentParts: { inlineData?: { mimeType: string; data: string }; text?: string }[]

  if (params.imagePath) {
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

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: contentParts,
      },
    ],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  })

  const parts = response.candidates?.[0]?.content?.parts || []
  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, 'base64')
    }
  }

  throw new Error('AI 未返回图片，请重试')
}
```

- [ ] **Step 3: Run all tests**

```bash
cd ai-room-designer && npm test 2>&1 | tail -20
```

Expected: All 29 tests PASS.

- [ ] **Step 4: Commit**

```bash
cd ai-room-designer && git add app/api/generate/route.ts lib/zenmux.ts
git commit -m "feat: support null imagePath in generateRoomImage for freestyle text-only generation"
```

---

## Task 6: Update generate/page.tsx UI

**Files:**
- Modify: `ai-room-designer/app/generate/page.tsx`

- [ ] **Step 1: Replace the upload section and button logic in GeneratePageInner**

**Change 1** — Replace the Left upload section (around lines 103–109). Find:

```tsx
        {/* Left: Upload */}
        <div className="w-full md:w-[520px] flex flex-col gap-5">
          <div>
            <h2 className="text-white text-xl font-bold">上传您的房间照片</h2>
            <p className="text-gray-500 text-sm mt-1">支持 JPG / PNG，建议正面拍摄，效果更佳</p>
          </div>
          <UploadZone onUpload={(id) => setUploadId(id)} />
        </div>
```

Replace with:

```tsx
        {/* Left: Upload */}
        <div className="w-full md:w-[520px] flex flex-col gap-5">
          <div>
            <h2 className="text-white text-xl font-bold">
              {currentMode.needsUpload ? '上传您的房间照片' : '自由生成模式'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {currentMode.needsUpload
                ? (currentMode.key === 'sketch2render'
                    ? '上传手绘草图，AI 将转换为写实效果图'
                    : '支持 JPG / PNG，建议正面拍摄，效果更佳')
                : '无需上传照片，AI 将根据您选择的风格和房间类型从零生成效果图'}
            </p>
          </div>
          {currentMode.needsUpload ? (
            <UploadZone onUpload={(id) => setUploadId(id)} />
          ) : (
            <div className="w-full h-48 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center bg-gray-900/30">
              <p className="text-gray-500 text-sm text-center leading-relaxed">
                ✨ 自由生成模式<br />
                无需上传照片，AI 从零生成效果图
              </p>
            </div>
          )}
        </div>
```

**Change 2** — Update nav hint text. Find:

```tsx
        <span className="text-gray-600 text-sm">上传照片 → 选择风格 → 付款生成</span>
```

Replace with:

```tsx
        <span className="text-gray-600 text-sm">
          {currentMode.needsUpload ? '上传照片 → 选择风格 → 付款生成' : '选择风格 → 描述需求 → 付款生成'}
        </span>
```

**Change 3** — Update button disabled condition. Find:

```tsx
              disabled={loading || generating || !uploadId}
```

Replace with:

```tsx
              disabled={loading || generating || (currentMode.needsUpload && !uploadId)}
```

- [ ] **Step 2: Run all tests to confirm nothing broke**

```bash
cd ai-room-designer && npm test 2>&1 | tail -20
```

Expected: All 29 tests PASS.

- [ ] **Step 3: Run the Next.js build**

```bash
cd ai-room-designer && npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors. All routes listed.

- [ ] **Step 4: Commit**

```bash
cd ai-room-designer && git add app/generate/page.tsx
git commit -m "feat: conditional upload zone and button logic for freestyle/sketch2render/outdoor modes"
```

---

## Task 7: Final verification

**Files:** none — read-only verification

- [ ] **Step 1: Run full test suite**

```bash
cd ai-room-designer && npm test 2>&1 | tail -10
```

Expected output:
```
Test Suites: 3 passed, 3 total
Tests:       29 passed, 29 total
```

- [ ] **Step 2: Run production build**

```bash
cd ai-room-designer && npm run build 2>&1 | grep -E "error|Error|✓|Route|○|ƒ"
```

Expected: No errors. All routes listed (including `/generate`, `/result/[orderId]`, all `/api/*`).

- [ ] **Step 3: Verify git log**

```bash
git log --oneline -6
```

Expected (newest first):
```
<sha> feat: conditional upload zone and button logic for freestyle/sketch2render/outdoor modes
<sha> feat: support null imagePath in generateRoomImage for freestyle text-only generation
<sha> feat: update create-order to skip uploadId/style validation for freestyle/outdoor modes
<sha> feat: allow null uploadId in orders for freestyle mode (empty-string sentinel)
<sha> feat: add sketch2render/freestyle/outdoor_redesign branches to buildStylePrompt
<sha> feat: add sketch2render/freestyle/outdoor_redesign modes and outdoor room types
```
