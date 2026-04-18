#!/usr/bin/env node
/**
 * Optimize homepage hero/showcase images in place.
 * Resizes to 1600x1200 cover and re-encodes as mozjpeg q82,
 * typically ~1.2MB -> ~250KB per file.
 *
 * Run after scripts/gen-homepage-images.ts:
 *   node scripts/optimize-homepage-images.mjs
 */
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const targets = [
  'public/styles/before-sample.jpg',
  'public/styles/hero-after.jpg',
  ...(fs.existsSync('public/homepage/before-after')
    ? fs.readdirSync('public/homepage/before-after').map((f) => `public/homepage/before-after/${f}`)
    : []),
]

for (const p of targets) {
  if (!fs.existsSync(p)) continue
  const before = fs.statSync(p).size
  const buf = await sharp(p)
    .resize(1600, 1200, { fit: 'cover' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()
  fs.writeFileSync(p, buf)
  const after = fs.statSync(p).size
  console.log(`${path.basename(p)}: ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`)
}
