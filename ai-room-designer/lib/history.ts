export interface HistoryItem {
  orderId: string
  style: string
  quality: string
  mode?: string
  createdAt: number
}

const STORAGE_KEY = 'zhuangai_history'
const MAX_ITEMS = 20

export function saveToHistory(item: HistoryItem): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getHistory()
    const filtered = existing.filter((h) => h.orderId !== item.orderId)
    const updated = [item, ...filtered].slice(0, MAX_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HistoryItem[]) : []
  } catch {
    return []
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
