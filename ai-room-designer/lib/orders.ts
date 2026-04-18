import type { Client } from '@libsql/client'
import { makeClient } from '@/lib/db-client'
import crypto from 'crypto'

export type OrderStatus = 'pending' | 'paid' | 'generating' | 'done' | 'failed'
export type QualityTier = 'standard' | 'premium' | 'ultra'
export type DesignMode = 'redesign' | 'virtual_staging' | 'add_furniture' | 'paint_walls' | 'change_lighting' | 'sketch2render' | 'freestyle' | 'outdoor_redesign' | 'style-match' | 'inpaint'

export interface Order {
  id: string
  status: OrderStatus
  style: string
  quality: QualityTier
  mode: DesignMode
  uploadId: string | null
  referenceUploadId?: string
  roomType: string
  customPrompt?: string
  resultUrl?: string
  alipayTradeNo?: string
  isFree?: boolean
  isPublicGallery?: boolean
  userId?: string
  createdAt: number
  updatedAt: number
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

  _client = makeClient()

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

  // Migration: add resultData column to store image bytes in DB (for serverless)
  try {
    await _client.execute(`ALTER TABLE orders ADD COLUMN resultData TEXT`)
  } catch {
    // Column already exists — ignore
  }

  // Migration: add resultStoragePath for Supabase Storage (replaces resultData for new orders)
  try {
    await _client.execute(`ALTER TABLE orders ADD COLUMN resultStoragePath TEXT`)
  } catch {
    // Column already exists — ignore
  }

  // Migration: add isPublicGallery for public gallery opt-in
  try {
    await _client.execute(`ALTER TABLE orders ADD COLUMN isPublicGallery INTEGER NOT NULL DEFAULT 0`)
  } catch {
    // Column already exists — ignore
  }

  // Migration: add referenceUploadId for style-match mode
  try {
    await _client.execute(`ALTER TABLE orders ADD COLUMN referenceUploadId TEXT`)
  } catch {
    // Column already exists — ignore
  }

  // Uploads table — stores raw uploaded images so they persist across serverless invocations
  await _client.execute(`
    CREATE TABLE IF NOT EXISTS uploads (
      id        TEXT PRIMARY KEY,
      data      TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    )
  `)

  // Migration: add storagePath for Supabase Storage (replaces data blob for new uploads)
  try {
    await _client.execute(`ALTER TABLE uploads ADD COLUMN storagePath TEXT`)
  } catch {
    // Column already exists — ignore
  }

  // Credits table — tracks per-user credit balance
  await _client.execute(`
    CREATE TABLE IF NOT EXISTS credits (
      owner TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0,
      total_purchased INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )
  `)

  // Subscriptions table for overseas Stripe plans
  await _client.execute(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                   TEXT PRIMARY KEY,
      userId               TEXT NOT NULL,
      stripeCustomerId     TEXT,
      stripeSubscriptionId TEXT,
      plan                 TEXT NOT NULL DEFAULT 'free',
      status               TEXT NOT NULL DEFAULT 'active',
      currentPeriodEnd     INTEGER,
      generationsUsed      INTEGER NOT NULL DEFAULT 0,
      createdAt            INTEGER NOT NULL
    )
  `)
  try { await _client.execute(`ALTER TABLE subscriptions ADD COLUMN generationsUsed INTEGER NOT NULL DEFAULT 0`) } catch { /* already exists */ }

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
    referenceUploadId: row.referenceUploadId ? String(row.referenceUploadId) : undefined,
    roomType: String(row.roomType ?? 'living_room'),
    customPrompt: row.customPrompt ?? undefined,
    resultUrl: row.resultUrl ?? undefined,
    alipayTradeNo: row.alipayTradeNo ?? undefined,
    isFree: Boolean(row.is_free),
    isPublicGallery: Boolean(row.isPublicGallery),
    userId: row.userId ? String(row.userId) : undefined,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  }
}

export async function createOrder(params: {
  style: string
  uploadId?: string | null
  referenceUploadId?: string
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
    referenceUploadId: params.referenceUploadId,
    roomType: params.roomType ?? 'living_room',
    customPrompt: params.customPrompt,
    isFree: params.isFree ?? false,
    isPublicGallery: false,
    userId: params.userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await client.execute({
    sql: `INSERT INTO orders (id, status, style, quality, mode, uploadId, referenceUploadId, roomType, customPrompt, is_free, userId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [order.id, order.status, order.style, order.quality, order.mode,
           order.uploadId ?? '',
           order.referenceUploadId ?? null,
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
  if (patch.isPublicGallery !== undefined) { fields.push('isPublicGallery = ?'); values.push(patch.isPublicGallery ? 1 : 0) }

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

/** Save an uploaded image — uploads to Supabase Storage, records path in DB. */
export async function saveUploadData(uploadId: string, data: Buffer): Promise<void> {
  const { uploadToStorage, uploadStoragePath } = await import('@/lib/storage')
  const storagePath = uploadStoragePath(uploadId)
  const mimeType = uploadId.endsWith('.png') ? 'image/png'
    : uploadId.endsWith('.webp') ? 'image/webp'
    : 'image/jpeg'
  await uploadToStorage(storagePath, data, mimeType)
  const client = await getClient()
  // data column kept as empty string to satisfy NOT NULL; storagePath is the canonical reference
  await client.execute({
    sql: `INSERT OR REPLACE INTO uploads (id, data, storagePath, createdAt) VALUES (?, ?, ?, ?)`,
    args: [uploadId, '', storagePath, Date.now()],
  })
}

/** Read an uploaded image — tries Supabase Storage first, falls back to DB base64 for old rows. */
export async function getUploadData(uploadId: string): Promise<Buffer | null> {
  const { downloadFromStorage, uploadStoragePath } = await import('@/lib/storage')
  // Try Storage first (new path)
  const fromStorage = await downloadFromStorage(uploadStoragePath(uploadId))
  if (fromStorage) return fromStorage
  // Backward compat: fall back to DB base64 for pre-migration rows
  const client = await getClient()
  const result = await client.execute({
    sql: `SELECT data FROM uploads WHERE id = ?`,
    args: [uploadId],
  })
  if (result.rows.length === 0) return null
  const raw = String(result.rows[0].data ?? '')
  if (!raw) return null
  return Buffer.from(raw, 'base64')
}

/** Store a generated result image — uploads to Supabase Storage, records path in DB. */
export async function setOrderResultData(id: string, data: Buffer): Promise<void> {
  const { uploadToStorage, resultStoragePath } = await import('@/lib/storage')
  const storagePath = resultStoragePath(id)
  await uploadToStorage(storagePath, data, 'image/png')
  const client = await getClient()
  // Only update resultStoragePath; leave resultData untouched for backward compat reads
  await client.execute({
    sql: `UPDATE orders SET resultStoragePath = ?, updatedAt = ? WHERE id = ?`,
    args: [storagePath, Date.now(), id],
  })
}

/** Read a stored result image — tries Supabase Storage first, falls back to DB base64 for old rows. */
export async function getOrderResultData(id: string): Promise<Buffer | null> {
  const { downloadFromStorage } = await import('@/lib/storage')
  const client = await getClient()
  const result = await client.execute({
    sql: `SELECT resultData, resultStoragePath FROM orders WHERE id = ?`,
    args: [id],
  })
  if (result.rows.length === 0) return null
  const row = result.rows[0]
  // New path: fetch from Supabase Storage
  if (row.resultStoragePath) {
    const buf = await downloadFromStorage(String(row.resultStoragePath))
    if (buf) return buf
  }
  // Backward compat: DB base64 for pre-migration rows
  if (!row.resultData) return null
  return Buffer.from(String(row.resultData), 'base64')
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
