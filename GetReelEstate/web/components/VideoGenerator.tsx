'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Tab    = 'url' | 'upload';
type Status = 'idle' | 'fetching' | 'filling' | 'waiting' | 'processing' | 'done' | 'error';

const QUICK_DEMO = {
  description: '5BR/5BA luxury home in Austin TX, $1.7M. Stunning pool, chef\'s kitchen, 3-car garage, 4,820 sqft, top-rated schools. Move-in ready — turnkey perfection.',
  photoUrls: [
    'https://photos.zillowstatic.com/fp/19f50fcfad0e24a1a8e49787a41f5c2e-cc_ft_1536.jpg',
    'https://photos.zillowstatic.com/fp/506837ba617ca729d59d46be7e01af3c-cc_ft_1536.jpg',
    'https://photos.zillowstatic.com/fp/454c9488bb5be80f4f5e72ae03956eb7-cc_ft_1536.jpg',
    'https://photos.zillowstatic.com/fp/64c84a2522a77476777d88e51b6cd1b1-cc_ft_1536.jpg',
  ],
};

const VIDEO_STYLES = [
  { id: 'energetic', label: 'Energetic', icon: '⚡', desc: 'High-energy, like a top agent' },
  { id: 'luxury',    label: 'Luxury',    icon: '✨', desc: 'Elegant & sophisticated' },
  { id: 'cinematic', label: 'Cinematic', icon: '🎬', desc: 'Dramatic, movie-trailer feel' },
  { id: 'warm',      label: 'Warm',      icon: '🏡', desc: 'Friendly & family-oriented' },
  { id: 'modern',    label: 'Modern',    icon: '🔷', desc: 'Clean & minimalist' },
] as const;

async function downloadBlob(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

interface Props {
  defaultVideoId?: string;
}

export default function VideoGenerator({ defaultVideoId }: Props) {
  const { user } = useUser();
  const [tab, setTab]           = useState<Tab>('upload');
  const [listingUrl, setUrl]    = useState('');
  const [images, setImages]     = useState<File[]>([]);
  const [description, setDesc]  = useState('');
  const [style, setStyle]       = useState('energetic');
  const [status, setStatus]     = useState<Status>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [script, setScript]     = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [videoId, setVideoId]   = useState<string | null>(defaultVideoId ?? null);
  const [email, setEmail]       = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef                 = useRef<HTMLInputElement>(null);

  // ── Animated progress bar ─────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'waiting') {
      setProgress(8);
    } else if (status === 'processing') {
      setProgress(25);
      // Animate from 25 → 90 over ~80s
      const start = Date.now();
      const timer = setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        const p = Math.min(25 + (elapsed / 80) * 65, 90);
        setProgress(Math.round(p));
        if (p >= 90) clearInterval(timer);
      }, 500);
      return () => clearInterval(timer);
    } else if (status === 'done') {
      setProgress(100);
    }
  }, [status]);

  // ── Supabase Realtime: listen for video status changes ────────────────────
  useEffect(() => {
    if (!videoId) return;
    setStatus('waiting');

    const channel = supabase
      .channel(`video:${videoId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'videos', filter: `id=eq.${videoId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.status === 'processing') {
            setStatus('processing');
          } else if (row.status === 'completed' && row.video_url) {
            setVideoUrl(row.video_url);
            setScript(row.script ?? null);
            setStatus('done');
            channel.unsubscribe();
          } else if (row.status === 'failed') {
            setError(row.error_msg || 'Rendering failed');
            setStatus('error');
            channel.unsubscribe();
          }
        },
      )
      .subscribe();

    // Polling fallback every 8s
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('videos')
        .select('status, video_url, script, error_msg')
        .eq('id', videoId)
        .single();
      if (!data) return;
      if (data.status === 'processing') setStatus('processing');
      if (data.status === 'completed' && data.video_url) {
        setVideoUrl(data.video_url);
        setScript(data.script ?? null);
        setStatus('done');
        clearInterval(poll);
        channel.unsubscribe();
      }
      if (data.status === 'failed') {
        setError(data.error_msg || 'Rendering failed');
        setStatus('error');
        clearInterval(poll);
        channel.unsubscribe();
      }
    }, 8000);

    return () => { clearInterval(poll); channel.unsubscribe(); };
  }, [videoId]);

  // ── Quick fill with demo data ─────────────────────────────────────────────
  const fillFromDemo = async () => {
    setStatus('filling'); setError(null);
    try {
      const files = await Promise.all(
        QUICK_DEMO.photoUrls.map(async (url, i) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch demo image ${i + 1}`);
          const blob = await res.blob();
          return new File([blob], `demo_${i}.jpg`, { type: 'image/jpeg' });
        })
      );
      setImages(files);
      setDesc(QUICK_DEMO.description);
      setTab('upload');
    } catch (err: any) {
      setError('Could not load demo photos: ' + err.message);
    } finally {
      setStatus('idle');
    }
  };

  // ── Image helpers ─────────────────────────────────────────────────────────
  const addImages = (files: FileList | File[] | null | undefined) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    setImages(prev => [...prev, ...valid].slice(0, 7));
  };
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false); addImages(e.dataTransfer.files);
  }, []);
  const removeImage = (i: number) => setImages(prev => prev.filter((_, idx) => idx !== i));

  // ── Fetch listing ─────────────────────────────────────────────────────────
  const fetchListing = async () => {
    if (!listingUrl.trim()) return;
    setStatus('fetching'); setError(null);
    try {
      const res  = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: listingUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.description) setDesc(data.description);
      if (data.imageUrls?.length) {
        const files = await Promise.all(
          data.imageUrls.slice(0, 7).map(async (url: string, i: number) => {
            const r    = await fetch(url);
            const blob = await r.blob();
            return new File([blob], `listing_${i}.jpg`, { type: 'image/jpeg' });
          }),
        );
        setImages(files);
      }
      setStatus('idle'); setTab('upload');
    } catch (err: any) {
      setError(err.message); setStatus('idle');
    }
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!images.length || !description.trim()) return;

    setStatus('waiting'); setError(null);

    // Upload images to Supabase Storage
    const uploadedUrls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const ext  = file.name.split('.').pop() || 'jpg';
      const p    = `uploads/${Date.now()}_${i}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('reels')
        .upload(p, file, { upsert: true });
      if (upErr) { setError('Image upload failed: ' + upErr.message); setStatus('error'); return; }
      const { data: { publicUrl } } = supabase.storage.from('reels').getPublicUrl(p);
      uploadedUrls.push(publicUrl);
    }

    try {
      const res  = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: description, sourceUrls: uploadedUrls, style }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVideoId(data.videoId);
    } catch (err: any) {
      setError(err.message); setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle'); setVideoUrl(null); setScript(null);
    setImages([]); setDesc(''); setUrl(''); setError(null); setVideoId(null); setStyle('energetic');
  };

  // ── Send email ────────────────────────────────────────────────────────────
  const sendEmail = async () => {
    if (!email.trim() || !videoUrl) return;
    setEmailSending(true);
    try {
      const res = await fetch('/api/send-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), videoUrl, script }),
      });
      if (res.ok) setEmailSent(true);
      else setError('邮件发送失败，请重试');
    } catch {
      setError('邮件发送失败，请重试');
    } finally {
      setEmailSending(false);
    }
  };

  // ── Result screen ─────────────────────────────────────────────────────────
  if (status === 'done' && videoUrl) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-green-900/20 border border-green-700/40 rounded-xl">
          <span className="text-green-400 text-xl">✓</span>
          <div>
            <div className="font-medium text-green-300">Your reel is ready!</div>
            <div className="text-sm text-green-600">Download and post to social media</div>
          </div>
        </div>

        <video src={videoUrl} controls autoPlay
          className="w-full rounded-2xl shadow-2xl border border-white/10" />

        <div className="flex gap-3">
          <button
            onClick={() => downloadBlob(videoUrl, 'reel.mp4')}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold py-3 rounded-xl transition-colors">
            ⬇ Download MP4
          </button>
          <button onClick={reset}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium py-3 rounded-xl transition-colors">
            Make Another
          </button>
        </div>

        {/* Share buttons */}
        {(() => {
          const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.handyai.cc';
          const shareText = `🏡 Just generated this real estate reel with AI in 60 seconds!\n\nCreate yours free → ${siteUrl}\n\n#RealEstate #ReelEstate #AIVideo`;
          const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(videoUrl!)}`;
          const bskyUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText + '\n' + videoUrl!)}`;
          const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`;
          const tiktokCaption = `🏡 AI-generated real estate reel! Create yours free at ${siteUrl} #RealEstate #TikTokRealEstate #AIVideo`;
          const igCaption = `🏡 AI generated this real estate reel in 60s! Create yours free → ${siteUrl} ⬇️ link in bio\n\n#RealEstateAgent #RealtorLife #HomeTour #AIVideo #InstagramReels`;

          return (
            <div className="bg-gray-900 rounded-xl border border-white/5 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-300">🚀 Share to social</p>

              {/* Mobile native share */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={() => navigator.share({ title: 'Real Estate Reel', text: shareText, url: videoUrl! })}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-semibold py-2.5 rounded-lg transition-colors">
                  📤 Share Video (native)
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-black hover:bg-gray-900 border border-gray-700 text-white text-xs font-medium py-2.5 rounded-lg transition-colors">
                  𝕏 Post to X
                </a>
                <a href={bskyUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-sky-900 hover:bg-sky-800 text-sky-200 text-xs font-medium py-2.5 rounded-lg transition-colors">
                  🦋 Bluesky
                </a>
                <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-blue-800 hover:bg-blue-700 text-blue-100 text-xs font-medium py-2.5 rounded-lg transition-colors">
                  💼 LinkedIn
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(videoUrl!)}
                  className="flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium py-2.5 rounded-lg transition-colors">
                  🔗 Copy Link
                </button>
              </div>

              {/* TikTok / Instagram — copy caption */}
              <div className="space-y-2 pt-1">
                <p className="text-xs text-gray-500 font-medium">📱 TikTok & Instagram — download video, then:</p>
                <div className="space-y-1.5">
                  {[
                    { label: '📋 Copy TikTok caption', text: tiktokCaption },
                    { label: '📋 Copy Instagram caption', text: igCaption },
                  ].map(({ label, text }) => (
                    <button key={label}
                      onClick={() => navigator.clipboard.writeText(text)}
                      className="w-full text-left flex items-center justify-between bg-gray-800 hover:bg-gray-750 rounded-lg px-3 py-2 transition-colors group">
                      <span className="text-xs text-gray-400 group-hover:text-gray-200 truncate">{label}</span>
                      <span className="text-xs text-gray-600 ml-2 shrink-0">copy</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Email */}
        <div className="bg-gray-900 rounded-xl border border-white/5 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-300">✉ 发送到邮箱</p>
          {emailSent ? (
            <p className="text-sm text-green-400">✓ 已发送到 {email}</p>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={sendEmail}
                disabled={!email.trim() || emailSending}
                className="bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-semibold px-4 rounded-lg text-sm transition-colors">
                {emailSending ? '发送中…' : '发送'}
              </button>
            </div>
          )}
        </div>

        {script && (
          <details className="bg-gray-900 rounded-xl border border-white/5 p-4">
            <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300 font-medium">
              View AI-generated script
            </summary>
            <p className="mt-3 text-sm text-gray-300 leading-relaxed">{script}</p>
          </details>
        )}
      </div>
    );
  }

  // ── Waiting / Processing screen ───────────────────────────────────────────
  if (status === 'waiting' || status === 'processing') {
    const stages = [
      { label: 'Job queued',          pct: 8  },
      { label: 'Generating script',   pct: 25 },
      { label: 'Creating voiceover',  pct: 50 },
      { label: 'Rendering video',     pct: 75 },
      { label: 'Finalizing',          pct: 90 },
    ];
    const currentStage = stages.filter(s => progress >= s.pct).pop() ?? stages[0];

    return (
      <div className="py-10 space-y-6">
        <div className="text-center">
          <div className="font-semibold text-lg mb-1">
            {status === 'waiting' ? '⏳ Queued…' : '🎬 Rendering your reel…'}
          </div>
          <div className="text-gray-400 text-sm">Usually takes 60–90 seconds</div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{currentStage.label}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stage dots */}
        <div className="space-y-2">
          {stages.map((s, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs transition-colors ${
              progress >= s.pct ? 'text-amber-400' : 'text-gray-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                progress >= s.pct ? 'bg-amber-500' : 'bg-gray-700'
              }`} />
              {s.label}
              {progress >= s.pct && progress < (stages[i + 1]?.pct ?? 101) && (
                <span className="text-gray-500 animate-pulse">…</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quick fill */}
      <div className="flex items-center justify-between bg-gray-900/50 border border-white/5 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-200">快捷生成 / Quick Demo</p>
          <p className="text-xs text-gray-500 mt-0.5">Use a sample Austin TX luxury listing</p>
        </div>
        <button type="button" onClick={fillFromDemo}
          disabled={status === 'filling'}
          className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 shrink-0">
          {status === 'filling'
            ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />Loading…</span>
            : '⚡ Quick Fill'}
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-gray-900 rounded-xl p-1 border border-white/5">
        {(['url', 'upload'] as Tab[]).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              tab === t ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            {t === 'url' ? '🔗 Paste Zillow URL' : '📁 Upload Photos'}
          </button>
        ))}
      </div>

      {/* URL tab */}
      {tab === 'url' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input type="url" value={listingUrl}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.zillow.com/homedetails/..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-sm transition-colors" />
            <button type="button" onClick={fetchListing}
              disabled={!listingUrl.trim() || status === 'fetching'}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-semibold px-5 rounded-xl transition-colors">
              {status === 'fetching'
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />Fetching…</span>
                : 'Fetch'}
            </button>
          </div>
          <p className="text-xs text-gray-500">Supports Zillow · Realtor.com · Redfin</p>
        </div>
      )}

      {/* Upload tab */}
      {tab === 'upload' && (
        <div className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
          dragging ? 'border-amber-400 bg-amber-400/5' : 'border-gray-700 hover:border-gray-600'}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}>
          {images.length === 0 ? (
            <div className="py-6">
              <div className="text-3xl mb-2">🏡</div>
              <p className="text-gray-300 font-medium text-sm">Drop photos here or click to browse</p>
              <p className="text-gray-500 text-xs mt-1">JPG, PNG, WEBP — up to 7 images</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative group aspect-square">
                  <img src={URL.createObjectURL(img)} alt=""
                    className="w-full h-full object-cover rounded-lg" />
                  <button type="button"
                    onClick={e => { e.stopPropagation(); removeImage(i); }}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    ×
                  </button>
                </div>
              ))}
              {images.length < 7 && (
                <div className="aspect-square border border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-500 text-xl hover:border-gray-400 transition-colors">+</div>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => e.target.files && addImages(e.target.files)} />
        </div>
      )}

      {/* Video Style */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Video Style
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {VIDEO_STYLES.map(s => (
            <button key={s.id} type="button" onClick={() => setStyle(s.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                style === s.id
                  ? 'border-amber-500 bg-amber-500/10 text-white'
                  : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}>
              <span className="text-lg">{s.icon}</span>
              <span className="text-xs font-medium">{s.label}</span>
              <span className="text-[10px] text-gray-500 leading-tight">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Property Description
          <span className="text-gray-500 font-normal ml-2">— AI writes the voiceover script</span>
        </label>
        <textarea value={description} onChange={e => setDesc(e.target.value)}
          placeholder="e.g. 4BR/3BA Austin TX, $875K. Pool, open kitchen, 3-car garage, top schools. Move-in ready."
          rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none transition-colors text-sm" />
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-red-300 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div>
        <button type="submit"
          disabled={!images.length || !description.trim() || status === 'fetching'}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-gray-800 disabled:text-gray-600 text-gray-900 font-bold py-4 rounded-xl text-base transition-all disabled:cursor-not-allowed hover:shadow-lg hover:shadow-amber-500/20">
          ✨ Generate My Reel — Free
        </button>
        <p className="text-center text-xs text-gray-600 mt-2">
          {user ? `Signed in as ${user.primaryEmailAddress?.emailAddress}` : 'Free for all users'}
        </p>
      </div>
    </form>
  );
}
