'use client';
import Link from 'next/link';
import { useState } from 'react';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';

// ── Demo section ─────────────────────────────────────────────────────────────

// Real photos from 2104 University Club Dr, Austin TX 78732 — 5BR/5BA $1.7M
const DEMO_PHOTOS = [
  'https://photos.zillowstatic.com/fp/19f50fcfad0e24a1a8e49787a41f5c2e-cc_ft_1536.jpg',
  'https://photos.zillowstatic.com/fp/506837ba617ca729d59d46be7e01af3c-cc_ft_1536.jpg',
  'https://photos.zillowstatic.com/fp/454c9488bb5be80f4f5e72ae03956eb7-cc_ft_1536.jpg',
  'https://photos.zillowstatic.com/fp/64c84a2522a77476777d88e51b6cd1b1-cc_ft_1536.jpg',
  'https://photos.zillowstatic.com/fp/e9435fc1d1845f8ffd4596ffc407db84-cc_ft_1536.jpg',
];


function DemoSection() {
  const [photoIdx, setPhotoIdx] = useState(0);

  return (
    <div className="flex flex-col lg:flex-row items-stretch gap-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 bg-gray-950">

      {/* ── Left: single listing photo ────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10 bg-gray-900/60">
          <div className="w-2 h-2 rounded-full bg-red-500/70" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
          <div className="w-2 h-2 rounded-full bg-green-500/70" />
          <span className="mx-auto text-xs text-gray-500 font-mono">📸 Listing Photo</span>
        </div>

        {/* Photo — same aspect-video as the reel */}
        <div className="aspect-video relative overflow-hidden bg-black">
          {DEMO_PHOTOS.map((url, i) => (
            <img key={i} src={url} alt=""
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: i === photoIdx ? 1 : 0 }} />
          ))}
          {/* Thumbnail strip at bottom */}
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 px-3">
            {DEMO_PHOTOS.map((_, i) => (
              <button key={i} onClick={() => setPhotoIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIdx ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'}`} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2 bg-gray-900/90 border-t border-white/5 text-xs text-gray-500">
          <span>Raw photo · JPG</span>
          <span className="text-gray-600">2104 University Club Dr, Austin TX</span>
          <span className="text-amber-400 font-semibold">$1,700,000</span>
        </div>
      </div>

      {/* ── Middle: arrow ─────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col items-center justify-center px-3 bg-gray-950">
        <div className="flex flex-col items-center gap-2">
          <div className="w-px h-16 bg-gradient-to-b from-transparent to-amber-500/50" />
          <div className="bg-amber-500 rounded-full p-3 shadow-lg shadow-amber-500/30">
            <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
          <div className="w-px h-16 bg-gradient-to-b from-amber-500/50 to-transparent" />
        </div>
        <p className="text-xs text-amber-500/60 font-medium mt-1">AI</p>
      </div>

      {/* Mobile arrow */}
      <div className="flex lg:hidden items-center justify-center py-3 bg-gray-950 gap-3">
        <div className="w-12 h-px bg-amber-500/30" />
        <div className="bg-amber-500 rounded-full p-2">
          <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
          </svg>
        </div>
        <div className="w-12 h-px bg-amber-500/30" />
      </div>

      {/* ── Right: AI-generated reel (with audio) ────────────────── */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10 bg-black/40">
          <div className="w-2 h-2 rounded-full bg-red-500/70" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
          <div className="w-2 h-2 rounded-full bg-green-500/70" />
          <span className="mx-auto text-xs text-gray-500 font-mono">🎬 AI Reel · 16:9 · MP4</span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-400 font-medium">AI</span>
          </div>
        </div>

        <div className="aspect-video bg-black">
          <video
            src="https://zzqylewczbtqkltvxbut.supabase.co/storage/v1/object/public/reels/demo/output.mp4"
            controls
            preload="metadata"
            playsInline
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex items-center justify-between px-4 py-2 bg-gray-900/90 border-t border-white/5 text-xs text-gray-500">
          <span>AI Script + TTS + FFmpeg</span>
          <span className="text-amber-400 font-semibold">Ready to post</span>
          <span className="hidden sm:inline">5BR · 5BA · 4,820 sqft</span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isSignedIn } = useUser();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {process.env.NEXT_PUBLIC_PLATFORM_URL && (
              <a
                href={process.env.NEXT_PUBLIC_PLATFORM_URL}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors hidden sm:block"
              >
                ← 平台
              </a>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-gray-900 text-sm">G</div>
              <span className="font-semibold text-lg">GetReelEstate</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <>
                <Link href="/create" className="text-sm text-gray-300 hover:text-white transition-colors">
                  My Reels
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="text-sm text-gray-400 hover:text-white transition-colors">Sign In</button>
                </SignInButton>
                <Link
                  href="/create"
                  className="bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Get Started Free →
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
            AI-Powered Real Estate Video Generator
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
            Turn Listings Into{' '}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Viral Reels
            </span>
            {' '}in 60 Seconds
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Paste a Zillow link or upload photos → AI writes the script, generates
            the voiceover, adds Ken Burns effects & captions → Download your
            professional 16:9 video.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/create"
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-amber-500/25"
            >
              Generate Your First Reel — Free
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium px-8 py-4 rounded-xl text-lg transition-colors"
            >
              Watch Demo ↓
            </a>
          </div>

          <p className="mt-4 text-sm text-gray-500">100% free, no credit card required</p>
        </div>
      </section>

      {/* Demo Video */}
      <section id="demo" className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">See It In Action</h2>
          <p className="text-gray-400 text-center text-sm mb-8">AI-generated reel from a 4BR Austin home listing</p>
          <DemoSection />
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-gray-400 text-center mb-14">From listing to reel in three steps</p>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: '🔗',
                title: 'Paste a Link or Upload Photos',
                desc: 'Enter a Zillow / Realtor.com URL and we auto-fetch the images, price, and description — or upload your own photos directly.',
              },
              {
                step: '02',
                icon: '🤖',
                title: 'AI Generates Everything',
                desc: 'Our LLM writes a punchy 60-80 word script. Edge TTS records the voiceover. FFmpeg adds Ken Burns zoom effects and synced captions.',
              },
              {
                step: '03',
                icon: '⬇️',
                title: 'Download & Post',
                desc: 'Get a 16:9 MP4 ready for Instagram Reels, TikTok, YouTube Shorts, or any social platform. Takes about 60 seconds.',
              },
            ].map(item => (
              <div key={item.step} className="relative p-6 rounded-2xl bg-gray-900 border border-white/5 hover:border-amber-500/20 transition-colors">
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="text-xs font-mono text-amber-500 mb-2">STEP {item.step}</div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-14">Everything You Need</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '🎙️', title: 'AI Voiceover', desc: 'Deep, energetic Microsoft Neural TTS — sounds like a pro realtor' },
              { icon: '🎬', title: 'Ken Burns Effect', desc: 'Smooth zoom & pan on every photo — no more static slideshows' },
              { icon: '📝', title: 'Synced Captions', desc: 'Word-boundary captions that match the audio perfectly' },
              { icon: '🔗', title: 'Zillow Auto-Fetch', desc: 'Paste a listing URL — we grab photos & description automatically' },
              { icon: '⚡', title: 'Fast Rendering', desc: '~60 seconds from submit to downloadable MP4' },
              { icon: '📱', title: '16:9 Ready', desc: 'Optimized for Instagram, TikTok, YouTube Shorts, and Facebook' },
            ].map(f => (
              <div key={f.title} className="flex gap-4 p-5 rounded-xl bg-gray-900 border border-white/5">
                <span className="text-2xl shrink-0">{f.icon}</span>
                <div>
                  <div className="font-medium mb-1">{f.title}</div>
                  <div className="text-sm text-gray-400">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">100% Free — No Credit Card Required</h2>
          <p className="text-gray-400 mb-14">Generate unlimited reels at no cost during our launch period.</p>

          <div className="max-w-sm mx-auto">
            <div className="p-8 rounded-2xl bg-amber-500 text-gray-900 text-left relative overflow-hidden">
              <div className="absolute top-4 right-4 text-xs font-bold bg-gray-900/20 px-2 py-1 rounded-full">FREE</div>
              <div className="text-sm font-medium mb-2 text-amber-900">ALL FEATURES</div>
              <div className="text-4xl font-bold mb-1">$0</div>
              <div className="text-amber-800 text-sm mb-6">completely free</div>
              <ul className="space-y-3 text-sm mb-8">
                {['Unlimited videos', '16:9 MP4 download', 'AI script + voiceover', 'Ken Burns + captions', 'Zillow auto-fetch', 'Commercial license'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-amber-900">
                    <span className="text-amber-700 font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/create" className="block text-center bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-colors">
                Generate Your First Reel →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Go Viral?</h2>
          <p className="text-gray-400 mb-8">Join agents already using GetReelEstate to book more showings.</p>
          <Link
            href="/create"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-10 py-4 rounded-xl text-lg transition-all hover:scale-105"
          >
            Create Your First Reel Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-gray-600 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded bg-amber-500 flex items-center justify-center text-gray-900 font-bold text-xs">G</div>
          <span className="text-gray-400 font-medium">GetReelEstate</span>
        </div>
        <p>AI real estate video generation · Built with Next.js + FFmpeg</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs">
          <Link href="/legal/tos" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link href="/legal/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
