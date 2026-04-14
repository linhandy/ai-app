/** Simple in-memory rate limiter using sliding window. */
const hits = new Map<string, number[]>()

export function isRateLimited(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now()
  const windowStart = now - windowMs

  let timestamps = hits.get(key) ?? []
  timestamps = timestamps.filter((t) => t > windowStart)
  timestamps.push(now)
  hits.set(key, timestamps)

  return timestamps.length > maxRequests
}

/** Clean up old entries periodically (call from a timer or on each request). */
export function cleanupRateLimiter(): void {
  const now = Date.now()
  hits.forEach((timestamps, key) => {
    const recent = timestamps.filter((t: number) => t > now - 60_000)
    if (recent.length === 0) {
      hits.delete(key)
    } else {
      hits.set(key, recent)
    }
  })
}
