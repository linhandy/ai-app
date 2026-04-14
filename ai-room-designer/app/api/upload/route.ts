import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { UPLOAD_DIR } from '@/lib/paths'
import { isRateLimited } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(`upload:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
  }

  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })

    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: '请上传图片文件' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG、PNG、WEBP 格式' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '图片大小不能超过 10MB' }, { status: 400 })
    }

    const ext = file.type === 'image/png' ? '.png' : '.jpg'
    const uploadId = `${crypto.randomBytes(12).toString('hex')}${ext}`
    const savePath = path.join(UPLOAD_DIR, uploadId)

    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(savePath, buffer)

    return NextResponse.json({ uploadId })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: '上传失败，请重试' }, { status: 500 })
  }
}
