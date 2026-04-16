// lib/region.ts
// NEXT_PUBLIC_REGION is accessible in both server and client components.
// REGION is server-only — used as fallback for API routes.
export const REGION = ((process.env.NEXT_PUBLIC_REGION ?? process.env.REGION ?? 'cn').trim()) as 'cn' | 'overseas'
export const isOverseas = REGION === 'overseas'
export const isCN = REGION === 'cn'
