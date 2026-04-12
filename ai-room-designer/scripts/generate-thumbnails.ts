/**
 * Batch-generate style thumbnail images using Gemini.
 * Run: npx tsx scripts/generate-thumbnails.ts
 *
 * Skips thumbnails that already exist. Safe to re-run.
 */
import { GoogleGenAI } from '@google/genai'
import fs from 'fs'
import path from 'path'
import { STYLE_CATEGORIES } from '../lib/design-config'

const THUMBNAIL_DIR = path.join(process.cwd(), 'public', 'styles', 'thumbnails')

async function main() {
  const apiKey = process.env.ZENMUX_API_KEY
  if (!apiKey) {
    console.error('Error: ZENMUX_API_KEY environment variable is not set')
    process.exit(1)
  }

  const client = new GoogleGenAI({
    apiKey,
    vertexai: true,
    httpOptions: {
      baseUrl: 'https://zenmux.ai/api/vertex-ai',
      apiVersion: 'v1',
    },
  })

  fs.mkdirSync(THUMBNAIL_DIR, { recursive: true })

  const allStyles = STYLE_CATEGORIES.flatMap((c) => c.styles)
  console.log(`Generating thumbnails for ${allStyles.length} styles...`)

  for (const style of allStyles) {
    const outPath = path.join(THUMBNAIL_DIR, `${style.key}.jpg`)
    if (fs.existsSync(outPath)) {
      console.log(`  SKIP ${style.key} (already exists)`)
      continue
    }

    const prompt = `A professional interior design photo in ${style.promptEn} style. Compact square room view, beautiful natural lighting, photorealistic, high quality. No people, no text.`

    console.log(`  GEN  ${style.key} — ${style.label}`)
    try {
      const response = await client.models.generateContent({
        model: 'google/gemini-2.5-flash-image',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseModalities: ['IMAGE', 'TEXT'] },
      })

      const parts = response.candidates?.[0]?.content?.parts ?? []
      const imgPart = parts.find((p: { inlineData?: { data?: string } }) => p.inlineData?.data)
      if (!imgPart?.inlineData?.data) {
        console.warn(`  WARN ${style.key}: no image returned, skipping`)
        continue
      }

      fs.writeFileSync(outPath, Buffer.from(imgPart.inlineData.data, 'base64'))
      console.log(`  DONE ${style.key} → ${outPath}`)
    } catch (err) {
      console.error(`  ERR  ${style.key}:`, err)
    }

    // Rate limit: 500ms between requests
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log('Done.')
}

main().catch(console.error)
