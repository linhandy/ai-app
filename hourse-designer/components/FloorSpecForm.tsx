'use client';

import type { FloorSpec, BedroomSpec } from '@/lib/types';

interface Props {
  floorIndex: number;
  spec: FloorSpec;
  onChange: (spec: FloorSpec) => void;
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs w-14 shrink-0" style={{ color: 'var(--text-3)' }}>{children}</span>;
}
function AreaInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number" value={value} min={2} max={60} step={1}
        onChange={e => { const v = +e.target.value; if (v >= 2 && v <= 60) onChange(v); }}
        className="w-12 text-center text-xs px-1 py-1 rounded"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)', outline: 'none' }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
      <span className="text-xs" style={{ color: 'var(--text-3)' }}>m²</span>
    </div>
  );
}
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!on)}
      className="px-2 py-0.5 rounded text-xs font-medium transition-all"
      style={on
        ? { background: 'var(--accent)', color: 'white', border: '1px solid var(--accent)' }
        : { background: 'var(--surface)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
      {label}
    </button>
  );
}
function RoomRow({ label, enabled, area, onToggle, onArea }: {
  label: string; enabled: boolean; area: number;
  onToggle: (v: boolean) => void; onArea: (v: number) => void;
}) {
  return (
    <Row>
      <Toggle on={enabled} onChange={onToggle} label={label} />
      {enabled && <AreaInput value={area} onChange={onArea} />}
    </Row>
  );
}

function BedroomItem({ bed, index, total, onChange, onRemove }: {
  bed: BedroomSpec; index: number; total: number;
  onChange: (b: BedroomSpec) => void;
  onRemove: () => void;
}) {
  const label = index === 0 ? '主卧' : `次卧${index}`;
  return (
    <div className="flex items-center gap-1.5 pl-2 border-l-2" style={{ borderColor: 'var(--accent)' }}>
      <span className="text-xs w-10 shrink-0" style={{ color: 'var(--text-2)' }}>{label}</span>
      <AreaInput value={bed.area} onChange={v => onChange({ ...bed, area: v })} />
      <button onClick={() => onChange({ ...bed, hasBath: !bed.hasBath })}
        className="text-xs px-1.5 py-0.5 rounded transition-all"
        style={bed.hasBath
          ? { background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #93C5FD' }
          : { background: 'var(--surface)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
        带卫
      </button>
      {total > 1 && (
        <button onClick={onRemove} className="text-xs px-1 rounded"
          style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}>×</button>
      )}
    </div>
  );
}

export default function FloorSpecForm({ floorIndex: _floorIndex, spec, onChange }: Props) {
  const update = (partial: Partial<FloorSpec>) => onChange({ ...spec, ...partial });

  return (
    <div className="flex flex-col gap-3">
      {/* Bedrooms */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>卧室</span>
          <button onClick={() => { if (spec.bedrooms.length < 5) update({ bedrooms: [...spec.bedrooms, { area: 11, hasBath: false }] }); }}
            disabled={spec.bedrooms.length >= 5}
            className="text-xs px-2 py-0.5 rounded disabled:opacity-40"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            + 添加卧室
          </button>
        </div>
        {spec.bedrooms.length === 0 && (
          <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>无卧室（如杂物/商铺层）</p>
        )}
        {spec.bedrooms.map((b, i) => (
          <BedroomItem key={i} bed={b} index={i} total={spec.bedrooms.length}
            onChange={nb => { const next = [...spec.bedrooms]; next[i] = nb; update({ bedrooms: next }); }}
            onRemove={() => update({ bedrooms: spec.bedrooms.filter((_, idx) => idx !== i) })} />
        ))}
      </div>

      <div className="h-px" style={{ background: 'var(--border)' }} />

      {/* Public rooms */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>公共空间</span>
        <RoomRow label="客厅" enabled={spec.livingRoom.enabled} area={spec.livingRoom.area}
          onToggle={v => update({ livingRoom: { ...spec.livingRoom, enabled: v } })}
          onArea={v => update({ livingRoom: { ...spec.livingRoom, area: v } })} />
        <RoomRow label="餐厅" enabled={spec.diningRoom.enabled} area={spec.diningRoom.area}
          onToggle={v => update({ diningRoom: { ...spec.diningRoom, enabled: v } })}
          onArea={v => update({ diningRoom: { ...spec.diningRoom, area: v } })} />
        <RoomRow label="厨房" enabled={spec.kitchen.enabled} area={spec.kitchen.area}
          onToggle={v => update({ kitchen: { ...spec.kitchen, enabled: v } })}
          onArea={v => update({ kitchen: { ...spec.kitchen, area: v } })} />
        <RoomRow label="阳台" enabled={spec.balcony.enabled} area={spec.balcony.area}
          onToggle={v => update({ balcony: { ...spec.balcony, enabled: v } })}
          onArea={v => update({ balcony: { ...spec.balcony, area: v } })} />
      </div>

      <div className="h-px" style={{ background: 'var(--border)' }} />

      {/* Bathrooms */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>卫生间</span>
        <Row>
          <Label>数量</Label>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map(n => (
              <button key={n} onClick={() => update({ bath: { ...spec.bath, count: n } })}
                className="w-6 h-6 rounded text-xs font-medium transition-all"
                style={spec.bath.count === n
                  ? { background: 'var(--accent)', color: 'white' }
                  : { background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                {n}
              </button>
            ))}
          </div>
        </Row>
        {spec.bath.count > 0 && (
          <Row>
            <Label>面积</Label>
            <AreaInput value={spec.bath.area} onChange={v => update({ bath: { ...spec.bath, area: v } })} />
          </Row>
        )}
      </div>
    </div>
  );
}
