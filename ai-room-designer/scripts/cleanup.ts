/**
 * Cleanup expired uploads and generated images (older than 7 days).
 * Run via: npx tsx scripts/cleanup.ts
 * Schedule as cron job: 0 3 * * * cd /path/to/project && npx tsx scripts/cleanup.ts
 */
import fs from 'fs'
import path from 'path'
import { UPLOAD_DIR } from '../lib/paths'

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function cleanDirectory(dir: string): { deleted: number; errors: number } {
  let deleted = 0
  let errors = 0

  if (!fs.existsSync(dir)) return { deleted, errors }

  const now = Date.now()
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    try {
      const stat = fs.statSync(filePath)
      if (now - stat.mtimeMs > MAX_AGE_MS) {
        fs.unlinkSync(filePath)
        deleted++
      }
    } catch {
      errors++
    }
  }

  return { deleted, errors }
}

async function cleanOrders(): Promise<number> {
  const { createOrder: _c, getOrder: _g, updateOrder: _u, ...mod } = await import('../lib/orders')
  // Access the internal db via dynamic require so we can run DELETE directly
  // Simpler: just re-open the db file with sql.js and delete old rows
  const initSqlJs = (await import('sql.js')).default
  const dbFile = process.env.ORDERS_DB ?? path.join(process.cwd(), 'orders.db')
  if (!fs.existsSync(dbFile)) return 0
  void mod

  const SQL = await initSqlJs()
  const db = new SQL.Database(fs.readFileSync(dbFile))
  const cutoff = Date.now() - MAX_AGE_MS

  const result = db.exec(`SELECT COUNT(*) as n FROM orders WHERE createdAt < ${cutoff}`)
  const count = result[0]?.values?.[0]?.[0] as number ?? 0

  if (count > 0) {
    db.run(`DELETE FROM orders WHERE createdAt < ?`, [cutoff])
    fs.writeFileSync(dbFile, Buffer.from(db.export()))
  }

  db.close()
  return count
}

void (async () => {
  const uploads = cleanDirectory(UPLOAD_DIR)
  const orders = await cleanOrders()
  console.log(`[cleanup] Uploads: ${uploads.deleted} deleted, ${uploads.errors} errors`)
  console.log(`[cleanup] Orders: ${orders} expired entries removed`)
})()
