import { createClient } from '@supabase/supabase-js'

const BUCKET = 'room-designer'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  return createClient(url, key)
}

/** Upload a buffer to Supabase Storage. Throws on error. */
export async function uploadToStorage(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const { error } = await getAdminClient()
    .storage.from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true })
  if (error) throw new Error(`Storage upload failed [${storagePath}]: ${error.message}`)
}

/** Download a file from Supabase Storage. Returns null if not found. */
export async function downloadFromStorage(storagePath: string): Promise<Buffer | null> {
  const { data, error } = await getAdminClient()
    .storage.from(BUCKET)
    .download(storagePath)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

/** Get the public CDN URL of a Storage object (no network call). */
export function getPublicUrl(storagePath: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const { data } = createClient(url, key).storage.from(BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

/** Storage path for a user-uploaded image. */
export function uploadStoragePath(uploadId: string): string {
  return `uploads/${uploadId}`
}

/** Storage path for an AI-generated result image. */
export function resultStoragePath(orderId: string): string {
  return `results/${orderId}.png`
}
