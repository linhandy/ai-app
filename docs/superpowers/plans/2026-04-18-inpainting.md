# Inpainting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Inpaint" mode where users paint a red mask over part of their room photo, describe the replacement (via chips or text), and the AI modifies only that area.

**Architecture:** Client paints a red overlay on a canvas, then at submit time composites the original image + red mask into a single JPEG and uploads it. That composite (`referenceUploadId`) is loaded by the generate API and sent to Gemini as the primary image with an inpaint-specific prompt. No new DB columns needed.

**Tech Stack:** React canvas API, `<canvas>` compositing via `toBlob`, Next.js API routes, Gemini via ZenMux (existing infrastructure), Turso/libsql (existing).

---

### Task 1: Add 'inpaint' to DesignMode and DESIGN_MODES

**Files:**
- Modify: `ai-room-designer/lib/orders.ts` (line 7)
- Modify: `ai-room-designer/lib/design-config.ts` (line 449 — DESIGN_MODES array)
- Modify: `ai-room-designer/__tests__/zenmux.test.ts` (line 58 — update count test)

- [ ] **Step 1: Write the failing test**

In `ai-room-designer/__tests__/zenmux.test.ts`, change:

```ts
test('DESIGN_MODES has 9 entries', () => {
  expect(DESIGN_MODES).toHaveLength(9)
})
```

to:

```ts
test('DESIGN_MODES has 10 entries', () => {
  expect(DESIGN_MODES).toHaveLength(10)
})
```

Also add after the existing DESIGN_MODES test:

```ts
test('DESIGN_MODES inpaint entry has correct flags', () => {
  const inpaint = DESIGN_MODES.find((m) => m.key === 'inpaint')
  expect(inpaint).toBeDefined()
  expect(inpaint?.needsUpload).toBe(true)
  expect(inpaint?.needsStyle).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ai-room-designer && npx jest --testPathPattern="zenmux.test" --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `Expected length: 10, Received length: 9`

- [ ] **Step 3: Add 'inpaint' to DesignMode union in lib/orders.ts**

Find line 7 in `ai-room-designer/lib/orders.ts`:
```ts
export type DesignMode = 'redesign' | 'virtual_staging' | 'add_furniture' | 'paint_walls' | 'change_lighting' | 'sketch2render' | 'freestyle' | 'outdoor_redesign' | 'style-match'
```

Change to:
```ts
export type DesignMode = 'redesign' | 'virtual_staging' | 'add_furniture' | 'paint_walls' | 'change_lighting' | 'sketch2render' | 'freestyle' | 'outdoor_redesign' | 'style-match' | 'inpaint'
```

- [ ] **Step 4: Add inpaint entry to DESIGN_MODES in lib/design-config.ts**

Find the DESIGN_MODES array (line 449). Append the inpaint entry after the `style-match` entry:

```ts
  { key: 'style-match',      label: '风格参考', labelEn: 'Match a Style',   icon: '🖼️', desc: '参考图片的风格',    descEn: 'Copy style from a reference photo',  needsStyle: false, needsUpload: true  },
  { key: 'inpaint',          label: '局部修改', labelEn: 'Inpaint',          icon: '🎯', desc: '涂抹区域局部替换',  descEn: 'Paint an area — AI replaces only that part', needsStyle: false, needsUpload: true  },
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd ai-room-designer && npx jest --testPathPattern="zenmux.test" --no-coverage 2>&1 | tail -20
```

Expected: PASS for the two new tests.

- [ ] **Step 6: Commit**

```bash
cd ai-room-designer && git add lib/orders.ts lib/design-config.ts __tests__/zenmux.test.ts
git commit -m "feat: add inpaint to DesignMode union and DESIGN_MODES"
```

---

### Task 2: Add inpaint prompt to buildStylePrompt

**Files:**
- Modify: `ai-room-designer/lib/zenmux.ts` (function `buildStylePrompt`, lines 24–95)
- Modify: `ai-room-designer/__tests__/zenmux.test.ts` (add inpaint prompt tests)

- [ ] **Step 1: Write the failing tests**

In `ai-room-designer/__tests__/zenmux.test.ts`, add after the existing inpaint DESIGN_MODES test:

```ts
test('buildStylePrompt for inpaint returns English prompt with customPrompt embedded', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'inpaint', 'living_room', 'a modern velvet sofa')
  expect(prompt).toContain('red-highlighted area')
  expect(prompt).toContain('a modern velvet sofa')
  expect(prompt).toContain('living room')
  expect(prompt).not.toContain('Nordic')  // style is ignored
})

test('buildStylePrompt for inpaint returns Chinese prompt with customPrompt embedded', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'premium', 'inpaint', 'bedroom', '一张现代风格的床头灯')
  expect(prompt).toContain('红色高亮区域')
  expect(prompt).toContain('一张现代风格的床头灯')
  expect(prompt).toContain('卧室')
  expect(prompt).not.toContain('北欧简约')  // style is ignored
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ai-room-designer && npx jest --testPathPattern="zenmux.test" --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `expect(prompt).toContain('red-highlighted area')` fails

- [ ] **Step 3: Add inpaint case to buildStylePrompt in lib/zenmux.ts**

In `buildStylePrompt`, find the line `if (mode === 'paint_walls') {` (around line 39). Add the inpaint case BEFORE this block:

```ts
  if (mode === 'inpaint') {
    const replacement = customPrompt?.trim() ?? 'something new'
    if (useEn) {
      return `This room photo has a red-highlighted area painted over it.\nReplace only the red-highlighted area with: ${replacement}.\nPreserve all non-highlighted areas exactly — keep all colors, materials, furniture, lighting, and layout unchanged outside the red area.\nRoom: ${roomHint}.`
    } else {
      return `这张房间照片上有一块红色高亮区域。\n只将红色高亮区域替换为：${replacement}。\n精确保留所有非高亮区域——保持红色区域外的所有颜色、材质、家具、灯光和布局完全不变。\n房间：${roomHint}。`
    }
  }
```

Place it right after the `const roomHint` block (before any other `if (mode === ...)`):

The structure should be:
```ts
export function buildStylePrompt(...) {
  const useEn = quality === 'standard'
  const room = findRoomType(roomType)
  const roomHint = useEn ? (room?.promptHint ?? 'a room') : (room?.promptHintCn ?? '房间')

  let base: string

  if (mode === 'inpaint') {        // ← ADD THIS BLOCK HERE
    const replacement = customPrompt?.trim() ?? 'something new'
    if (useEn) {
      return `This room photo has a red-highlighted area painted over it.\nReplace only the red-highlighted area with: ${replacement}.\nPreserve all non-highlighted areas exactly — keep all colors, materials, furniture, lighting, and layout unchanged outside the red area.\nRoom: ${roomHint}.`
    } else {
      return `这张房间照片上有一块红色高亮区域。\n只将红色高亮区域替换为：${replacement}。\n精确保留所有非高亮区域——保持红色区域外的所有颜色、材质、家具、灯光和布局完全不变。\n房间：${roomHint}。`
    }
  }

  if (mode === 'paint_walls') {    // ← existing code continues here
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ai-room-designer && npx jest --testPathPattern="zenmux.test" --no-coverage 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd ai-room-designer && git add lib/zenmux.ts __tests__/zenmux.test.ts
git commit -m "feat: add inpaint prompt builder to buildStylePrompt"
```

---

### Task 3: Update generate API and create-order API for inpaint mode

**Files:**
- Modify: `ai-room-designer/app/api/generate/route.ts` (lines 71–90)
- Modify: `ai-room-designer/app/api/create-order/route.ts` (add inpaint validation)
- Modify: `ai-room-designer/__tests__/api/create-order-overseas.test.ts` (add inpaint test)

- [ ] **Step 1: Write the failing test**

Open `ai-room-designer/__tests__/api/create-order-overseas.test.ts` and add at the end:

```ts
test('create-order overseas: inpaint mode requires referenceUploadId', async () => {
  process.env.NEXT_PUBLIC_REGION = 'overseas'
  process.env.REGION = 'overseas'
  const { POST } = await import('@/app/api/create-order/route')
  const req = new Request('http://localhost/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadId: 'upload_abc',
      mode: 'inpaint',
      roomType: 'living_room',
      customPrompt: 'a modern sofa',
      quality: 'standard',
      // referenceUploadId intentionally missing
    }),
  })
  const res = await POST(req as unknown as NextRequest)
  expect(res.status).toBe(400)
})
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd ai-room-designer && npx jest --testPathPattern="create-order-overseas" --no-coverage 2>&1 | tail -20
```

Expected: FAIL — test expects 400 but gets something else (no inpaint validation yet)

- [ ] **Step 4: Add inpaint validation to create-order route**

In `ai-room-designer/app/api/create-order/route.ts`, in the **overseas path** (after line 68 where style-match check ends):

```ts
      if (mode === 'style-match') {
        if (!referenceUploadId) return NextResponse.json({ error: ERR.uploadMissing }, { status: 400 })
        const refData = await getUploadData(referenceUploadId)
        if (!refData) return NextResponse.json({ error: ERR.fileNotFound }, { status: 400 })
      }
      // ← ADD AFTER style-match block:
      if (mode === 'inpaint') {
        if (!referenceUploadId) return NextResponse.json({ error: ERR.uploadMissing }, { status: 400 })
        if (!customPrompt?.trim()) return NextResponse.json({ error: ERR.invalidMode }, { status: 400 })
      }
```

Also add the same validation in the **CN path** (after line ~163, in the CN validation section after the style-match-like checks don't exist for CN — add it after `modeConfig.needsUpload && uploadId` check):

```ts
    if (modeConfig.needsUpload && uploadId) {
      const uploadData = await getUploadData(uploadId)
      if (!uploadData) return NextResponse.json({ error: ERR.fileNotFound }, { status: 400 })
    }
    // ← ADD AFTER:
    if (mode === 'inpaint') {
      if (!referenceUploadId) return NextResponse.json({ error: ERR.uploadMissing }, { status: 400 })
      if (!customPrompt?.trim()) return NextResponse.json({ error: ERR.invalidMode }, { status: 400 })
    }
```

- [ ] **Step 5: Update generate route to handle inpaint mode**

In `ai-room-designer/app/api/generate/route.ts`, after the existing reference image loading block (after line 80), add the inpaint swap:

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

    // ← ADD AFTER the referenceImagePath block:
    // Inpaint mode: the composite image (stored as referenceUploadId) is the primary image.
    // Swap it into imagePath; don't send a second image to the AI.
    if (order.mode === 'inpaint') {
      imagePath = referenceImagePath
      referenceImagePath = null
    }
```

- [ ] **Step 6: Run tests**

```bash
cd ai-room-designer && npx jest --testPathPattern="create-order-overseas" --no-coverage 2>&1 | tail -20
```

Expected: PASS for all tests including the new inpaint test.

- [ ] **Step 7: Commit**

```bash
cd ai-room-designer && git add app/api/generate/route.ts app/api/create-order/route.ts __tests__/api/create-order-overseas.test.ts
git commit -m "feat: handle inpaint mode in generate and create-order APIs"
```

---

### Task 4: Build InpaintCanvas component

**Files:**
- Create: `ai-room-designer/components/InpaintCanvas.tsx`

No automated tests for canvas API (requires a browser environment). The component will be manually verified in Task 5.

- [ ] **Step 1: Create the component file**

Create `ai-room-designer/components/InpaintCanvas.tsx` with this complete implementation:

```tsx
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import UploadZone from '@/components/UploadZone'

const CHIPS = [
  { label: 'Sofa', value: 'a modern sofa' },
  { label: 'Rug', value: 'a stylish area rug' },
  { label: 'Curtains', value: 'elegant curtains' },
  { label: 'Wall Color', value: 'a fresh wall color' },
  { label: 'Ceiling Light', value: 'a modern ceiling light fixture' },
  { label: 'Coffee Table', value: 'a coffee table' },
  { label: 'Plant', value: 'indoor plants' },
  { label: 'Lamp', value: 'a floor lamp' },
]

interface DisplayRect { dx: number; dy: number; dw: number; dh: number }

interface Props {
  onOriginalUpload: (uploadId: string) => void
  onCompositeReady: (getBlob: () => Promise<Blob>) => void
  onMaskChange: (hasMask: boolean) => void
  onPromptChange: (prompt: string) => void
}

export default function InpaintCanvas({ onOriginalUpload, onCompositeReady, onMaskChange, onPromptChange }: Props) {
  const [phase, setPhase] = useState<'upload' | 'paint'>('upload')
  const [brushSize, setBrushSize] = useState(40)
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [prompt, setPrompt] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const baseCanvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const displayRectRef = useRef<DisplayRect | null>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const hasStrokesRef = useRef(false)

  const drawBaseImage = useCallback((canvas: HTMLCanvasElement, img: HTMLImageElement): DisplayRect => {
    const cw = canvas.width, ch = canvas.height
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight)
    const dw = Math.round(img.naturalWidth * scale)
    const dh = Math.round(img.naturalHeight * scale)
    const dx = Math.round((cw - dw) / 2)
    const dy = Math.round((ch - dh) / 2)
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, cw, ch)
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, cw, ch)
    ctx.drawImage(img, dx, dy, dw, dh)
    return { dx, dy, dw, dh }
  }, [])

  const getBlob = useCallback((): Promise<Blob> => {
    const img = imgRef.current!
    const maskCanvas = maskCanvasRef.current!
    const { dx, dy, dw, dh } = displayRectRef.current!
    const offscreen = document.createElement('canvas')
    offscreen.width = img.naturalWidth
    offscreen.height = img.naturalHeight
    const ctx = offscreen.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    ctx.drawImage(maskCanvas, dx, dy, dw, dh, 0, 0, img.naturalWidth, img.naturalHeight)
    return new Promise<Blob>((resolve, reject) =>
      offscreen.toBlob((blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/jpeg', 0.92)
    )
  }, [])

  useEffect(() => {
    if (phase !== 'paint' || !imgRef.current || !containerRef.current) return
    const container = containerRef.current
    const baseCanvas = baseCanvasRef.current!
    const maskCanvas = maskCanvasRef.current!
    baseCanvas.width = container.clientWidth
    baseCanvas.height = container.clientHeight
    maskCanvas.width = container.clientWidth
    maskCanvas.height = container.clientHeight
    displayRectRef.current = drawBaseImage(baseCanvas, imgRef.current)
  }, [phase, drawBaseImage])

  const handleUpload = useCallback((uploadId: string, previewUrl: string) => {
    onOriginalUpload(uploadId)
    const img = new Image()
    img.src = previewUrl
    img.onload = () => {
      imgRef.current = img
      setPhase('paint')
    }
  }, [onOriginalUpload])

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = maskCanvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const paintAt = useCallback((x: number, y: number) => {
    const ctx = maskCanvasRef.current!.getContext('2d')!
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,1)'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgba(220, 38, 38, 0.55)'
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.55)'
    }
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
    if (lastPos.current) {
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
    lastPos.current = { x, y }
    ctx.globalCompositeOperation = 'source-over'

    if (!hasStrokesRef.current && tool === 'brush') {
      hasStrokesRef.current = true
      onMaskChange(true)
      onCompositeReady(getBlob)
    }
  }, [tool, brushSize, onMaskChange, onCompositeReady, getBlob])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    drawing.current = true
    lastPos.current = null
    const pos = getCanvasPos(e)
    paintAt(pos.x, pos.y)
  }, [paintAt, getCanvasPos])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing.current) return
    const pos = getCanvasPos(e)
    paintAt(pos.x, pos.y)
  }, [paintAt, getCanvasPos])

  const stopDrawing = useCallback(() => {
    drawing.current = false
    lastPos.current = null
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    drawing.current = true
    lastPos.current = null
    const pos = getCanvasPos(e)
    paintAt(pos.x, pos.y)
  }, [paintAt, getCanvasPos])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!drawing.current) return
    const pos = getCanvasPos(e)
    paintAt(pos.x, pos.y)
  }, [paintAt, getCanvasPos])

  const clearMask = useCallback(() => {
    const canvas = maskCanvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    hasStrokesRef.current = false
    onMaskChange(false)
  }, [onMaskChange])

  const handlePromptChange = (value: string) => {
    setPrompt(value)
    onPromptChange(value)
  }

  const handleChip = (value: string) => {
    handlePromptChange(value)
  }

  if (phase === 'upload') {
    return <UploadZone key="inpaint-room" onUpload={handleUpload} />
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Canvas editor */}
      <div
        ref={containerRef}
        className="relative w-full h-[260px] md:h-[340px] rounded-lg overflow-hidden bg-[#0a0a0a] select-none"
        style={{ touchAction: 'none' }}
      >
        <canvas ref={baseCanvasRef} className="absolute inset-0 w-full h-full" />
        <canvas
          ref={maskCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTool('brush')}
          className={`px-3 h-8 rounded text-sm font-medium transition-colors ${tool === 'brush' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          🖌️ Brush
        </button>
        <button
          type="button"
          onClick={() => setTool('eraser')}
          className={`px-3 h-8 rounded text-sm font-medium transition-colors ${tool === 'eraser' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          ⬜ Eraser
        </button>
        <input
          type="range"
          min={10}
          max={120}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="flex-1 accent-amber-500"
          title="Brush size"
        />
        <span className="text-gray-500 text-xs w-6 text-center">{brushSize}</span>
        <button
          type="button"
          onClick={clearMask}
          className="px-3 h-8 rounded text-sm text-gray-500 bg-gray-800 hover:bg-gray-700 transition-colors"
          title="Clear mask"
        >
          🗑️
        </button>
      </div>

      {/* Chips + text */}
      <div>
        <p className="text-gray-400 text-xs mb-2">Replace with:</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleChip(chip.value)}
              className={`px-3 h-7 rounded-full text-xs font-medium transition-colors border ${
                prompt === chip.value
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={prompt}
          onChange={(e) => handlePromptChange(e.target.value.slice(0, 150))}
          placeholder="or describe what to put here..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd ai-room-designer && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors related to InpaintCanvas.

- [ ] **Step 3: Commit**

```bash
cd ai-room-designer && git add components/InpaintCanvas.tsx
git commit -m "feat: add InpaintCanvas component with brush/eraser mask editor"
```

---

### Task 5: Wire InpaintCanvas into the generate page

**Files:**
- Modify: `ai-room-designer/app/generate/page.tsx`

- [ ] **Step 1: Add imports and new state to GeneratePageInner**

At the top of `app/generate/page.tsx`, add the InpaintCanvas import:

```ts
import InpaintCanvas from '@/components/InpaintCanvas'
```

In `GeneratePageInner`, after the existing `const [referenceUploadId, setReferenceUploadId] = useState<string | null>(null)` line, add:

```ts
  const [hasMask, setHasMask] = useState(false)
  const compositeBlobRef = useRef<(() => Promise<Blob>) | null>(null)
```

Also add `useRef` to the existing React import at the top of the file if not already present. Check line 2: it should already have `useRef` from the existing code.

- [ ] **Step 2: Update handleModeChange to always clear inpaint state**

Replace the existing `handleModeChange`:

```ts
  const handleModeChange = (newMode: DesignMode) => {
    setMode(newMode)
    if (newMode !== 'style-match') setReferenceUploadId(null)
  }
```

With:

```ts
  const handleModeChange = (newMode: DesignMode) => {
    setMode(newMode)
    setReferenceUploadId(null)
    setHasMask(false)
    setCustomPrompt('')
    compositeBlobRef.current = null
  }
```

- [ ] **Step 3: Update canGenerate to include inpaint conditions**

Replace:

```ts
  const canGenerate = !currentMode.needsUpload || (
    !!uploadId && (mode !== 'style-match' || !!referenceUploadId)
  )
```

With:

```ts
  const canGenerate = !currentMode.needsUpload || (
    !!uploadId &&
    (mode !== 'style-match' || !!referenceUploadId) &&
    (mode !== 'inpaint' || (hasMask && !!customPrompt.trim()))
  )
```

- [ ] **Step 4: Add inpaint branch at the start of handlePay**

In `handlePay`, after the existing guard at line 108:
```ts
  const handlePay = async () => {
    if (currentMode.needsUpload && !uploadId) { setError(s.errorUploadFirst); return }
    if (mode === 'style-match' && !referenceUploadId) { setError(s.errorUploadFirst); return }
```

Add inpaint guard and composite-upload block. The updated start of handlePay should be:

```ts
  const handlePay = async () => {
    if (currentMode.needsUpload && !uploadId) { setError(s.errorUploadFirst); return }
    if (mode === 'style-match' && !referenceUploadId) { setError(s.errorUploadFirst); return }
    if (mode === 'inpaint' && (!hasMask || !customPrompt.trim())) { setError('Paint the area to change and describe the replacement'); return }
    setError(null)
    setLoading(true)

    // Inpaint: composite original + mask → upload before creating order
    let inpaintCompositeId: string | undefined
    if (mode === 'inpaint') {
      try {
        const blob = await compositeBlobRef.current!()
        const fd = new FormData()
        fd.append('image', blob, 'composite.jpg')
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
        const upData = await upRes.json()
        if (!upRes.ok) throw new Error(upData.error ?? 'Upload failed')
        inpaintCompositeId = upData.uploadId
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process mask')
        setLoading(false)
        return
      }
    }

    try {
      const res = await fetch('/api/create-order', {
```

- [ ] **Step 5: Pass referenceUploadId for inpaint in the create-order fetch body**

Find the existing `body: JSON.stringify({ uploadId, referenceUploadId: mode === 'style-match' ? referenceUploadId : undefined, ...})`:

Replace with:

```ts
        body: JSON.stringify({
          uploadId,
          referenceUploadId: mode === 'style-match'
            ? referenceUploadId
            : mode === 'inpaint'
            ? inpaintCompositeId
            : undefined,
          style,
          quality,
          mode,
          roomType,
          customPrompt: customPrompt.trim() || undefined,
        }),
```

- [ ] **Step 6: Replace the left column upload zone with inpaint-aware rendering**

Find the left column section (around line 199). The current structure has `{mode === 'style-match' ? ... : ...}`. Update to add inpaint branch:

```tsx
        {/* ── Left column: Upload ── */}
        <div className="w-full md:w-[520px] flex flex-col gap-4">
          {mode === 'style-match' ? (
            <>
              <div>
                <h2 className="text-white text-base md:text-xl font-bold">Your Room</h2>
                <p className="text-gray-500 text-xs md:text-sm mt-1">Upload a photo of the room you want to redesign</p>
              </div>
              <UploadZone key="room" onUpload={(id) => setUploadId(id)} />
              <div>
                <h2 className="text-white text-base md:text-xl font-bold mt-2">Style Reference</h2>
                <p className="text-gray-500 text-xs md:text-sm mt-1">
                  Upload a photo whose style you want to copy — works great with Pinterest, Houzz, or magazine photos
                </p>
              </div>
              <UploadZone key="reference" onUpload={(id) => setReferenceUploadId(id)} />
            </>
          ) : mode === 'inpaint' ? (
            <>
              <div>
                <h2 className="text-white text-base md:text-xl font-bold">Paint the area to change</h2>
                <p className="text-gray-500 text-xs md:text-sm mt-1">Upload your room photo, then brush over the area you want to replace</p>
              </div>
              <InpaintCanvas
                key="inpaint"
                onOriginalUpload={(id) => setUploadId(id)}
                onCompositeReady={(getBlob) => { compositeBlobRef.current = getBlob }}
                onMaskChange={setHasMask}
                onPromptChange={(p) => setCustomPrompt(p)}
              />
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
                <UploadZone key="room" onUpload={(id) => setUploadId(id)} />
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

- [ ] **Step 7: Hide the custom prompt textarea for inpaint mode**

Find the custom prompt section (the `<button type="button" onClick={() => setCustomPromptOpen...}` block). Wrap it:

```tsx
          {/* Custom prompt — hidden for inpaint (InpaintCanvas has its own prompt input) */}
          {mode !== 'inpaint' && (
            <div>
              <button
                type="button"
                onClick={() => setCustomPromptOpen((v) => !v)}
                ...
              >
              ...
              </button>
            </div>
          )}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd ai-room-designer && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 9: Run all tests**

```bash
cd ai-room-designer && npx jest --no-coverage 2>&1 | tail -20
```

Expected: All passing.

- [ ] **Step 10: Commit**

```bash
cd ai-room-designer && git add app/generate/page.tsx
git commit -m "feat: wire InpaintCanvas into generate page for inpaint mode"
```

---

### Task 6: Add inpaint title to result page

**Files:**
- Modify: `ai-room-designer/app/result/[orderId]/page.tsx` (lines 225–236)

- [ ] **Step 1: Update the overseas title chain**

Find the `<h1>` title block (around line 224). The current overseas chain is:

```tsx
          {isOverseas
            ? (order.mode === 'paint_walls' ? 'Your wall repaint is ready'
              : order.mode === 'change_lighting' ? 'Your lighting redesign is ready'
              : order.mode === 'virtual_staging' ? `Your ${order.style} virtual staging is ready`
              : order.mode === 'add_furniture' ? `Your ${order.style} furnished design is ready`
              : order.mode === 'style-match' ? 'Your style-matched redesign is ready'
              : `Your ${order.style} redesign is ready`)
```

Add the inpaint case before the final fallback:

```tsx
          {isOverseas
            ? (order.mode === 'paint_walls' ? 'Your wall repaint is ready'
              : order.mode === 'change_lighting' ? 'Your lighting redesign is ready'
              : order.mode === 'virtual_staging' ? `Your ${order.style} virtual staging is ready`
              : order.mode === 'add_furniture' ? `Your ${order.style} furnished design is ready`
              : order.mode === 'style-match' ? 'Your style-matched redesign is ready'
              : order.mode === 'inpaint' ? 'Your inpainting result is ready'
              : `Your ${order.style} redesign is ready`)
```

- [ ] **Step 2: Update the CN title chain**

The current CN chain:

```tsx
            : (order.mode === 'paint_walls' ? '墙面换色效果图已生成'
              : order.mode === 'change_lighting' ? '灯光优化效果图已生成'
              : order.mode === 'virtual_staging' ? `您的${order.style}虚拟家装效果图已生成`
              : order.mode === 'add_furniture' ? `您的${order.style}家具效果图已生成`
              : `您的${order.style}装修效果图已生成`)}
```

Add inpaint before the final CN fallback:

```tsx
            : (order.mode === 'paint_walls' ? '墙面换色效果图已生成'
              : order.mode === 'change_lighting' ? '灯光优化效果图已生成'
              : order.mode === 'virtual_staging' ? `您的${order.style}虚拟家装效果图已生成`
              : order.mode === 'add_furniture' ? `您的${order.style}家具效果图已生成`
              : order.mode === 'inpaint' ? '局部修改效果图已生成'
              : `您的${order.style}装修效果图已生成`)}
```

- [ ] **Step 3: Verify TypeScript compiles and run tests**

```bash
cd ai-room-designer && npx tsc --noEmit 2>&1 | head -20 && npx jest --no-coverage 2>&1 | tail -10
```

Expected: No TS errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
cd ai-room-designer && git add app/result/[orderId]/page.tsx
git commit -m "feat: add inpaint result page title (overseas + CN)"
```

---

## Manual Verification Checklist

After all tasks complete, verify end-to-end:

1. `npm run dev` in `ai-room-designer` — starts without errors
2. Navigate to `/generate`, select "Inpaint" in mode selector — left column shows upload zone
3. Upload a room photo — canvas editor appears with image displayed
4. Paint red mask with brush — red overlay appears; toolbar works (eraser, size slider, clear)
5. Click a chip (e.g., "Sofa") — text input fills with "a modern sofa"
6. Generate button becomes active — click it
7. Composite upload happens (check Network tab for `/api/upload` POST with `composite.jpg`)
8. Order created, generation proceeds — result page shows "Your inpainting result is ready"
9. Switch from Inpaint to another mode — InpaintCanvas unmounts, prompt/mask state clears
10. CN dev mode (`NEXT_PUBLIC_REGION` not set): Inpaint mode appears and works, title shows in Chinese
