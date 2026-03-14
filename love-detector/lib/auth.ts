// Simple token generation and validation
export function generateToken(code: string): string {
  const payload = { code, ts: Date.now() }
  return btoa(JSON.stringify(payload))
}

export function validateToken(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token))
    return !!payload.code && !!payload.ts
  } catch {
    return false
  }
}

export const ACCESS_KEY = 'ld_access'

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  const token = localStorage.getItem(ACCESS_KEY)
  if (!token) return false
  return validateToken(token)
}
