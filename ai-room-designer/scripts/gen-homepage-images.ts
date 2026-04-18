/**
 * Generate homepage hero before/after image sets using Gemini.
 * Run: ZENMUX_API_KEY=xxx npx tsx scripts/gen-homepage-images.ts
 *
 * Produces:
 *   - public/styles/before-sample.jpg  (hero before)
 *   - public/styles/hero-after.jpg     (hero after — Nordic)
 *   - public/homepage/before-after/<slug>-before.jpg
 *   - public/homepage/before-after/<slug>-after.jpg  (one per STYLE_SET entry)
 *
 * Run once, commit outputs, deploy. Safe to re-run — overwrites existing files.
 */
import { GoogleGenAI } from '@google/genai'
import fs from 'fs'
import path from 'path'

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const STYLES_DIR = path.join(PUBLIC_DIR, 'styles')
const SHOWCASE_DIR = path.join(PUBLIC_DIR, 'homepage', 'before-after')
const MODEL = 'google/gemini-2.5-flash-image'

const BEFORE_PROMPT = `A realistic photograph of a plain, ordinary Chinese apartment living room, approximately 25 square meters. Beige painted walls, basic laminate floor, a simple dark brown fabric sofa against the back wall, a small wooden coffee table, a basic TV stand with a flat screen TV, one window on the right wall with simple curtains letting in natural daylight. The room is clean and tidy but completely undecorated — no artwork, no plants, no design elements. Ordinary white ceiling light. The space has potential but looks bland and uninspiring. Camera at eye level from the doorway, showing the full room layout including walls, floor and ceiling. Photorealistic interior photograph, natural lighting, no people, no filters.`

const STYLE_SET: { slug: string; label: string; afterPrompt: string }[] = [
  {
    slug: 'nordic',
    label: 'Scandinavian',
    afterPrompt: `Transform this room into a stunning Nordic minimalist living room while keeping the exact same room layout, window position, and camera angle. Light grey linen sofa, low-profile oak coffee table, floating wooden shelves, a large fiddle-leaf fig plant, matte white pendant light. Crisp white walls, light oak hardwood floor, sheer white curtains. Airy, calm, magazine-worthy. Professional interior design photography, warm afternoon sunlight, editorial quality.`,
  },
  {
    slug: 'japanese-muji',
    label: 'Japanese Muji',
    afterPrompt: `Transform this room into a Japanese Muji-style living room while keeping the exact same room layout, window position, and camera angle. Low natural wood furniture, tatami-inspired floor area, cotton linen textiles in beige and off-white, a single ikebana arrangement, paper lantern pendant. Warm wood tones throughout, zen negative space, soft diffused light. Refined simplicity, peaceful and ordered. Photorealistic interior photograph, editorial quality.`,
  },
  {
    slug: 'modern-luxury',
    label: 'Modern Luxury',
    afterPrompt: `Transform this room into a modern luxury living room while keeping the exact same room layout, window position, and camera angle. A velvet charcoal sectional sofa, marble coffee table with brass accents, statement crystal chandelier, large abstract wall art, floor-to-ceiling sheer drapes. Grey-toned walls, herringbone wood floor. Rich, sophisticated, editorial interior photography with dramatic warm lighting.`,
  },
  {
    slug: 'industrial',
    label: 'Industrial Loft',
    afterPrompt: `Transform this room into an industrial loft living room while keeping the exact same room layout, window position, and camera angle. Exposed brick accent wall, dark leather chesterfield sofa, metal-frame coffee table, Edison bulb pendant lights, vintage trunk as side table. Concrete-grey walls, dark distressed wood floor, exposed black metal fixtures. Moody, masculine, high-end loft photography.`,
  },
]

function getClient() {
  const apiKey = process.env.ZENMUX_API_KEY
  if (!apiKey) {
    console.error('Error: ZENMUX_API_KEY environment variable is not set')
    process.exit(1)
  }
  return new GoogleGenAI({
    apiKey,
    vertexai: true,
    httpOptions: { baseUrl: 'https://zenmux.ai/api/vertex-ai', apiVersion: 'v1' },
  })
}

async function generateImage(prompt: string, outputPath: string, inputImagePath?: string): Promise<void> {
  const client = getClient()
  const contentParts: { inlineData?: { mimeType: string; data: string }; text?: string }[] = []
  if (inputImagePath) {
    const imageBuffer = fs.readFileSync(inputImagePath)
    const base64Image = imageBuffer.toString('base64')
    const mimeType = inputImagePath.endsWith('.png') ? 'image/png' : 'image/jpeg'
    contentParts.push({ inlineData: { mimeType, data: base64Image } })
  }
  contentParts.push({ text: prompt })

  console.log(`  Generating: ${path.basename(outputPath)}...`)

  const response = await client.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: contentParts }],
    config: { responseModalities: ['IMAGE', 'TEXT'] },
  })

  const parts = response.candidates?.[0]?.content?.parts ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
  if (!imagePart?.inlineData) throw new Error(`No image returned for ${outputPath}`)

  const buffer = Buffer.from(imagePart.inlineData!.data!, 'base64')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, buffer)
  console.log(`  Saved ${path.basename(outputPath)} (${(buffer.length / 1024).toFixed(0)} KB)`)
}

async function main() {
  // 1. Shared "before" image (plain undecorated room).
  const sharedBefore = path.join(STYLES_DIR, 'before-sample.jpg')
  console.log('Step 1: Generating shared "before" image...')
  await generateImage(BEFORE_PROMPT, sharedBefore)

  // 2. Hero "after" (Nordic) — reused in hero section.
  const heroAfter = path.join(STYLES_DIR, 'hero-after.jpg')
  console.log('\nStep 2: Generating hero "after" (Nordic) image...')
  await generateImage(STYLE_SET[0].afterPrompt, heroAfter, sharedBefore)

  // 3. Showcase pairs — one before/after per style for the BeforeAfter slider.
  console.log('\nStep 3: Generating showcase before/after pairs...')
  for (const { slug, label, afterPrompt } of STYLE_SET) {
    console.log(`  [${label}]`)
    const beforeOut = path.join(SHOWCASE_DIR, `${slug}-before.jpg`)
    const afterOut = path.join(SHOWCASE_DIR, `${slug}-after.jpg`)
    fs.copyFileSync(sharedBefore, beforeOut)
    await generateImage(afterPrompt, afterOut, sharedBefore)
  }

  console.log('\nDone. Generated images live under public/styles/ and public/homepage/before-after/.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
