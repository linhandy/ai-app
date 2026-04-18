import Link from 'next/link'

const FEATURES = [
  { label: '$9.99/mo vs $29/mo', us: true, them: false, highlight: true },
  { label: '3 free HD designs daily', us: true, them: 'Watermarked' },
  { label: 'No watermark on free tier', us: true, them: false },
  { label: '10 design modes', us: true, them: '3–4 modes' },
  { label: 'Inpainting (paint-to-edit)', us: true, them: false },
  { label: 'Private photos by default', us: true, them: 'Public' },
  { label: '40+ interior styles', us: true, them: true },
]

export default function PriceComparisonCard() {
  return (
    <section className="px-4 sm:px-6 lg:px-[120px] py-16 bg-black">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-8">
        <div className="text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>
            Everything you need at <span className="text-amber-500">1/3 the price</span>
          </h2>
          <p className="text-gray-400 text-sm md:text-base mt-3">
            Honest side-by-side vs the leading AI interior design tool.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {/* Us */}
          <div className="rounded-2xl border-2 border-amber-500 bg-amber-950/10 p-6 flex flex-col gap-4 relative">
            <div className="absolute -top-3 left-6 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
              Our pick
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-white text-xl font-bold">RoomAI</span>
              <span className="text-amber-400 text-3xl font-bold">$9.99</span>
              <span className="text-gray-500 text-sm">/mo</span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-2 text-sm text-gray-200">
                  <span className="mt-0.5 shrink-0 text-green-500">✓</span>
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/generate"
              className="mt-2 bg-amber-500 text-black font-semibold text-sm h-11 rounded-xl flex items-center justify-center hover:bg-amber-400 transition-colors"
            >
              Try 3 Free Daily — No Card Needed
            </Link>
          </div>

          {/* Leading competitor (intentionally unnamed on homepage) */}
          <div className="rounded-2xl border border-gray-800 bg-[#0A0A0A] p-6 flex flex-col gap-4">
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-gray-300 text-xl font-bold">Leading competitor</span>
              <span className="text-gray-400 text-3xl font-bold">$29</span>
              <span className="text-gray-500 text-sm">/mo</span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {FEATURES.map((f) => {
                const ok = f.them === true
                const partial = typeof f.them === 'string'
                return (
                  <li key={f.label} className="flex items-start gap-2 text-sm">
                    <span className={`mt-0.5 shrink-0 ${ok ? 'text-gray-400' : 'text-red-500'}`}>
                      {ok ? '✓' : '✗'}
                    </span>
                    <span className={ok ? 'text-gray-300' : 'text-gray-500'}>
                      {f.label}
                      {partial && <span className="text-red-400 ml-1">({f.them})</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
            <div className="mt-2 h-11 rounded-xl flex items-center justify-center text-gray-600 text-sm border border-gray-800">
              3× the price, fewer features
            </div>
          </div>
        </div>

        <p className="text-gray-600 text-xs text-center max-w-xl">
          See full head-to-head on our <Link href="/vs/interiorai" className="underline hover:text-gray-400">comparison page</Link>.
        </p>
      </div>
    </section>
  )
}
