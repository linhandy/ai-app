'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import UploadZone from '@/components/UploadZone'
import StyleSelector from '@/components/StyleSelector'
import RoomTypeSelector from '@/components/RoomTypeSelector'
import PaymentModal from '@/components/PaymentModal'
import PackagePurchaseModal from '@/components/PackagePurchaseModal'
import BatchStyleSelector from '@/components/BatchStyleSelector'
import { DESIGN_MODES } from '@/lib/design-config'
import type { DesignMode } from '@/lib/orders'
import InpaintCanvas from '@/components/InpaintCanvas'
import FreeQuotaBanner from '@/components/FreeQuotaBanner'
import GenerationProgress from '@/components/GenerationProgress'
import { saveToHistory } from '@/lib/history'
import { isOverseas } from '@/lib/region'
import { regionConfig } from '@/lib/region-config'

const OVERSEAS_CREDIT_COST = '1 credit'

const QUALITY_OPTIONS = [
  { key: 'standard', label: '标准', labelEn: 'Standard', price: 1, resolution: '1024px', color: 'border-gray-700 text-gray-300' },
  { key: 'premium',  label: '高清', labelEn: 'HD',       price: 3, resolution: '2048px', color: 'border-amber-500 text-amber-500' },
  { key: 'ultra',    label: '超清', labelEn: '4K',       price: 5, resolution: '4096px', color: 'border-purple-500 text-purple-400' },
] as const

const PROMPT_SUGGESTIONS = [
  { label: 'Warm wood accents', value: 'with warm wooden accents' },
  { label: 'Built-in shelves', value: 'featuring built-in bookshelves' },
  { label: 'Natural light', value: 'maximizing natural light from windows' },
  { label: 'Plants & biophilic', value: 'with abundant indoor plants and biophilic elements' },
  { label: 'Open floor plan', value: 'with an open floor plan layout' },
  { label: 'Cozy fireplace', value: 'with a cozy fireplace as focal point' },
]

const PROMPT_SUGGESTIONS_CN = [
  { label: '暖木元素', value: '加入温暖的木质装饰元素' },
  { label: '内嵌书架', value: '设置内嵌式书架收纳' },
  { label: '最大采光', value: '最大化自然采光效果' },
  { label: '绿植氛围', value: '增加大量室内绿植和自然元素' },
  { label: '开放布局', value: '打造开放式空间布局' },
  { label: '壁炉焦点', value: '以壁炉为视觉焦点' },
]

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
  const initialStyle = searchParams.get('style') ?? 'nordic_minimal'
  const initialMode = (searchParams.get('mode') ?? 'redesign') as DesignMode
  const initialRoomType = searchParams.get('roomType') ?? 'living_room'

  const [uploadId, setUploadId] = useState<string | null>(null)
  const [referenceUploadId, setReferenceUploadId] = useState<string | null>(null)
  const [hasMask, setHasMask] = useState(false)
  const compositeBlobRef = useRef<(() => Promise<Blob>) | null>(null)
  const [style, setStyle] = useState(initialStyle)
  const [quality, setQuality] = useState(initialQuality)
  const [mode, setMode] = useState<DesignMode>(initialMode)
  const handleModeChange = (newMode: DesignMode) => {
    setMode(newMode)
    setReferenceUploadId(null)
    setHasMask(false)
    setCustomPrompt('')
    compositeBlobRef.current = null
    setBatchMode(false)
    setBatchStyles([])
  }
  const toggleBatchStyle = (styleKey: string) => {
    setBatchStyles((prev) =>
      prev.includes(styleKey)
        ? prev.filter((k) => k !== styleKey)
        : prev.length >= 8 ? prev : [...prev, styleKey]
    )
  }
  const [roomType, setRoomType] = useState(initialRoomType)
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
  const [batchMode, setBatchMode] = useState(false)
  const [batchStyles, setBatchStyles] = useState<string[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'unlimited' | null>(null)

  const currentOption = QUALITY_OPTIONS.find((o) => o.key === quality) ?? QUALITY_OPTIONS[0]
  const canGenerate = !currentMode.needsUpload || (
    !!uploadId &&
    (mode !== 'style-match' || !!referenceUploadId) &&
    (mode !== 'inpaint' || (hasMask && !!customPrompt.trim()))
  )

  const initialPackageId = searchParams.get('package')
  const packagePurchaseTriggeredRef = useRef(false)

  useEffect(() => {
    if (isOverseas) return
    fetch('/api/credits/balance')
      .then(r => r.json())
      .then(d => setCreditBalance(d.balance ?? 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isOverseas) return
    fetch('/api/quota')
      .then(r => r.json())
      .then(d => {
        const loggedIn = d.plan !== null && d.plan !== undefined
        setIsLoggedIn(loggedIn)
        if (loggedIn && (d.plan === 'free' || d.plan === 'pro' || d.plan === 'unlimited')) {
          setUserPlan(d.plan)
        } else {
          setUserPlan(null)
        }
      })
      .catch(() => { setIsLoggedIn(false); setUserPlan(null) })
  }, [])

  useEffect(() => {
    if (isOverseas || !initialPackageId || packagePurchaseTriggeredRef.current) return
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
    if (mode === 'style-match' && !referenceUploadId) { setError(s.errorUploadFirst); return }
    if (mode === 'inpaint' && (!hasMask || !customPrompt.trim())) { setError('Paint the area to change and describe the replacement'); return }
    setError(null)
    setLoading(true)

    // Inpaint: composite original + mask → upload before creating order
    let inpaintCompositeId: string | undefined
    if (mode === 'inpaint') {
      try {
        const blob = await compositeBlobRef.current!()
        const fd = new FormData()
        fd.append('image', blob, 'composite.jpg')
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
        const upData = await upRes.json()
        if (!upRes.ok) throw new Error(upData.error ?? 'Upload failed')
        inpaintCompositeId = upData.uploadId
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process mask')
        setLoading(false)
        return
      }
    }

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, referenceUploadId: mode === 'style-match'
            ? referenceUploadId
            : mode === 'inpaint'
            ? inpaintCompositeId
            : undefined, style, quality, mode, roomType, customPrompt: customPrompt.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401 && isOverseas) {
          router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent('/generate')}`)
          return
        }
        if (res.status === 402 && isOverseas) {
          router.push(data.upgradeUrl || '/pricing')
          return
        }
        throw new Error(data.error)
      }

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

  const handleBatchGenerate = async () => {
    if (batchStyles.length < 2) { setError('Select at least 2 styles for batch'); return }
    if (!uploadId) { setError(s.errorUploadFirst); return }
    setError(null)
    setBatchLoading(true)
    try {
      const res = await fetch('/api/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, styles: batchStyles, quality, mode, roomType, customPrompt: customPrompt.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent('/generate')}`)
          return
        }
        if (res.status === 402) {
          router.push(data.upgradeUrl || '/pricing')
          return
        }
        throw new Error(data.error)
      }
      const ids = (data.orderIds as string[]).join(',')
      router.push(`/batch-result?ids=${encodeURIComponent(ids)}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Batch generation failed')
    } finally {
      setBatchLoading(false)
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
        {isOverseas && isLoggedIn === false && (
          <Link href="/api/auth/signin" className="ml-4 text-gray-500 text-xs hover:text-gray-300 transition-colors hidden sm:block">
            Sign in
          </Link>
        )}
      </nav>

      {isOverseas && (
        <div className="px-4 sm:px-6 lg:px-12 pt-4 md:pt-6 max-w-[1200px] mx-auto w-full">
          <FreeQuotaBanner />
        </div>
      )}

      <div className="flex flex-col lg:flex-row px-4 sm:px-6 lg:px-12 pt-4 md:pt-6 pb-4 md:pb-16 gap-6 lg:gap-10 items-start max-w-[1200px] mx-auto w-full">

        {/* ── Left column: Upload ── */}
        <div className="w-full lg:flex-1 lg:min-w-0 flex flex-col gap-4">
          {mode === 'style-match' ? (
            <>
              <div>
                <h2 className="text-white text-base md:text-xl font-bold">Your Room</h2>
                <p className="text-gray-500 text-xs md:text-sm mt-1">Upload a photo of the room you want to redesign</p>
              </div>
              <UploadZone key="room" onUpload={(id) => setUploadId(id)} />
              <div>
                <h2 className="text-white text-base md:text-xl font-bold mt-2">Style Reference</h2>
                <p className="text-gray-500 text-xs md:text-sm mt-1">
                  Upload a photo whose style you want to copy — works great with Pinterest, Houzz, or magazine photos
                </p>
              </div>
              <UploadZone key="reference" onUpload={(id) => setReferenceUploadId(id)} />
            </>
          ) : mode === 'inpaint' ? (
            <>
              <div>
                <h2 className="text-white text-base md:text-xl font-bold">Paint the area to change</h2>
                <p className="text-gray-500 text-xs md:text-sm mt-1">Upload your room photo, then brush over the area you want to replace</p>
              </div>
              <InpaintCanvas
                key="inpaint"
                onOriginalUpload={(id) => setUploadId(id)}
                onCompositeReady={(getBlob) => { compositeBlobRef.current = getBlob }}
                onMaskChange={setHasMask}
                onPromptChange={(p) => setCustomPrompt(p)}
                onCompositeCleared={() => { compositeBlobRef.current = null }}
              />
            </>
          ) : (
            <>
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
              <UploadZone key="room" onUpload={(id) => setUploadId(id)} />
            ) : (
              <div className="w-full h-[160px] md:h-[200px] border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center bg-gray-900/30">
                <p className="text-gray-500 text-sm text-center leading-relaxed">
                  {isOverseas ? <>✨ Freestyle<br />AI generates from scratch</> : <>✨ 自由生成<br />AI 从零生成效果图</>}
                </p>
              </div>
            )}
            </>
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
                  onClick={() => handleModeChange(m.key)}
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
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-white text-base md:text-xl font-bold">{s.styleTitle}</h2>
                {isOverseas && (
                  <button
                    type="button"
                    onClick={() => { setBatchMode((v) => !v); setBatchStyles([]) }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                      batchMode
                        ? 'border-amber-500 bg-amber-500/15 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                        : 'border-gray-600 text-gray-300 hover:border-amber-500/60 hover:text-amber-400'
                    }`}
                    title="Generate up to 8 styles in one click"
                  >
                    <span>⚡</span>
                    <span>{batchMode ? 'Batch ON' : 'Try Batch (up to 8 styles)'}</span>
                  </button>
                )}
              </div>
              {isOverseas && (
                <p className="text-xs text-gray-500 mb-2">
                  {batchMode
                    ? 'Pick 2–8 styles and generate them in parallel — compare side by side'
                    : 'Tip: Turn on Batch to try multiple styles at once'}
                </p>
              )}
              {batchMode ? (
                <BatchStyleSelector selected={batchStyles} onToggle={toggleBatchStyle} />
              ) : (
                <StyleSelector selected={style} onChange={setStyle} />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-800 bg-gray-900/50">
              <span className="text-gray-500 text-sm">{s.noStyleNeeded}</span>
            </div>
          )}

          {/* Custom prompt */}
          {mode !== 'inpaint' && (
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
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {(isOverseas ? PROMPT_SUGGESTIONS : PROMPT_SUGGESTIONS_CN).map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setCustomPrompt(chip.value)}
                      className={`px-2.5 h-7 rounded-full text-xs font-medium transition-colors border ${
                        customPrompt === chip.value
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                          : 'border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value.slice(0, 200))}
                  rows={3}
                  placeholder={s.customPromptPlaceholder}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-amber-500"
                />
                <p className="text-right text-xs text-gray-600">{customPrompt.length}/200</p>
              </div>
            )}
          </div>
          )}

          {/* Quality selector */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-2">{s.qualityTitle}</h3>
            <div className="grid grid-cols-3 gap-2">
              {QUALITY_OPTIONS.map((opt) => {
                const isFreeUser = isOverseas && (isLoggedIn === false || userPlan === 'free')
                const locked = isFreeUser && opt.key !== 'standard'
                return (
                  <button
                    type="button"
                    key={opt.key}
                    onClick={() => {
                      if (locked) {
                        setError('Upgrade to Pro to unlock ' + opt.labelEn + ' quality')
                        router.push('/pricing')
                        return
                      }
                      setQuality(opt.key)
                    }}
                    disabled={locked}
                    className={`relative py-2.5 px-2 rounded-lg border text-center transition-all ${
                      locked
                        ? 'border-gray-800 text-gray-600 opacity-60 cursor-not-allowed'
                        : quality === opt.key
                          ? opt.color + ' bg-white/5'
                          : 'border-gray-800 text-gray-500 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-semibold">{isOverseas ? opt.labelEn : opt.label}</div>
                    <div className="text-[10px] mt-0.5 opacity-70">{opt.resolution}</div>
                    {!isOverseas && <div className="text-xs mt-0.5 font-bold">¥{opt.price}</div>}
                    {locked && (
                      <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        Pro
                      </span>
                    )}
                  </button>
                )
              })}
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
            {batchMode ? (
              <button
                type="button"
                onClick={handleBatchGenerate}
                disabled={batchLoading || batchStyles.length < 2 || !uploadId}
                className="flex items-center justify-center gap-2 w-full h-14 bg-amber-500 text-black font-bold text-base rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors shadow-[0_6px_20px_rgba(255,152,0,0.3)]"
              >
                {batchLoading ? 'Generating…' : `⚡ Batch Generate · ${batchStyles.length} styles · ${batchStyles.length} credits`}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePay}
                disabled={loading || generating || !canGenerate}
                className="flex items-center justify-center gap-2 w-full h-14 bg-amber-500 text-black font-bold text-base rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors shadow-[0_6px_20px_rgba(255,152,0,0.3)]"
              >
                {generating ? s.ctaGenerating : loading ? s.ctaProcessing
                  : isOverseas ? `${s.ctaButton} · ${OVERSEAS_CREDIT_COST}`
                  : `⚡ 支付 ¥${currentOption.price} · 立即生成${currentOption.label}效果图`}
              </button>
            )}
            {!isOverseas && <p className="text-gray-600 text-xs text-center">扫码支付宝付款 · 30秒内自动生成</p>}
            {freeRemaining !== null && freeRemaining > 0 && (
              <p className="text-amber-500 text-xs text-center">{freeRemaining} {s.creditsRemaining}</p>
            )}
            {!isOverseas && creditBalance > 0 && (
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
        {!isOverseas && creditBalance > 0 && (
          <div className="text-amber-400 text-sm font-medium text-center mb-1">
            {s.creditsBalance} {creditBalance}
          </div>
        )}
        {batchMode ? (
          <button
            type="button"
            onClick={handleBatchGenerate}
            disabled={batchLoading || batchStyles.length < 2 || !uploadId}
            className="flex items-center justify-center gap-2 w-full bg-amber-500 text-black font-bold text-base rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:bg-amber-400 transition-colors shadow-[0_6px_20px_rgba(255,152,0,0.4)]"
            style={{ height: '52px' }}
          >
            {batchLoading ? 'Generating…' : `⚡ Batch · ${batchStyles.length} styles · ${batchStyles.length} credits`}
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePay}
            disabled={loading || generating || !canGenerate}
            className="flex items-center justify-center gap-2 w-full h-13 bg-amber-500 text-black font-bold text-base rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:bg-amber-400 transition-colors shadow-[0_6px_20px_rgba(255,152,0,0.4)]"
            style={{ height: '52px' }}
          >
            {generating ? s.ctaGeneratingMobile : loading ? s.ctaProcessing
              : isOverseas ? `${s.ctaButton} · ${OVERSEAS_CREDIT_COST}`
              : `⚡ 支付 ¥${currentOption.price} · 立即生成`}
          </button>
        )}
        {!canGenerate && (
          <p className="text-gray-500 text-xs text-center mt-1">{s.errorUploadFirst}</p>
        )}
      </div>

      <GenerationProgress active={generating || batchLoading} estimatedSeconds={batchLoading ? 60 : 30} />

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
