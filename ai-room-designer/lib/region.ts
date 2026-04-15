// lib/region.ts
export const REGION = ((process.env.REGION ?? 'cn').trim()) as 'cn' | 'overseas'
export const isOverseas = REGION === 'overseas'
export const isCN = REGION === 'cn'
