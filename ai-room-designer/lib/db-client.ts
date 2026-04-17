/**
 * Thin wrapper to create the correct libsql client.
 * Both @libsql/client and @libsql/client/web are listed in
 * serverComponentsExternalPackages so webpack won't bundle them.
 */
import type { Client, Config } from '@libsql/client'
import path from 'path'

// Static top-level imports so webpack sees them as external (not dynamic requires)
// @libsql/client/web — pure HTTP/WebSocket, works on serverless without native bindings
import { createClient as createClientWeb } from '@libsql/client/web'
// @libsql/client — full client supporting file: and :memory: for local dev
import { createClient as createClientNode } from '@libsql/client'

export function dbUrl(): string {
  const raw = (process.env.ORDERS_DB ?? path.join(
    process.env.VERCEL ? '/tmp' : process.cwd(),
    'orders.db',
  )).trim()
  if (raw === ':memory:') return ':memory:'
  if (raw.startsWith('libsql://') || raw.startsWith('https://')) return raw
  return `file:${raw}`
}

export function makeClient(): Client {
  const url = dbUrl()
  const authToken = process.env.LIBSQL_AUTH_TOKEN
  const config: Config = authToken && url !== ':memory:' ? { url, authToken } : { url }

  // Remote Turso URLs — use the web client (no native bindings)
  if (url.startsWith('libsql://') || url.startsWith('https://')) {
    return createClientWeb(config)
  }

  // Local dev (file: or :memory:) — use the full Node.js client
  return createClientNode(config)
}
