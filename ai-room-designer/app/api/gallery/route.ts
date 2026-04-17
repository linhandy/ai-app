import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/orders'

export async function GET(req: NextRequest) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'))
  const style = req.nextUrl.searchParams.get('style') ?? ''
  const roomType = req.nextUrl.searchParams.get('roomType') ?? ''
  const limit = 24
  const offset = (page - 1) * limit

  const db = await getClient()

  let where = `WHERE isPublicGallery = 1 AND status = 'done' AND resultUrl IS NOT NULL`
  const args: (string | number)[] = []

  if (style) {
    where += ` AND style = ?`
    args.push(style)
  }
  if (roomType) {
    where += ` AND roomType = ?`
    args.push(roomType)
  }

  const countResult = await db.execute({ sql: `SELECT COUNT(*) as c FROM orders ${where}`, args })
  const total = Number(countResult.rows[0].c)

  const queryArgs = [...args, limit, offset]
  const result = await db.execute({
    sql: `SELECT id, style, roomType, resultUrl, createdAt FROM orders ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
    args: queryArgs,
  })

  const items = result.rows.map(row => ({
    id: String(row.id),
    style: String(row.style),
    roomType: String(row.roomType),
    resultUrl: String(row.resultUrl),
    createdAt: Number(row.createdAt),
  }))

  return NextResponse.json({ items, page, totalPages: Math.ceil(total / limit), total })
}
