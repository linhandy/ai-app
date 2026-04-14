import sharp from 'sharp'
import { readdir, stat, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIR = join(__dirname, '..', 'public', 'styles', 'thumbnails')

async function main() {
  const files = (await readdir(DIR)).filter(f => f.endsWith('.jpg'))
  let totalBefore = 0
  let totalAfter = 0

  for (const file of files) {
    const fp = join(DIR, file)
    const before = (await stat(fp)).size
    totalBefore += before

    const buffer = await sharp(fp)
      .resize(800, 600, { fit: 'cover' })
      .jpeg({ quality: 75, progressive: true })
      .toBuffer()

    await writeFile(fp, buffer)
    totalAfter += buffer.length

    console.log(`${file}: ${(before / 1024).toFixed(0)}KB → ${(buffer.length / 1024).toFixed(0)}KB`)
  }

  console.log(`\nTotal: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB`)
  console.log(`Saved: ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(1)}MB`)
}

main().catch(console.error)
