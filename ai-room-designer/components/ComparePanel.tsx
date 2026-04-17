'use client'
import { isOverseas } from '@/lib/region'

interface Props {
  beforeUrl?: string
  afterUrl: string
  style?: string
}

export default function ComparePanel({ beforeUrl, afterUrl, style }: Props) {
  return (
    <div className="w-full max-w-[1100px]">
      {beforeUrl ? (
        /* Side-by-side on sm+, stacked on mobile */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5">
          {/* Before */}
          <div className="relative rounded-xl overflow-hidden border border-gray-800">
            <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={beforeUrl}
                alt={isOverseas ? 'Before' : '改造前'}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'brightness(1.25) contrast(1.05)' }}
              />
            </div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-sm text-white text-xs font-semibold px-3 h-7 rounded-full border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
              {isOverseas ? 'Before' : '改造前'}
            </div>
          </div>

          {/* After */}
          <div className="relative rounded-xl overflow-hidden border border-amber-500/50">
            <div className="absolute inset-0 rounded-xl ring-1 ring-amber-500/30 pointer-events-none z-10" />
            <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterUrl} alt={isOverseas ? 'AI Design' : 'AI效果图'} className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-amber-500 text-black text-xs font-bold px-3 h-7 rounded-full z-20">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {isOverseas ? (style ? `AI ${style} Design` : 'AI Design') : (style ? `AI ${style}` : 'AI') + '效果图'}
            </div>
          </div>
        </div>
      ) : (
        /* No before image — full width centered after */
        <div className="relative rounded-xl overflow-hidden border border-amber-500/50 max-w-2xl mx-auto">
          <div className="absolute inset-0 rounded-xl ring-1 ring-amber-500/30 pointer-events-none z-10" />
          <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={afterUrl} alt={isOverseas ? 'AI Design' : 'AI效果图'} className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-amber-500 text-black text-xs font-bold px-3 h-7 rounded-full z-20">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {isOverseas ? (style ? `AI ${style} Design` : 'AI Design') : (style ? `AI ${style}` : 'AI') + '效果图'}
          </div>
        </div>
      )}
    </div>
  )
}
