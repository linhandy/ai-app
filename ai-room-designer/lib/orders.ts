import { createClient, Client } from '@libsql/client'
import crypto from 'crypto'
import path from 'path'

export type OrderStatus = 'pending' | 'paid' | 'generating' | 'done' | 'failed'
export type QualityTier = 'standard' | 'premium' | 'ultra'
export type DesignMode = 'redesign' | 'virtual_staging' | 'add_furniture' | 'paint_walls' | 'change_lighting' | 'sketch2render' | 'freestyle' | 'outdoor_redesign'

export interface Order {
  id: string
  status: OrderStatus
  style: string
  quality: QualityTier
  mode: DesignMode
  uploadId: string | null
  roomType: string
  customPrompt?: string
  resultUrl?: string
  alipayTradeNo?: string
  isFree?: boolean
  userId?: string
  createdAt: number
  updatedAt: number
}

function dbUrl(): string {
  const raw = process.env.ORDERS_DB ?? path.join(
    process.env.VERCEL ? '/tmp' : process.cwd(),
    'orders.db',
  )
  if (raw === ':memory:') return ':memory:'
  // Turso cloud URLs start with libsql:// — pass through as-is
  if (raw.startsWith('libsql://') || raw.startsWith('https://')) return raw
  return `file:${raw}`
}

// Singleton client — one connection per process
let _client: Client | null = null

/** Close and reset the client (used in tests to release the DB file lock). */
export function closeDb(): void {
  if (_client) {
    _client.close()
    _client = null
  }
}

export async function getClient(): Promise<Client> {
  if (_client) return _client

  const url = dbUrl()
  const authToken = process.env.LIBSQL_AUTH_TOKEN
  _client = createClient(authToken && url !== ':memory:' ? { url, authToken } : { url })

  await _client.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id            TEXT PRIMARY KEY,
      status        TEXT NOT NULL DEFAULT 'pending',
      style         TEXT NOT NULL,
      quality       TEXT NOT NULL DEFAULT 'standard',
      mode          TEXT NOT NULL DEFAULT 'redesign',
      uploadId      TEXT NOT NULL,
      resultUrl     TEXT,
      alipayTradeNo TEXT,
      createdAt     INTEGER NOT NULL,
      updatedAt     INTEGER NOT NULL
    )
  `)

  // Migration: add mode column for existing databases
  try {
    await _client.execute(`ALTER TABLE orders ADD COLUMN mode TEXT NOT NULL DEFAULT 'redesign'`)
  } catch {
    // Column already exists — ignore
  }

  // Migration: add roomType column for existing databases
  try {
    await _client.execute(`ALTER TABLE orders ADD COLUMN roomType TEXT NOT NULL DEFAULT 'living_room'`)
  } catch {
    // Column already exists — ignore
  }

  // Migration: add customPrompt column for existing databases
  try {
    await _client.execute(`ALTER TABLE orders ADD COLUMN customPrompt TEXT`)
  } catch {
    // Column already exists — ignore
  }

  // Migration: add is_free column for free tier
  try {
    await _client.execute(`ALTER TABLE orders ADD COLUMN is_free INTEGER NOT NULL DEFAULT 0`)
  } catch {
    // Column already exists — ignore
  }

  // Migration: add userId column for cloud history
  try {
    await _client.execute(`ALTER TABLE orders ADD COLUMN userId TEXT`)
  } catch {
    // Column already exists — ignore
  }

  return _client
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToOrder(row: Record<string, any>): Order {
  return {
    id: String(row.id),
    status: row.status as OrderStatus,
    style: String(row.style),
    quality: (row.quality ?? 'standard') as QualityTier,
    mode: (row.mode ?? 'redesign') as DesignMode,
    uploadId: row.uploadId === '' || row.uploadId == null ? null : String(row.uploadId),
    roomType: String(row.roomType ?? 'living_room'),
    customPrompt: row.customPrompt ?? undefined,
    resultUrl: row.resultUrl ?? undefined,
    alipayTradeNo: row.alipayTradeNo ?? undefined,
    isFree: Boolean(row.is_free),
    userId: row.userId ? String(row.userId) : undefined,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  }
}

export async function createOrder(params: {
  style: string
  uploadId?: string | null
  quality?: QualityTier
  mode?: DesignMode
  roomType?: string
  customPrompt?: string
  isFree?: boolean
  userId?: string
}): Promise<Order> {
  const client = await getClient()
  const order: Order = {
    id: `ord_${crypto.randomBytes(8).toString('hex')}`,
    status: 'pending',
    style: params.style,
    quality: params.quality ?? 'standard',
    mode: params.mode ?? 'redesign',
    uploadId: params.uploadId ?? null,
    roomType: params.roomType ?? 'living_room',
    customPrompt: params.customPrompt,
    isFree: params.isFree ?? false,
    userId: params.userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await client.execute({
    sql: `INSERT INTO orders (id, status, style, quality, mode, uploadId, roomType, customPrompt, is_free, userId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [order.id, order.status, order.style, order.quality, order.mode,
           order.uploadId ?? '',
           order.roomType, order.customPrompt ?? null,
           order.isFree ? 1 : 0,
           order.userId ?? null,
           order.createdAt, order.updatedAt],
  })

  return order
}

export async function getOrder(id: string): Promise<Order | null> {
  const client = await getClient()
  const result = await client.execute({
    sql: 'SELECT * FROM orders WHERE id = ?',
    args: [id],
  })

  if (result.rows.length === 0) return null
  return rowToOrder(result.rows[0])
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<Order | null> {
  const client = await getClient()

  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (patch.status !== undefined) { fields.push('status = ?'); values.push(patch.status) }
  if (patch.resultUrl !== undefined) { fields.push('resultUrl = ?'); values.push(patch.resultUrl ?? null) }
  if (patch.alipayTradeNo !== undefined) { fields.push('alipayTradeNo = ?'); values.push(patch.alipayTradeNo ?? null) }
  if (patch.isFree !== undefined) { fields.push('is_free = ?'); values.push(patch.isFree ? 1 : 0) }

  if (fields.length === 0) return getOrder(id)

  fields.push('updatedAt = ?')
  values.push(Date.now())
  values.push(id)

  await client.execute({
    sql: `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`,
    args: values,
  })

  return getOrder(id)
}

export async function getOrdersByUserId(userId: string, limit = 50): Promise<Order[]> {
  const client = await getClient()
  const result = await client.execute({
    sql: `SELECT * FROM orders
          WHERE userId = ? AND status = 'done'
          ORDER BY createdAt DESC
          LIMIT ?`,
    args: [userId, limit],
  })
  return result.rows.map(rowToOrder)
}
