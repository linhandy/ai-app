#!/usr/bin/env node
/**
 * One-shot repair script for ai-room-designer-overseas Vercel env vars.
 *
 * Context: all env vars were stored with a trailing literal newline,
 * causing Google OAuth "invalid_client" (the client_id string included "\n").
 *
 * Reads .env.vercel.pulled (produced by `vercel env pull`), strips trailing
 * newlines from every value, and re-uploads cleanly via `vercel env add`.
 *
 * Usage:
 *   node scripts/fix-vercel-env.mjs .env.vercel.pulled
 *   node scripts/fix-vercel-env.mjs .env.vercel.pulled --only=GOOGLE_CLIENT_ID,NEXTAUTH_URL  (dry run specific vars)
 *   node scripts/fix-vercel-env.mjs .env.vercel.pulled --dry
 */
import fs from 'node:fs'
import { spawn } from 'node:child_process'

const SKIP = new Set([
  'NX_DAEMON', 'TURBO_CACHE', 'TURBO_DOWNLOAD_LOCAL_ENABLED',
  'TURBO_REMOTE_ONLY', 'TURBO_RUN_SUMMARY',
  'VERCEL', 'VERCEL_ENV', 'VERCEL_OIDC_TOKEN', 'VERCEL_TARGET_ENV', 'VERCEL_URL',
  'VERCEL_GIT_COMMIT_AUTHOR_LOGIN', 'VERCEL_GIT_COMMIT_AUTHOR_NAME',
  'VERCEL_GIT_COMMIT_MESSAGE', 'VERCEL_GIT_COMMIT_REF',
  'VERCEL_GIT_COMMIT_SHA', 'VERCEL_GIT_PREVIOUS_SHA',
  'VERCEL_GIT_PROVIDER', 'VERCEL_GIT_PULL_REQUEST_ID',
  'VERCEL_GIT_REPO_ID', 'VERCEL_GIT_REPO_OWNER', 'VERCEL_GIT_REPO_SLUG',
])

const args = process.argv.slice(2)
const filePath = args.find((a) => !a.startsWith('--'))
const dryRun = args.includes('--dry')
const onlyArg = args.find((a) => a.startsWith('--only='))
const onlyList = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null

if (!filePath) {
  console.error('Usage: node fix-vercel-env.mjs <path-to-pulled-env> [--dry] [--only=KEY1,KEY2]')
  process.exit(2)
}

const raw = fs.readFileSync(filePath, 'utf8')

function parseDotenv(text) {
  const out = new Map()
  const re = /^([A-Z_][A-Z0-9_]*)=("((?:[^"\\]|\\.)*)"|(.*))$/gm
  let m
  while ((m = re.exec(text)) !== null) {
    const key = m[1]
    const quoted = m[3]
    const unquoted = m[4]
    let value
    if (quoted !== undefined) {
      value = quoted
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
    } else {
      value = unquoted ?? ''
    }
    out.set(key, value)
  }
  return out
}

const pulled = parseDotenv(raw)

function run(cmd, args, stdinValue) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'], shell: process.platform === 'win32' })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d.toString() })
    child.stderr.on('data', (d) => { stderr += d.toString() })
    child.on('close', (code) => resolve({ code, stdout, stderr }))
    child.on('error', reject)
    if (stdinValue !== undefined) {
      child.stdin.write(stdinValue) // intentionally no trailing newline
      child.stdin.end()
    } else {
      child.stdin.end()
    }
  })
}

const affected = []
for (const [key, value] of pulled) {
  if (SKIP.has(key)) continue
  if (onlyList && !onlyList.has(key)) continue
  const hadTrailingNewline = /[\n\r]+$/.test(value)
  if (!hadTrailingNewline) continue
  affected.push({ key, clean: value.replace(/[\n\r]+$/, '') })
}

console.log(`Found ${affected.length} vars needing repair:`)
for (const { key, clean } of affected) {
  const preview = clean.length > 40 ? clean.slice(0, 12) + '…' + clean.slice(-12) : clean
  console.log(`  ${key}  →  ${JSON.stringify(preview)}  (len=${clean.length})`)
}
if (dryRun) {
  console.log('\nDry run — no changes written.')
  process.exit(0)
}

console.log('\nStarting repair. Each variable is removed from production and re-added clean.\n')
let fails = 0
for (const { key, clean } of affected) {
  process.stdout.write(`[${key}] rm... `)
  const rm = await run('vercel', ['env', 'rm', key, 'production', '--yes'])
  if (rm.code !== 0 && !/not found|does not exist/i.test(rm.stderr)) {
    console.log(`rm failed:\n${rm.stderr}`)
    fails++
    continue
  }
  process.stdout.write('add... ')
  const add = await run('vercel', ['env', 'add', key, 'production'], clean)
  if (add.code !== 0) {
    console.log(`add failed:\n${add.stderr}`)
    fails++
    continue
  }
  console.log('OK')
}

if (fails > 0) {
  console.error(`\n${fails} vars failed. See messages above.`)
  process.exit(1)
}
console.log('\nAll variables repaired successfully.')
