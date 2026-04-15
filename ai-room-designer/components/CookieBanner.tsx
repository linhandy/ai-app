'use client'
import { useEffect, useState } from 'react'
import { GoogleAnalytics } from '@next/third-parties/google'

const CONSENT_KEY = 'cookie_consent'

export default function CookieBanner({ gaId }: { gaId: string }) {
  const [consent, setConsent] = useState<'accepted' | 'declined' | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY) as 'accepted' | 'declined' | null
    if (stored) {
      setConsent(stored)
    } else {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setConsent('accepted')
    setVisible(false)
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, 'declined')
    setConsent('declined')
    setVisible(false)
  }

  return (
    <>
      {consent === 'accepted' && <GoogleAnalytics gaId={gaId} />}
      {visible && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-gray-900 border-t border-gray-800 px-6 py-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <p className="text-gray-300 text-sm">
              We use cookies to improve your experience and analyze usage.{' '}
              <a href="/privacy" className="underline hover:text-white">Privacy Policy</a>
            </p>
            <div className="flex gap-3 shrink-0">
              <button onClick={decline} className="text-gray-400 text-sm hover:text-white transition-colors">Decline</button>
              <button onClick={accept} className="bg-amber-500 text-black text-sm font-semibold px-4 py-1.5 rounded hover:bg-amber-400 transition-colors">Accept</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
