# Style Match Feature Design
**Date:** 2026-04-17
**Project:** ai-room-designer (overseas)
**Scope:** Phase 3 — "Match a Style" mode: apply the visual style from a reference photo to a user's room

---

## Context

**Goal:** Let users upload a reference photo (Pinterest screenshot, magazine photo, Instagram room) and have the AI extract its visual style and apply it to their own room photo.

**Competitive context:** InteriorAI calls this "copy any photo" — one of their top Pro features. We implement it as a first-class generation mode, not a Pro-only upsell.

**Existing architecture:**
- Mode-driven generation: `DESIGN_MODES` in `lib/design-config.ts` controls UI behavior per mode (`needsUpload`, `needsStyle`, `needsRoomType`)
- AI via Gemini through ZenMux proxy (`lib/zenmux.ts`), images sent as base64 `inlineData`
- Orders stored in Turso/libsql; uploads stored in Supabase Storage
- Region-gated: overseas only (behind `isOverseas` build-time constant)

---

## Interaction Design

**Entry point:** New mode option "Match a Style" in the Generate page mode selector (alongside existing modes: Redesign, Virtual Staging, etc.)

**Upload arrangement:** Two vertically stacked upload slots:
1. **Your Room** (top) — the user's room photo (primary image)
2. **Style Reference** (bottom) — a photo whose style the user wants to copy

Both slots must be filled before the Generate button activates.

**Style selector:** Hidden in this mode (the reference photo is the style source).

**Room type selector:** Retained — helps AI understand the room's structural type.

---

## Data Model

### orders table — new column

```sql
ALTER TABLE orders ADD COLUMN reference_upload_id TEXT;
```

- `reference_upload_id` — references the style reference photo in the uploads table
- Existing `upload_id` — references the user's room photo (unchanged)
- Both use the same uploads table and `/api/upload` endpoint; the front-end calls upload twice and receives two IDs

### Order interface (`lib/orders.ts`)

Add optional field:
```ts
referenceUploadId?: string
```

---

## API Changes

### `/api/generate` (route.ts)

- Accept `referenceUploadId` in the request body alongside existing `uploadId`
- Read reference image from DB/storage using the same pattern as `uploadId`
- Pass `referenceImagePath` to `generateRoomImage()`
- Store `reference_upload_id` on the created order record

### `lib/zenmux.ts` — `generateRoomImage()`

New parameter:
```ts
referenceImagePath?: string
```

When `mode === 'style-match'` and `referenceImagePath` is provided:
- Load both images as base64
- Send both as `inlineData` parts in a single Gemini request
- Prompt template:

```
Apply the interior design style from the reference photo to the room in the main photo.
Preserve the room's architectural structure and dimensions.
Match the style: colors, materials, furniture style, lighting mood, and decorative aesthetic.
Room type: {roomType}
```

Single API call — no two-step extraction, no extra latency or cost.

---

## Generate Page UI

File: `app/generate/page.tsx` (and related client components)

When mode is `style-match`:

1. **Dual upload zone** replaces the single upload zone:
   - Slot 1: "Your Room" — primary room photo
   - Slot 2: "Style Reference" — style inspiration photo
   - Helper text under slot 2: "Works great with Pinterest, Houzz, or magazine photos"
2. **Style selector** (`StyleSelector` component): hidden
3. **Room type selector**: visible as normal
4. **Generate button**: disabled until both slots are filled

Submit flow:
1. Upload room photo → receive `uploadId`
2. Upload reference photo → receive `referenceUploadId`
3. POST to `/api/orders` with both IDs + `mode: 'style-match'`
4. Redirect to result page (same as other modes)

---

## Result Page

File: `app/result/[orderId]/page.tsx`

- Title: `"Your style-matched redesign is ready"` (when `order.mode === 'style-match'`)
- Before/After comparison: room photo as "before", generated result as "after" (unchanged logic)
- Reference photo is **not displayed** on the result page (copyright sensitivity)
- History label: `"Match a Style"` (auto-derived from mode key)

No other changes needed on result page.

---

## `lib/design-config.ts` — DESIGN_MODES entry

```ts
{
  key: 'style-match',
  label: 'Match a Style',
  labelEn: 'Match a Style',
  description: 'Upload a style photo — AI copies its look to your room',
  needsUpload: true,
  needsStyle: false,
  needsRoomType: true,
}
```

---

## Out of Scope

- **CN region**: This mode is overseas-only. Style-match is hidden when `!isOverseas`.
- **Reference photo display on result page**: Not shown to avoid copyright issues.
- **Reference photo in gallery**: `isPublicGallery` opt-in covers only the result image; reference is never made public.
- **Inpainting / local edit**: Deferred to a future sprint.

---

## Success Criteria

- User can select "Match a Style", upload two photos, and receive a generated result
- Generated result visually reflects the style of the reference photo
- Room structure of the original photo is preserved (walls, dimensions)
- Mode appears in history with label "Match a Style"
- No regressions in existing generation modes
