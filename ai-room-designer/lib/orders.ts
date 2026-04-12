import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export type OrderStatus = 'pending' | 'paid' | 'generating' | 'done' | 'failed'

export interface Order {
  id: string
  status: OrderStatus
  style: string
  uploadId: string
  resultUrl?: string
  alipayTradeNo?: string
  createdAt: number
  updatedAt: number
}

function dbPath(): string {
  return process.env.ORDERS_FILE ?? path.join(process.cwd(), 'orders.json')
}

function readAll(): Record<string, Order> {
  try {
    const raw = fs.readFileSync(dbPath(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function writeAll(db: Record<string, Order>): void {
  fs.writeFileSync(dbPath(), JSON.stringify(db, null, 2), 'utf-8')
}

export function createOrder(params: { style: string; uploadId: string }): Order {
  const db = readAll()
  const order: Order = {
    id: `ord_${crypto.randomBytes(8).toString('hex')}`,
    status: 'pending',
    style: params.style,
    uploadId: params.uploadId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  db[order.id] = order
  writeAll(db)
  return order
}

export function getOrder(id: string): Order | null {
  const db = readAll()
  return db[id] ?? null
}

export function updateOrder(id: string, patch: Partial<Order>): Order | null {
  const db = readAll()
  if (!db[id]) return null
  db[id] = { ...db[id], ...patch, updatedAt: Date.now() }
  writeAll(db)
  return db[id]
}
