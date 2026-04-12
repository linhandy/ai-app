import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { UPLOAD_DIR } from '@/lib/paths'

export async function GET(req: NextRequest) {
  const uploadId = req.nextUrl.searchParams.get('uploadId')

  if (!uploadId) return new Response('Bad request', { status: 400 })

  // Prevent path traversal
  const resolved = path.resolve(path.join(UPLOAD_DIR, uploadId))
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
    return new Response('Forbidden', { status: 403 })
  }

  if (!fs.existsSync(resolved)) return new Response('Not found', { status: 404 })

  const ext = path.extname(uploadId).toLowerCase()
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg'
  const buffer = fs.readFileSync(resolved)

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
