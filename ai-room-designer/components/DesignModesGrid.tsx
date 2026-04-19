import Link from 'next/link'
import { DESIGN_MODES } from '@/lib/design-config'

export default function DesignModesGrid() {
  return (
    <section className="px-4 sm:px-6 lg:px-[120px] py-16 bg-[#050505]">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-8">
         <div className="text-center max-w-2xl">
           <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ fontFamily: 'Georgia, serif' }}>
             10 design modes, <span className="text-amber-500">one subscription</span>
           </h2>
           <p className="text-gray-400 text-sm md:text-base mt-3 text-center">
             From full-room redesigns to pixel-precise inpainting. Most tools give you 3 modes — we give you ten.
           </p>
         </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full">
          {DESIGN_MODES.map((m) => (
            <Link
              key={m.key}
              href={`/generate?mode=${m.key}`}
              className="rounded-xl border border-gray-800 bg-[#0A0A0A] hover:border-amber-500/60 hover:bg-[#0F0D08] transition-colors p-4 flex flex-col gap-2 group"
            >
              <span className="text-2xl" aria-hidden>{m.icon}</span>
              <div className="text-white text-sm font-semibold group-hover:text-amber-400 transition-colors">
                {m.labelEn}
              </div>
              <div className="text-gray-500 text-xs leading-snug">{m.descEn}</div>
            </Link>
          ))}
        </div>

        <p className="text-gray-600 text-xs text-center">
          ✨ <span className="text-amber-400">Inpainting</span> is exclusive to RoomAI — paint any area and let AI redesign just that part.
        </p>
      </div>
    </section>
  )
}
