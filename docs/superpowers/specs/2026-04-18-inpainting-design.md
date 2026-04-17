# Inpainting Feature Design
**Date:** 2026-04-18
**Project:** ai-room-designer (CN + Overseas)
**Scope:** "Inpaint" mode — let users paint a mask over part of their room photo and have the AI replace only that area

---

## Context

**Goal:** Let users select a specific area of their room (sofa, rug, wall, etc.) and replace it with something new, while the rest of the room stays exactly the same.

**Competitive context:** InteriorAI's inpainting is one of their top-used Pro features. Implementing it as a standard mode (not Pro-only) is a direct competitive counter.

**Approach:** Visual overlay compositing — the client paints a red mask on the photo, composites it into a single image, and sends that to Gemini with a prompt instructing it to "replace the red area with X". No true inpainting API is used; Gemini's visual understanding handles it. This works with the existing ZenMux/Gemini infrastructure.

**Region:** Both CN and overseas.

---

## User Flow

1. User opens Generate page → selects **Inpaint** mode in the mode selector
2. Left column changes to the two-step `InpaintCanvas` editor:
   - **Step 1 (upload state):** UploadZone as normal — user uploads their room photo
   - **Step 2 (paint state):** Once uploaded, the UploadZone is replaced by the canvas editor showing the room photo with a drawing overlay
3. User paints the red mask over the area to change using the toolbar:
   - 🖌️ Brush (default) / ⬜ Eraser toggle
   - Brush size slider
   - 🗑️ Clear all button
4. Below the canvas, chip buttons appear: **Sofa · Rug · Curtains · Wall Color · Ceiling Light · Coffee Table · Plant · Lamp** + free-text input ("Replace with...")
   - Clicking a chip prefills the text box; user can edit further
5. Generate button activates once: room photo uploaded + mask painted (at least one stroke) + replacement text filled
6. On Generate click:
   - Client composites original image + red mask using `<canvas>` → `canvas.toBlob()` → POST `/api/upload` → receives `compositeId`
   - POST `/api/create-order` with `{ uploadId, referenceUploadId: compositeId, customPrompt, mode: 'inpaint', roomType }`
   - Normal generate flow from there

---

## Generate Page UI

File: `app/generate/page.tsx`

When `mode === 'inpaint'`:
- Left column renders `<InpaintCanvas>` instead of `<UploadZone>`
- `canGenerate` requires: `!!uploadId && hasMask && !!customPrompt.trim()` (for inpaint mode)
- `hasMask` is a page-level state updated via `InpaintCanvas`'s `onMaskChange` callback
- On Generate click (`handlePay`), for inpaint mode: call `getCompositeBlob()` → POST `/api/upload` → receive `compositeId` → set as `referenceUploadId` → then proceed to create-order
- Style selector: hidden (same as style-match — `needsStyle: false`)
- Room type selector: visible
- Existing custom prompt textarea: hidden (replaced by chips + inline text in `InpaintCanvas`)

`handleModeChange` always clears `referenceUploadId`, `hasMask`, and `customPrompt` on any mode change (not just when leaving style-match). Current code `if (newMode !== 'style-match') setReferenceUploadId(null)` must be replaced with unconditional clear.

---

## InpaintCanvas Component

File: `components/InpaintCanvas.tsx` (new)

```ts
interface Props {
  onOriginalUpload: (uploadId: string) => void
  onCompositeReady: (getBlob: () => Promise<Blob>) => void  // called once mask exists; parent calls getBlob() at submit time
  onMaskChange: (hasMask: boolean) => void
  onPromptChange: (prompt: string) => void
}
```

**Internal state:**
- `phase: 'upload' | 'paint'` — switches after original upload
- `originalImage: HTMLImageElement | null` — loaded from preview URL
- `brushSize: number` — default 40, range 10–120
- `tool: 'brush' | 'eraser'`
- `hasMask: boolean` — true once any brush stroke made
- `prompt: string`

**Canvas rendering:**
- Two `<canvas>` layers stacked via `position: absolute`:
  1. **Base layer**: original image drawn with `drawImage()`
  2. **Mask layer**: `globalCompositeOperation = 'source-over'`, brush strokes in `rgba(220, 38, 38, 0.55)` (Tailwind red-600 at 55% opacity)
- Eraser uses `globalCompositeOperation = 'destination-out'` on mask layer

**Compositing (via `getCompositeBlob` exposed through `onCompositeReady` callback):**
- Called by parent at submit time (not eagerly)
- Create offscreen canvas at original image's native resolution
- Draw original image full-size
- Scale and draw mask layer on top (scale from display canvas dimensions to native resolution)
- Return `canvas.toBlob('image/jpeg', 0.92)` as a `Blob`
- Parent POSTs the blob to `/api/upload` → receives `compositeId` → sets as `referenceUploadId`

`onCompositeReady` is called once after the first brush stroke, passing a `getBlob: () => Promise<Blob>` function. Parent stores this function and calls it at submit time.

**Toolbar layout (below canvas):**
```
[🖌️ Brush] [⬜ Eraser]   [━━━●━━] size   [🗑️ Clear]
```

**Chips row (below toolbar):**
```
Sofa  Rug  Curtains  Wall Color  Ceiling Light  Coffee Table  Plant  Lamp
[Replace with... free text input]
```

Chip click: sets `prompt` to e.g. `"a modern velvet sofa"`. User can edit the text box freely.

---

## Data Model

**No new database columns required.** Existing fields are reused:

| Field | Inpaint mode meaning |
|-------|---------------------|
| `uploadId` | Original room photo (stored, used for result page reference) |
| `referenceUploadId` | Composite image = original + red mask overlay (sent to Gemini) |
| `customPrompt` | Replacement description, e.g. "a modern velvet sofa" |
| `mode` | `'inpaint'` |

### DesignMode union type (`lib/orders.ts`)

Add `'inpaint'` to the `DesignMode` union:
```ts
export type DesignMode = 'redesign' | 'virtual_staging' | 'add_furniture' | 'paint_walls' | 'change_lighting' | 'sketch2render' | 'freestyle' | 'outdoor_redesign' | 'style-match' | 'inpaint'
```

---

## `lib/design-config.ts` — DESIGN_MODES entry

```ts
{
  key: 'inpaint',
  label: '局部修改',
  labelEn: 'Inpaint',
  icon: '🎯',
  description: 'Paint over an area — AI replaces only that part',
  needsUpload: true,
  needsStyle: false,
  needsRoomType: true,
}
```

---

## `lib/zenmux.ts` — generateRoomImage()

When `mode === 'inpaint'`:
- Load `referenceUploadId` content (the composite image) as the image to send
- Prompt template:

```
This room photo has a red-highlighted area painted over it.
Replace only the red-highlighted area with: {customPrompt}.
Preserve all non-highlighted areas exactly — keep all colors, materials, furniture, lighting, and layout unchanged outside the red area.
Room type: {roomType}
```

- Send as single `inlineData` part (same single-image path as standard modes)
- No `referenceImagePath` needed; `params.imagePath` = path to composite file

---

## `app/api/generate/route.ts`

When `order.mode === 'inpaint'`:
- Load image from `order.referenceUploadId` (the composite) instead of `order.uploadId`
- Write to temp file, pass as `imagePath` to `generateRoomImage()`
- `uploadId` is not loaded (original photo is not sent to AI)

---

## Result Page

File: `app/result/[orderId]/page.tsx`

- Title (overseas): `"Your inpainting result is ready"`
- Title (CN): `"局部改造效果图已生成"`
- No before/after slider for inpaint mode — just show the result image
  - Rationale: the composite "before" includes the red mask overlay, which is visually confusing as a "before" image. The result is self-explanatory.
- History label: `"Inpaint"` (auto-derived from mode key)

---

## Out of Scope

- **True mask inpainting API (Imagen 3):** Deferred — current approach uses Gemini visual understanding. Can be upgraded later if ZenMux adds Imagen 3 inpainting support.
- **Lasso / polygon selection tools:** Brush + eraser is sufficient for v1.
- **Undo/redo history:** Eraser covers the basic need; full undo stack is future work.
- **Mobile touch drawing:** Mouse/touch events should work, but mobile UX is not a primary target for this editor.
- **Result page before/after for inpaint:** Not shown (red-overlay composite is not a clean "before" image).

---

## Success Criteria

- User can select Inpaint mode, upload a room photo, paint a mask, pick a chip or type a custom description, and receive a generated result
- The AI modifies only the masked area; the rest of the room is preserved
- Mode appears in history with label "Inpaint"
- Works in both CN and overseas builds
- No regressions in other generation modes
