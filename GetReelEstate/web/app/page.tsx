'use client';
import Link from 'next/link';
import { useState } from 'react';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';

export default function LandingPage() {
  const { isSignedIn } = useUser();
  const [videoPlaying, setVideoPlaying] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 h-14"
        style={{ background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-gray-900 text-sm"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>G</div>
            <span className="font-semibold text-base tracking-tight">GetReelEstate</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {[['#demo','Demo'],['#features','Features'],['#pricing','Pricing']].map(([href, label]) => (
              <a key={href} href={href} className="text-sm text-gray-400 hover:text-white transition-colors">{label}</a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <>
                <Link href="/create" className="text-sm text-gray-300 hover:text-white transition-colors">Dashboard</Link>
                <UserButton />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="text-sm text-gray-400 hover:text-white transition-colors">Sign in</button>
                </SignInButton>
                <Link href="/create"
                  className="text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#111' }}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-36 pb-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-amber-400" />
            AI-powered real estate video generation
          </div>

          {/* Headline */}
          <h1 className="font-bold mb-6 leading-[1.08] tracking-tight"
            style={{ fontSize: 'clamp(2.8rem,5.5vw,4.5rem)' }}>
            Turn listings into{' '}
            <span style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444,#EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              viral reels
            </span>
            <br />in 60 seconds
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Paste a listing URL or upload photos — AI writes the script, records
            a professional voiceover with cinematic effects and synced captions.
            Download and post.
          </p>

          {/* CTA */}
          <div className="flex items-center justify-center gap-4 flex-wrap mb-16">
            <Link href="/create"
              className="px-7 py-3.5 rounded-xl font-semibold text-sm text-gray-900 transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 8px 32px rgba(245,158,11,0.3)' }}>
              Generate your first reel — free →
            </Link>
            <a href="#demo"
              className="px-7 py-3.5 rounded-xl font-semibold text-sm transition-all hover:border-gray-500"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }}>
              Watch demo ↓
            </a>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-12 flex-wrap">
            {[['60s','render time'],['16:9','ready to post'],['5 styles','choose your vibe'],['free','no card needed']].map(([v,l]) => (
              <div key={l} className="text-center">
                <div className="text-2xl font-bold tracking-tight">{v}</div>
                <div className="text-xs text-gray-500 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Usage Video ── */}
      <section id="demo" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2 tracking-tight">See it in action</h2>
            <p className="text-sm text-gray-400">From listing to ready-to-post reel in 60 seconds</p>
          </div>

          {/* Video embed / demo */}
          <div className="relative rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}>

            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['#EF4444','#F59E0B','#10B981'].map(c => (
                <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.7 }} />
              ))}
              <div className="mx-auto flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                getreelestate.com/create
              </div>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]"
              style={{ background: '#111' }}>

              {/* Left: before (listing photo) */}
              <div className="flex flex-col">
                <div className="px-4 py-2.5 text-xs text-gray-500 font-medium"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  📸 Raw listing photos
                </div>
                <div className="aspect-video bg-black overflow-hidden">
                  <img
                    src="https://photos.zillowstatic.com/fp/19f50fcfad0e24a1a8e49787a41f5c2e-cc_ft_1536.jpg"
                    alt="Listing photo"
                    className="w-full h-full object-cover opacity-80"
                  />
                </div>
                <div className="px-4 py-2.5 text-xs text-gray-500 flex items-center justify-between"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span>Static JPEG · No engagement</span>
                  <span className="text-red-400">Low reach</span>
                </div>
              </div>

              {/* Right: after (AI reel) */}
              <div className="flex flex-col">
                <div className="px-4 py-2.5 text-xs font-medium flex items-center justify-between"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#F59E0B' }}>
                  <span>🎬 AI-generated reel</span>
                  <span className="text-xs text-gray-500 font-normal">16:9 MP4 · ready to post</span>
                </div>
                <div className="aspect-video bg-black relative">
                  <video
                    src="https://zzqylewczbtqkltvxbut.supabase.co/storage/v1/object/public/reels/demo/output.mp4"
                    controls={videoPlaying}
                    preload="metadata"
                    playsInline
                    onClick={() => setVideoPlaying(true)}
                    className="w-full h-full object-contain"
                  />
                  {!videoPlaying && (
                    <button
                      onClick={() => setVideoPlaying(true)}
                      className="absolute inset-0 flex items-center justify-center group">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                        style={{ background: 'rgba(245,158,11,0.9)', boxShadow: '0 8px 32px rgba(245,158,11,0.4)' }}>
                        <svg className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </button>
                  )}
                </div>
                <div className="px-4 py-2.5 text-xs flex items-center justify-between"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#6b7280' }}>
                  <span>AI voiceover · captions · cinematic zoom</span>
                  <span className="text-green-400">10× more engagement</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold mb-2 tracking-tight">Three steps. One reel.</h2>
            <p className="text-sm text-gray-400">No video editing skills required</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { n: '01', icon: '🔗', title: 'Paste URL or upload', desc: 'Drop a Zillow, Realtor.com, or Redfin link — or upload your own photos directly.' },
              { n: '02', icon: '🤖', title: 'AI does the work', desc: 'Script, professional voiceover, cinematic zoom & pan, synced word-level captions.' },
              { n: '03', icon: '⬇️', title: 'Download & post', desc: '16:9 MP4 optimised for Instagram Reels, TikTok, YouTube Shorts, and Facebook.' },
            ].map(s => (
              <div key={s.n} className="rounded-2xl p-6 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.25)'; (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}>
                <div className="text-xs font-mono text-amber-500 mb-3">{s.n}</div>
                <div className="text-2xl mb-3">{s.icon}</div>
                <h3 className="font-semibold mb-2 text-sm">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold mb-2 tracking-tight">Everything included</h2>
            <p className="text-sm text-gray-400">Professional quality, zero learning curve</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '🎙️', title: 'AI voiceover', desc: 'Professional, energetic narration that sounds like a top-performing realtor.' },
              { icon: '🎬', title: 'Cinematic effects', desc: 'Smooth Ken Burns zoom & pan on every photo — no more static slideshows.' },
              { icon: '📝', title: 'Synced captions', desc: 'Word-level captions that follow the audio perfectly, Hormozi-style.' },
              { icon: '🔗', title: 'Auto-fetch listings', desc: 'Paste a Zillow URL — we grab photos & description automatically.' },
              { icon: '🎨', title: '5 video styles', desc: 'Energetic, Luxury, Cinematic, Warm, Modern — match your brand.' },
              { icon: '📱', title: '16:9 MP4 output', desc: 'Ready for Instagram, TikTok, YouTube Shorts, and Facebook.' },
            ].map(f => (
              <div key={f.title} className="flex gap-4 p-5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-xl shrink-0">{f.icon}</span>
                <div>
                  <div className="font-medium text-sm mb-1">{f.title}</div>
                  <div className="text-xs text-gray-400 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-sm mx-auto text-center">
          <h2 className="text-2xl font-bold mb-2 tracking-tight">100% free to start</h2>
          <p className="text-sm text-gray-400 mb-10">No credit card. No time limit. Generate unlimited reels.</p>

          <div className="rounded-2xl p-8 text-left relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(217,119,6,0.08))', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div className="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-full"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>FREE</div>
            <div className="text-4xl font-bold mb-1">$0</div>
            <div className="text-sm text-gray-400 mb-8">completely free during launch</div>
            <ul className="space-y-3 text-sm mb-8">
              {['Unlimited videos','16:9 MP4 download','AI script + voiceover','Cinematic effects + captions','5 video styles','Commercial license'].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-gray-200">
                  <span className="text-amber-400 text-xs">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/create"
              className="block text-center py-3 rounded-xl font-semibold text-sm text-gray-900 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
              Generate your first reel →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 tracking-tight">Ready to go viral?</h2>
          <p className="text-gray-400 mb-8">Join agents already using GetReelEstate to book more showings.</p>
          <Link href="/create"
            className="inline-block px-10 py-4 rounded-xl font-bold text-sm text-gray-900 transition-all hover:opacity-90 hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 12px 40px rgba(245,158,11,0.3)' }}>
            Create your first reel free →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 text-center"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-md flex items-center justify-center text-gray-900 font-bold text-xs"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>G</div>
          <span className="font-semibold text-sm">GetReelEstate</span>
        </div>
        <p className="text-xs text-gray-600 mb-3">AI-powered real estate video generation</p>
        <div className="flex items-center justify-center gap-5 text-xs text-gray-600">
          <Link href="/legal/tos" className="hover:text-gray-400 transition-colors">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
