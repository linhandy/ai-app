'use client'
import { useEffect } from 'react'
import { saveToHistory } from '@/lib/history'

interface Props {
  orderId: string
  style: string
  quality: string
  mode?: string
  createdAt: number
}

export default function SaveToHistory({ orderId, style, quality, mode, createdAt }: Props) {
  useEffect(() => {
    saveToHistory({ orderId, style, quality, mode: mode ?? 'redesign', createdAt })
  }, [orderId, style, quality, mode, createdAt])

  return null
}
