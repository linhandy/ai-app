'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('ld_access')
    if (!token) {
      router.push('/')
    }
  }, [router])

  return <>{children}</>
}
