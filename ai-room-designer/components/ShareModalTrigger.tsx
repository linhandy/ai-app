'use client'
import { useEffect, useState } from 'react'
import ShareModal from './ShareModal'

interface Props {
  orderId: string
  style: string
  pageUrl: string
  resultUrl: string
}

export default function ShareModalTrigger({ orderId, style, pageUrl, resultUrl }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const key = `share_modal_shown_${orderId}`
    if (sessionStorage.getItem(key)) return
    const timer = setTimeout(() => {
      sessionStorage.setItem(key, '1')
      setShow(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [orderId])

  if (!show) return null
  return (
    <ShareModal
      orderId={orderId}
      style={style}
      pageUrl={pageUrl}
      resultUrl={resultUrl}
      onClose={() => setShow(false)}
    />
  )
}
