'use client';

import { TEMPLATES, type DesignTemplate } from '@/lib/templates';

interface Props {
  onSelect: (t: DesignTemplate) => void;
  onClose: () => void;
}

export default function TemplateModal({ onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div className="relative rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col"
        style={{ background: 'var(--surface)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>选择设计模板</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>选择后可在左侧进一步调整参数</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>×</button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-4">
            {TEMPLATES.map(t => (
              <TemplateCard key={t.id} template={t} onSelect={() => { onSelect(t); onClose(); }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template: t, onSelect }: { template: DesignTemplate; onSelect: () => void }) {
  const totalArea = t.landWidth * t.landHeight;
  return (
    <button onClick={onSelect}
      className="text-left rounded-xl p-4 flex flex-col gap-3 transition-all hover:shadow-md group"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>

      {/* Icon + tag */}
      <div className="flex items-start justify-between">
        <div className="text-3xl">{t.icon}</div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: t.tagColor + '20', color: t.tagColor }}>
          {t.tag}
        </span>
      </div>

      {/* Name + desc */}
      <div>
        <div className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{t.name}</div>
        <div className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-2)' }}>{t.desc}</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-1.5 mt-auto pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <Stat label="地块" value={`${t.landWidth}×${t.landHeight}m`} />
        <Stat label="楼层" value={`${t.numFloors}层`} />
        <Stat label="朝向" value={t.orientation} />
        <Stat label="面积" value={`≈${totalArea}m²`} />
      </div>

      {/* Hover CTA */}
      <div className="text-xs font-semibold text-center py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'var(--accent)', color: 'white' }}>
        应用此模板
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</div>
      <div className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{value}</div>
    </div>
  );
}
