# Competitive Roadmap Design
**Date:** 2026-04-16  
**Project:** ai-room-designer (overseas)  
**Scope:** Four-phase product roadmap to compete with and surpass InteriorAI.com

---

## Context

**Competitive target:** InteriorAI.com  
**Their strengths:** Brand authority, 3D walkthroughs, before/after video, parallel generation  
**Their weaknesses:** $49–199/month (no free tier), web-only (no mobile), poor detail control  
**Our advantages:** 5–10× cheaper, China market coverage, free trial hook, pay-per-use option

**Current stage:** Cold start (overseas)  
**Growth channel:** SEO — combination of tool-first and content-first  
**Hook strategy:** 3 free HD no-watermark generations on signup (currently 3 watermarked)

---

## Phase 1 — Launch Ready (1–2 weeks)

Goal: Make the product worthy of a Product Hunt / Reddit launch.

### 1.1 Free Tier Upgrade

**Change:** New overseas users get 3 HD watermark-free generations (currently 3 with watermark).

- Modify `lib/region-config.ts`: `freeGenerations: 3`, `freeWatermark: false`
- Subscription table already tracks usage; apply the same limit logic
- Show remaining free count in NavBar and on Generate page CTA
- After 3 uses, prompt upgrade with a clear before/after of what they got for free

**Why:** Watermarked results are not shareable. Free users need a real "wow" moment to convert and share. This is the hook.

### 1.2 Public Result Pages

**Change:** Every generated result has a permanent public URL at `/result/:id` accessible without login.

- Result page already exists; remove the auth gate for viewing
- Add full OG meta tags: `og:image` (the result image), `og:title` ("Nordic bedroom redesign by AI"), `og:description` with style + room type
- Add structured data (schema.org `ImageObject`) for Google image indexing
- Show "Create your own →" CTA prominently for unauthenticated viewers
- Do NOT expose private order details (payment info, upload source) on public view

**Why:** Every share of a result is an inbound link and a conversion opportunity. Currently results are gated.

### 1.3 Style + Room Type Landing Pages

**Change:** Auto-generate 64+ SEO landing pages from existing data.

- Route: `/styles/[slug]` (e.g., `/styles/nordic`, `/styles/art-deco`) — 40+ pages
- Route: `/rooms/[slug]` (e.g., `/rooms/bedroom`, `/rooms/cafe`) — 24+ pages
- Each page: H1 with keyword, 2–3 sentence description, 6+ example images from result gallery, CTA to try
- Images sourced from a curated seed set initially; replaced by real user results as gallery grows
- Static generation (`generateStaticParams`) for performance and SEO
- Canonical URLs, hreflang, and sitemap entries auto-included

**Why:** 64 pages covering "nordic bedroom AI design", "art deco living room AI" etc. captures long-tail search traffic with zero ongoing content effort.

---

## Phase 2 — SEO Content Foundation (2–4 weeks)

Goal: Build a compounding content asset that drives organic traffic indefinitely.

### 2.1 Blog Infrastructure

- MDX-based blog at `/blog`
- 5–10 seed articles targeting high-intent keywords:
  - "How to virtually stage a living room" (virtual staging intent)
  - "Nordic bedroom design ideas" → links to `/styles/nordic`
  - "Best AI interior design tools 2026" (comparison content)
- Each article embeds a live tool demo or links to relevant style page
- Schema.org `Article` markup, auto-generated sitemap entries

### 2.2 Public Results Gallery

- Route: `/gallery` — paginated grid of user-consented result images
- Filter by style, room type
- Each image links to the public result page (`/result/:id`)
- User opt-in at result page: "Add to public gallery" toggle
- Default: private. Incentivize with +1 bonus generation for opting in (stacks on top of the 3 free — applies to all users, not just new signups).
- Provides a stream of fresh, Google-indexable content at no content cost

**DB change:** Add `is_public_gallery: boolean` column to `orders` table.

### 2.3 Referral Program

- After signup: "Share your invite link — you and your friend each get 1 extra free generation"
- Referral tracked via existing `ref` query param + `referrals` table
- Cap: max 5 bonus generations per user via referral (prevents abuse)
- Display referral status on Account page

---

## Phase 3 — Product Differentiation (4–8 weeks)

Goal: Attack InteriorAI's known weaknesses. Build after Phase 1–2 traffic validates direction.

### 3.1 Reference Photo Style Copy

**Feature:** Upload a reference photo (e.g., a room you saw on Pinterest) → AI extracts its visual style and applies it to your room photo.

- New mode added to the Generate page mode selector: "Match a Style"
- Two upload slots: "Your room" + "Style reference"
- Backend: send both images to generation API with a style-transfer prompt
- No new DB schema needed; `mode` field stores `"style-match"`, `reference_url` stored alongside `upload_url`
- InteriorAI calls this "copy any photo" — it's one of their top Pro features

**Why:** The most common user journey on the internet is "I saw this room on Instagram, I want mine to look like that." We currently have no answer for this.

### 3.2 Inpainting / Local Edit (Magic Editor)

**Feature:** After generation, user can paint a mask over a region and request a targeted re-generation of only that area.

- New "Edit" button on result page opens editor view
- Canvas with brush tool to paint a mask (red overlay)
- Submit mask + optional text prompt → regenerate masked area only
- Each inpaint costs 1 credit / counts as 1 generation
- Backend: pass mask image to generation API (requires API support for inpainting — verify with current provider ZenMux/OpenAI)
- Store inpaint results as child orders linked to parent order

**Why:** InteriorAI's #1 user complaint is "can't control specific details." This directly addresses it and moves us from "AI tool" to "AI design editor."

**Risk:** Requires inpainting API support. Verify provider capability before committing to timeline.

---

## Phase 4 — Growth Features (8–12 weeks)

Goal: Increase ARPU, cover professional users, exploit competitor's mobile gap.

### 4.1 Before/After Video Generation

- Generate a 10–15 second video showing the room transformation
- Integration with video generation API (Runway Gen-3 / Kling / similar)
- Available as a one-time add-on purchase or on higher subscription tiers
- Output: MP4 shareable directly to TikTok / Instagram Reels
- This turns every result into a piece of marketing content

**Risk:** Dependent on third-party video API cost and quality. Evaluate after Phase 3.

### 4.2 Mobile PWA Enhancement

InteriorAI is web-only with no mobile app. Opportunity to win mobile search and app stores.

- Enable camera capture on mobile (direct photo from phone camera to upload)
- Add-to-homescreen prompt with custom icon and splash screen
- Offline result caching (view past designs without connection)
- Push notifications for generation completion
- Target: experience indistinguishable from a native app on iOS/Android

### 4.3 Batch / Parallel Generation

- Generate 4–8 style variations in a single submission
- Results shown as a comparison grid
- Unlocked on a new higher tier (e.g., $29.99/month "Designer" plan)
- Targets real estate agents and interior designers — matches InteriorAI's core Pro use case

---

## Success Metrics

| Phase | Key Metric | Target |
|-------|-----------|--------|
| Phase 1 | Signups from Product Hunt launch | 500+ in first week |
| Phase 1 | Free → Paid conversion rate | ≥ 5% |
| Phase 2 | Organic search impressions | 10k+/month by end of Phase 2 |
| Phase 3 | Retention (D30) | ≥ 20% |
| Phase 4 | ARPU | 2× Phase 1 baseline |

---

## Out of Scope

- **3D immersive walkthroughs** — technically complex, no clear ROI at this stage
- **Native iOS/Android app** — PWA covers the gap; native app requires separate submission and review cycle
- **China region changes** — this roadmap is overseas-only; CN region is stable
