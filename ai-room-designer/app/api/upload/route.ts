import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { UPLOAD_DIR } from '@/lib/paths'
import { isRateLimited } from '@/lib/rate-limit'
import { saveUploadData } from '@/lib/orders'
import { isOverseas } from '@/lib/region'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(`upload:${ip}`, 20, 60_000)) {
    const msg = isOverseas ? 'Too many requests, please try again later' : '请求过于频繁，请稍后再试'
    return NextResponse.json({ error: msg }, { status: 429 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      const msg = isOverseas ? 'Please upload an image file' : '请上传图片文件'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      const msg = isOverseas ? 'Only JPG, PNG, WEBP formats are supported' : '仅支持 JPG、PNG、WEBP 格式'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      const msg = isOverseas ? 'Image size cannot exceed 10MB' : '图片大小不能超过 10MB'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const ext = file.type === 'image/png' ? '.png' : file.type === 'image/webp' ? '.webp' : '.jpg'
    const uploadId = `${crypto.randomBytes(12).toString('hex')}${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    // Save to DB for serverless persistence across function invocations
    await saveUploadData(uploadId, buffer)

    // Also write to disk as fallback for local dev
    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
      fs.writeFileSync(path.join(UPLOAD_DIR, uploadId), buffer)
    } catch {
      // Disk write is best-effort; DB is the source of truth
    }

    return NextResponse.json({ uploadId })
  } catch (err) {
    console.error('[upload]', err)
    const msg = isOverseas ? 'Upload failed, please try again' : '上传失败，请重试'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
