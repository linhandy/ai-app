import sharp from 'sharp'

const WATERMARK_TEXT = '装AI'

/**
 * Applies a tiled diagonal "装AI" watermark to the input image buffer.
 * Returns a new PNG buffer with the watermark applied.
 */
export async function applyWatermark(inputBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(inputBuffer).metadata()
  const width = meta.width ?? 1024
  const height = meta.height ?? 1024

  // Build a single tile as SVG (150×80, text rotated -25°)
  const tileW = 150
  const tileH = 80
  const tileSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}">
      <text
        x="50%"
        y="55%"
        font-family="sans-serif"
        font-size="22"
        font-weight="bold"
        fill="white"
        fill-opacity="0.30"
        text-anchor="middle"
        dominant-baseline="middle"
        transform="rotate(-25, ${tileW / 2}, ${tileH / 2})"
      >${WATERMARK_TEXT}</text>
    </svg>
  `)

  // Tile the SVG across the full image
  const cols = Math.ceil(width / tileW) + 1
  const rows = Math.ceil(height / tileH) + 1
  const composites: sharp.OverlayOptions[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      composites.push({
        input: tileSvg,
        top: row * tileH,
        left: col * tileW,
      })
    }
  }

  return sharp(inputBuffer)
    .composite(composites)
    .png()
    .toBuffer()
}
