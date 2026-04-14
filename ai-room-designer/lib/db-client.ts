/**
 * Returns the correct @libsql/client based on the environment:
 * - Vercel (serverless): uses @libsql/client/web — pure HTTP/WebSocket, no native bindings
 * - Local dev: uses @libsql/client — supports file: URLs for local SQLite
 */
import type { Client, Config } from '@libsql/client'
import path from 'path'

export function dbUrl(): string {
  const raw = process.env.ORDERS_DB ?? path.join(
    process.env.VERCEL ? '/tmp' : process.cwd(),
    'orders.db',
  )
  if (raw === ':memory:') return ':memory:'
  if (raw.startsWith('libsql://') || raw.startsWith('https://')) return raw
  return `file:${raw}`
}

export function makeClient(): Client {
  const url = dbUrl()
  const authToken = process.env.LIBSQL_AUTH_TOKEN
  const config: Config = authToken && url !== ':memory:' ? { url, authToken } : { url }

  // On Vercel (or any env with a remote ORDERS_DB URL), use the web client
  // to avoid issues with native bindings in serverless environments.
  if (url.startsWith('libsql://') || url.startsWith('https://')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client/web') as typeof import('@libsql/client')
    return createClient(config)
  }

  // Local dev: use the full client that supports file: and :memory: URLs
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@libsql/client') as typeof import('@libsql/client')
  return createClient(config)
}
