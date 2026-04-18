import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Competitor {
  slug: string
  name: string
  price: string
  freeTier: string
  designModes: string
  inpainting: string
  privacy: string
  styles: string
  roomTypes: string
}

const COMPETITORS: Record<string, Competitor> = {
  interiorai: {
    slug: 'interiorai',
    name: 'InteriorAI',
    price: '$19.99–$29/mo',
    freeTier: '5/day (watermarked)',
    designModes: '3–4 modes',
    inpainting: '❌ Not available',
    privacy: 'Free images are public',
    styles: '~40 styles',
    roomTypes: '30+ room types',
  },
  roomgpt: {
    slug: 'roomgpt',
    name: 'RoomGPT',
    price: 'Free (limited) / $9/mo',
    freeTier: 'Low-quality, heavily watermarked',
    designModes: '1 mode (redesign only)',
    inpainting: '❌ Not available',
    privacy: 'Free images are public',
    styles: '10+ styles',
    roomTypes: '5 room types',
  },
  'homedesigns-ai': {
    slug: 'homedesigns-ai',
    name: 'HomeDesigns.AI',
    price: '$29/mo',
    freeTier: '3 free total',
    designModes: '2–3 modes',
    inpainting: '❌ Not available',
    privacy: 'Standard',
    styles: '30+ styles',
    roomTypes: '15+ room types',
  },
}

const PAGE_CONTENT: Record<string, { heroTitle: string; heroSubtitle: string; metaTitle: string; metaDescription: string }> = {
  interiorai: {
    heroTitle: 'Best InteriorAI Alternative in 2026',
    heroSubtitle: 'Everything InteriorAI offers — plus Inpainting precision editing — at 70% less cost.',
    metaTitle: 'Best InteriorAI Alternative 2026 — More Features, 70% Less Cost | RoomAI',
    metaDescription: 'Looking for an InteriorAI alternative? RoomAI gives you 10 design modes, Inpainting, private images by default, and 3 free HD designs daily — for $9.99/mo vs $29.',
  },
  roomgpt: {
    heroTitle: 'Best RoomGPT Alternative in 2026',
    heroSubtitle: 'HD results without watermarks, 40+ styles, and 10 design modes — everything RoomGPT lacks.',
    metaTitle: 'Best RoomGPT Alternative 2026 — HD Results, No Watermarks | RoomAI',
    metaDescription: 'Looking for a better RoomGPT alternative? RoomAI delivers HD designs without watermarks, 40+ styles, 10 modes including inpainting, and 3 free daily designs.',
  },
  'homedesigns-ai': {
    heroTitle: 'HomeDesigns.AI vs RoomAI — 2026 Comparison',
    heroSubtitle: 'More design modes, lower price, and precision inpainting editing — see how RoomAI compares.',
    metaTitle: 'HomeDesigns.AI Alternative 2026 — Full Comparison | RoomAI',
    metaDescription: 'HomeDesigns.AI vs RoomAI: compare pricing, features, free tiers, and design modes. RoomAI offers more for less — $9.99/mo vs $29, plus exclusive Inpainting.',
  },
}

export function generateStaticParams() {
  return Object.keys(COMPETITORS).map(slug => ({ competitor: slug }))
}

export function generateMetadata({ params }: { params: { competitor: string } }): Metadata {
  const content = PAGE_CONTENT[params.competitor]
  if (!content) return { title: 'RoomAI' }
  return {
    title: content.metaTitle,
    description: content.metaDescription,
    openGraph: { title: content.metaTitle, description: content.metaDescription },
  }
}

export default function CompetitorPage({ params }: { params: { competitor: string } }) {
  const competitor = COMPETITORS[params.competitor]
  const content = PAGE_CONTENT[params.competitor]
  if (!competitor || !content) notFound()

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center px-4 md:px-[120px] h-16 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-base">R</div>
          <span className="font-bold text-xl">RoomAI</span>
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-16 pb-24">
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            {content.heroTitle}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            {content.heroSubtitle}
          </p>
          <Link
            href="/generate"
            className="inline-flex items-center bg-amber-500 text-black font-bold text-lg px-10 h-14 rounded hover:bg-amber-400 transition-colors shadow-[0_8px_24px_rgba(255,152,0,0.3)]"
          >
            Try RoomAI Free — 3 Designs Daily →
          </Link>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Feature Comparison</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left p-4 text-gray-400 font-medium">Feature</th>
                  <th className="text-left p-4 text-amber-400 font-semibold">RoomAI</th>
                  <th className="text-left p-4 text-gray-400 font-medium">{competitor.name}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Price', '$9.99/mo', competitor.price],
                  ['Free Tier', '3 free HD designs daily', competitor.freeTier],
                  ['Design Modes', '10 modes', competitor.designModes],
                  ['Inpainting (Partial Edit)', '✅ Exclusive feature', competitor.inpainting],
                  ['Image Privacy', 'Private by default', competitor.privacy],
                  ['Styles', '40+ styles', competitor.styles],
                  ['Room Types', '24 room types', competitor.roomTypes],
                ].map(([feature, ours, theirs], i) => (
                  <tr key={i} className="border-b border-gray-900 hover:bg-gray-900/30 transition-colors">
                    <td className="p-4 text-gray-400">{feature}</td>
                    <td className="p-4 text-green-400 font-medium">{ours}</td>
                    <td className="p-4 text-gray-300">{theirs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Why Choose RoomAI?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: '70% Less Expensive',
                desc: 'RoomAI Pro is $9.99/month. Comparable tools charge $19.99–$49/month for the same or fewer features.',
              },
              {
                title: '10 Design Modes',
                desc: 'Style Redesign, Virtual Staging, Inpainting, Sketch-to-Render, Add Furniture, Paint Walls, and more — vs 3–4 modes elsewhere.',
              },
              {
                title: 'Exclusive Inpainting',
                desc: 'Paint a specific area of your room — a wall, a sofa, a window — and AI replaces only that part. No other tool offers this.',
              },
              {
                title: 'Private by Default',
                desc: 'Your designs are never shared publicly without your explicit consent. Other tools expose free-tier designs by default.',
              },
              {
                title: '3 Free HD Designs Daily',
                desc: 'No watermarks, no credit card, no tricks. Just 3 full-resolution designs every day to try before you subscribe.',
              },
              {
                title: 'Responsive Support',
                desc: `${competitor.name} has accumulated complaints about unresponsive support and difficult refunds. We do better.`,
              },
            ].map((item, i) => (
              <div key={i} className="border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="font-semibold text-white">{item.title}</p>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed pl-7">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center p-10 rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20">
          <h2 className="text-2xl font-bold mb-2">Try the Better Alternative</h2>
          <p className="text-gray-400 mb-6">3 free HD designs daily. No credit card needed. Cancel anytime.</p>
          <Link
            href="/generate"
            className="inline-flex items-center bg-amber-500 text-black font-bold text-lg px-10 h-14 rounded hover:bg-amber-400 transition-colors"
          >
            Start Designing Free →
          </Link>
          <p className="text-gray-500 text-sm mt-4">Pro from $9.99/mo · 150 designs/month · All 10 modes included</p>
        </div>
      </div>
    </main>
  )
}
