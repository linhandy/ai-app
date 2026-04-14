import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { UPLOAD_DIR } from '@/lib/paths'
import { getUploadData } from '@/lib/orders'

export async function GET(req: NextRequest) {
  const uploadId = req.nextUrl.searchParams.get('uploadId')

  if (!uploadId) return new Response('Bad request', { status: 400 })

  // Prevent path traversal
  const resolved = path.resolve(path.join(UPLOAD_DIR, uploadId))
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
    return new Response('Forbidden', { status: 403 })
  }

  const ext = path.extname(uploadId).toLowerCase()
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg'

  // Try filesystem first (local dev), then DB (serverless)
  if (fs.existsSync(resolved)) {
    const buffer = fs.readFileSync(resolved)
    return new Response(buffer, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
    })
  }

  const dbBuffer = await getUploadData(uploadId)
  if (dbBuffer) {
    return new Response(dbBuffer.buffer as ArrayBuffer, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
    })
  }

  return new Response('Not found', { status: 404 })
}
