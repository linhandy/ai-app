'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import UploadZone from '@/components/UploadZone'
import StyleSelector from '@/components/StyleSelector'
import RoomTypeSelector from '@/components/RoomTypeSelector'
import PaymentModal from '@/components/PaymentModal'
import PackagePurchaseModal from '@/components/PackagePurchaseModal'
import { DESIGN_MODES } from '@/lib/design-config'
import type { DesignMode } from '@/lib/orders'
import { saveToHistory } from '@/lib/history'
import { isOverseas } from '@/lib/region'
import { regionConfig } from '@/lib/region-config'

const QUALITY_OPTIONS = [
  { key: 'standard', label: '标准', labelEn: 'Standard', price: 1, resolution: '1024px', color: 'border-gray-700 text-gray-300' },
  { key: 'premium',  label: '高清', labelEn: 'HD',       price: 3, resolution: '2048px', color: 'border-amber-500 text-amber-500' },
  { key: 'ultra',    label: '超清', labelEn: '4K',       price: 5, resolution: '4096px', color: 'border-purple-500 text-purple-400' },
] as const

export default function GeneratePage() {
  return (
    <Suspense>
      <GeneratePageInner />
    </Suspense>
  )
}

function GeneratePageInner() {
  const s = regionConfig.strings
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuality = searchParams.get('quality') ?? 'standard'

  const [uploadId, setUploadId] = useState<string | null>(null)
  const [style, setStyle] = useState('nordic_minimal')
  const [quality, setQuality] = useState(initialQuality)
  const [mode, setMode] = useState<DesignMode>('redesign')
  const [roomType, setRoomType] = useState('living_room')
  const [customPrompt, setCustomPrompt] = useState('')
  const [customPromptOpen, setCustomPromptOpen] = useState(false)

  const currentMode = DESIGN_MODES.find((m) => m.key === mode) ?? DESIGN_MODES[0]
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null)
  const [creditBalance, setCreditBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payModal, setPayModal] = useState<{ orderId: string; qrDataUrl: string; amount: number } | null>(null)
  const [buyPackageModal, setBuyPackageModal] = useState<{
    orderId: string; qrDataUrl: string; amount: number; count: number; label: string
  } | null>(null)
  const [generating, setGenerating] = useState(false)

  const currentOption = QUALITY_OPTIONS.find((o) => o.key === quality) ?? QUALITY_OPTIONS[0]
  const canGenerate = !currentMode.needsUpload || !!uploadId

  const initialPackageId = searchParams.get('package')
  const packagePurchaseTriggeredRef = useRef(false)

  useEffect(() => {
    fetch('/api/credits/balance')
      .then(r => r.json())
      .then(d => setCreditBalance(d.balance ?? 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!initialPackageId || packagePurchaseTriggeredRef.current) return
    packagePurchaseTriggeredRef.current = true
    // Auto-call buy-package API for the specified package
    fetch('/api/buy-package', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: initialPackageId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.credited) {
          // DEV_SKIP_PAYMENT mode — credits already added
          setCreditBalance(prev => prev + (data.count ?? 0))
          return
        }
        if (data.qrDataUrl) {
          setBuyPackageModal({
            orderId: data.orderId,
            qrDataUrl: data.qrDataUrl,
            amount: data.amount,
            count: data.count,
            label: initialPackageId === 'pkg_5' ? '基础包' : initialPackageId === 'pkg_10' ? '进阶包' : '专业包',
          })
        }
      })
      .catch(() => {})
  }, [initialPackageId])

  const handlePay = async () => {
    if (currentMode.needsUpload && !uploadId) { setError(s.errorUploadFirst); return }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, style, quality, mode, roomType, customPrompt: customPrompt.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Save to history immediately so user can navigate away during generation
      saveToHistory({ orderId: data.orderId, style, quality, mode, createdAt: Date.now() })

      if (data.devSkip) {
        setGenerating(true)
        const genRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId }),
        })
        const genData = await genRes.json()
        if (!genRes.ok) throw new Error(genData.error || s.errorGenFailed)
        router.push(`/result/${data.orderId}`)
        return
      }

      if (data.creditUsed) {
        setGenerating(true)
        const genRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId }),
        })
        const genData = await genRes.json()
        if (!genRes.ok) throw new Error(genData.error || s.errorGenFailed)
        setCreditBalance(prev => Math.max(0, prev - 1))
        router.push(`/result/${data.orderId}`)
        return
      }

      if (isOverseas) {
        setGenerating(true)
        const genRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId }),
        })
        const genData = await genRes.json()
        if (!genRes.ok) throw new Error(genData.error || s.errorGenFailed)
        router.push(`/result/${data.orderId}`)
        return
      }

      if (data.isFree) {
        setFreeRemaining(0)
      } else if (typeof data.remainingFreeUses === 'number') {
        setFreeRemaining(data.remainingFreeUses)
      }
      setPayModal({ orderId: data.orderId, qrDataUrl: data.qrDataUrl, amount: currentOption.price })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : s.errorOrderFailed
      setError(message)
      setGenerating(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black pb-24 md:pb-0">
      {/* Nav */}
      <nav className="flex items-center px-4 md:px-[120px] h-14 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-sm">
            {isOverseas ? 'R' : '装'}
          </div>
          <span className="font-bold text-lg">{isOverseas ? 'RoomAI' : '装AI'}</span>
        </Link>
        <div className="flex-1" />
        <span className="text-gray-600 text-xs hidden sm:block">
          {currentMode.needsUpload ? s.generateNavHint : s.generateNavHintFree}
        </span>
      </nav>

      <div className="flex flex-col md:flex-row px-4 md:px-[120px] pt-6 md:pt-12 pb-4 md:pb-16 gap-6 md:gap-10 items-start">

        {/* ── Left column: Upload ── */}
        <div className="w-full md:w-[520px] flex flex-col gap-4">
          <div>
            <h2 className="text-white text-base md:text-xl font-bold">
              {currentMode.needsUpload ? s.uploadTitle : s.freeGenTitle}
            </h2>
            <p className="text-gray-500 text-xs md:text-sm mt-1">
              {currentMode.needsUpload
                ? (currentMode.key === 'sketch2render' ? s.uploadSubtitleSketch : s.uploadSubtitle)
                : s.freeGenSubtitle}
            </p>
          </div>
          {currentMode.needsUpload ? (
            <UploadZone onUpload={(id) => setUploadId(id)} />
          ) : (
            <div className="w-full h-[160px] md:h-[200px] border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center bg-gray-900/30">
              <p className="text-gray-500 text-sm text-center leading-relaxed">
                {isOverseas ? <>✨ Freestyle<br />AI generates from scratch</> : <>✨ 自由生成<br />AI 从零生成效果图</>}
              </p>
            </div>
          )}
        </div>

        {/* ── Right column: Settings ── */}
        <div className="flex-1 w-full flex flex-col gap-4 md:gap-5">

          {/* Mode selector */}
          <div>
            <h2 className="text-white text-base md:text-xl font-bold mb-2">{s.designModeTitle}</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {DESIGN_MODES.map((m) => (
                <button
                  type="button"
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-center transition-all min-w-[84px] ${
                    mode === m.key
                      ? 'border-amber-500 bg-amber-500/10 text-white'
                      : 'border-gray-800 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg leading-none">{m.icon}</span>
                  <span className="text-xs font-semibold whitespace-nowrap">{isOverseas ? m.labelEn : m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Room type */}
          <div>
            <h2 className="text-white text-base md:text-xl font-bold mb-2">{s.roomTypeTitle}</h2>
            <RoomTypeSelector selected={roomType} onChange={setRoomType} />
          </div>

          {/* Style selector */}
          {currentMode.needsStyle ? (
            <div>
              <h2 className="text-white text-base md:text-xl font-bold mb-2">{s.styleTitle}</h2>
              <StyleSelector selected={style} onChange={setStyle} />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-800 bg-gray-900/50">
              <span className="text-gray-500 text-sm">{s.noStyleNeeded}</span>
            </div>
          )}

          {/* Custom prompt */}
          <div>
            <button
              type="button"
              onClick={() => setCustomPromptOpen((v) => !v)}
              className="flex items-center gap-1.5 text-gray-400 text-sm hover:text-gray-200 transition-colors"
            >
              <span>{customPromptOpen ? '▾' : '▸'}</span>
              <span>{s.customPromptLabel}</span>
            </button>
            {customPromptOpen && (
              <div className="mt-2">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value.slice(0, 200))}
                  rows={3}
                  placeholder={s.customPromptPlaceholder}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-amber-500"
                />
                <p className="text-right text-xs text-gray-600 mt-1">{customPrompt.length}/200</p>
              </div>
            )}
          </div>

          {/* Quality selector */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-2">{s.qualityTitle}</h3>
            <div className="grid grid-cols-3 gap-2">
              {QUALITY_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.key}
                  onClick={() => setQuality(opt.key)}
                  className={`py-2.5 px-2 rounded-lg border text-center transition-all ${
                    quality === opt.key ? opt.color + ' bg-white/5' : 'border-gray-800 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-semibold">{isOverseas ? opt.labelEn : opt.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">{opt.resolution}</div>
                  {!isOverseas && <div className="text-xs mt-0.5 font-bold">¥{opt.price}</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop CTA — hidden on mobile (mobile uses sticky bar below) */}
          <div className="hidden md:flex flex-col gap-3 border-t border-gray-800 pt-4">
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {s.ctaDisclaimer}
            </div>
            <button
              type="button"
              onClick={handlePay}
              disabled={loading || generating || !canGenerate}
              className="flex items-center justify-center gap-2 w-full h-14 bg-amber-500 text-black font-bold text-base rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors shadow-[0_6px_20px_rgba(255,152,0,0.3)]"
            >
              {generating ? s.ctaGenerating : loading ? s.ctaProcessing
                : isOverseas ? `✨ ${s.ctaButton} · 1 credit`
                : `⚡ 支付 ¥${currentOption.price} · 立即生成${currentOption.label}效果图`}
            </button>
            {!isOverseas && <p className="text-gray-600 text-xs text-center">扫码支付宝付款 · 30秒内自动生成</p>}
            {freeRemaining !== null && freeRemaining > 0 && (
              <p className="text-amber-500 text-xs text-center">{freeRemaining} {s.creditsRemaining}</p>
            )}
            {creditBalance > 0 && (
              <div className="text-amber-400 text-sm font-medium text-center">
                {s.creditsBalance} {creditBalance}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile sticky CTA bar ── */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-black/95 backdrop-blur border-t border-gray-800 px-4 py-3 z-40">
        {error && <p className="text-red-400 text-xs mb-2 text-center">{error}</p>}
        {freeRemaining !== null && freeRemaining > 0 && (
          <p className="text-amber-500 text-xs text-center mb-1">{freeRemaining} {s.creditsRemaining}</p>
        )}
        {creditBalance > 0 && (
          <div className="text-amber-400 text-sm font-medium text-center mb-1">
            {s.creditsBalance} {creditBalance}
          </div>
        )}
        <button
          type="button"
          onClick={handlePay}
          disabled={loading || generating || !canGenerate}
          className="flex items-center justify-center gap-2 w-full h-13 bg-amber-500 text-black font-bold text-base rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:bg-amber-400 transition-colors shadow-[0_6px_20px_rgba(255,152,0,0.4)]"
          style={{ height: '52px' }}
        >
          {generating ? s.ctaGeneratingMobile : loading ? s.ctaProcessing
            : isOverseas ? `✨ ${s.ctaButton} · 1 credit`
            : `⚡ 支付 ¥${currentOption.price} · 立即生成`}
        </button>
        {!canGenerate && (
          <p className="text-gray-500 text-xs text-center mt-1">{s.errorUploadFirst}</p>
        )}
      </div>

      {payModal && (
        <PaymentModal
          orderId={payModal.orderId}
          qrDataUrl={payModal.qrDataUrl}
          amount={payModal.amount}
          onClose={() => setPayModal(null)}
        />
      )}
      {buyPackageModal && (
        <PackagePurchaseModal
          {...buyPackageModal}
          onSuccess={(count) => setCreditBalance(prev => prev + count)}
          onClose={() => setBuyPackageModal(null)}
        />
      )}
    </main>
  )
}
