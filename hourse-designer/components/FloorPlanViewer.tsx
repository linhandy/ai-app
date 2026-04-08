'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { HouseDesign, Room } from '@/lib/types';
import FloorPlanCanvas from './FloorPlanCanvas';
import EmailModal from './EmailModal';
import DesignAnalysis from './DesignAnalysis';
import { downloadSVG } from '@/lib/svg-export';
import { downloadDXF } from '@/lib/dxf';
import { calcCost, fmtWan } from '@/lib/cost';
import { getUnlitRooms } from '@/lib/validation';

interface Props {
  design: HouseDesign;
  province?: string;
  floorHeight?: number;
  onDesignUpdate?: (design: HouseDesign) => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function FloorPlanViewer({ design, province = '', floorHeight = 3.0, onDesignUpdate }: Props) {
  const [localDesign, setLocalDesign] = useState<HouseDesign>(design);
  const [activeFloor, setActiveFloor] = useState(0);
  const [scale, setScale] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [renovationPerM2, setRenovationPerM2] = useState(800);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // sync when prop changes (new generation or optimization)
  useEffect(() => { setLocalDesign(design); setActiveFloor(0); }, [design]);

  const floor = localDesign.floors[activeFloor];
  const unlitRooms = getUnlitRooms(floor);
  const cost = calcCost(localDesign, province, floorHeight, renovationPerM2);

  // ─── Room drag callback ──────────────────────────────────────────────────
  const handleRoomsChange = useCallback((rooms: Room[]) => {
    setLocalDesign(prev => ({
      ...prev,
      floors: prev.floors.map((f, i) =>
        i === activeFloor ? { ...f, rooms } : f
      ),
    }));
  }, [activeFloor]);

  // ─── Exports ─────────────────────────────────────────────────────────────
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `户型图_${floor.label}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
    setShowExportMenu(false);
  };

  const handleDownloadSVG = () => {
    // Fallback: generate SVG from current canvas data URL
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const w = canvas.width, h = canvas.height;
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><image href="${dataUrl}" width="${w}" height="${h}"/></svg>`;
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `户型图_${floor.label}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleDownloadDXF = () => {
    downloadDXF(localDesign, '户型图_CAD');
    setShowExportMenu(false);
  };

  // ─── Save to Supabase ─────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveState('saving');
    try {
      const title = `${localDesign.landWidth}×${localDesign.landHeight}m · ${localDesign.floors.length}层 · 朝${localDesign.orientation}`;
      const res = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          design_data: localDesign,
          land_params: {
            landWidth: localDesign.landWidth,
            landHeight: localDesign.landHeight,
            orientation: localDesign.orientation,
            floors: localDesign.floors.length,
          },
        }),
      });
      if (!res.ok) throw new Error('save failed');
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  return (
    <div className="h-full flex overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* ── Left info panel ── */}
      <div className="w-64 shrink-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>

        {/* Header */}
        <div className="px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>设计详情</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Design params */}
          <div className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>设计参数</div>
          <InfoItem label="地块尺寸" value={`${localDesign.landWidth}m × ${localDesign.landHeight}m`} />
          <InfoItem label="大门朝向" value={localDesign.orientation} />
          <InfoItem label="楼层数" value={`${localDesign.floors.length}层`} />
          <InfoItem label="建筑面积" value={`约 ${cost.buildingArea.toFixed(0)} m²`} />

          {/* AI Score — always visible, auto-triggers on new design */}
          <div className="h-px" style={{ background: 'var(--sidebar-border)' }} />
          <div className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>AI 评分</div>
          <DesignAnalysis design={localDesign} onDesignUpdate={(d) => { setLocalDesign(d); onDesignUpdate?.(d); }} />

          {/* Room list (2D only) */}
          {(
            <>
              <div className="h-px" style={{ background: 'var(--sidebar-border)' }} />
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{floor.label} · {floor.rooms.length} 间</div>
                {unlitRooms.size > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ background: '#FEF2F2', color: '#EF4444' }}>
                    ⚠ {unlitRooms.size} 间无采光
                  </span>
                )}
              </div>
              {floor.rooms.slice(0, 6).map(r => (
                <div key={r.id} className="flex justify-between items-center">
                  <span className="text-xs flex items-center gap-1" style={{ color: unlitRooms.has(r.id) ? '#EF4444' : 'var(--text-2)' }}>
                    {unlitRooms.has(r.id) && <span title="无采光">⚠</span>}
                    {r.name}
                  </span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
                    {(r.width * r.height).toFixed(1)} m²
                  </span>
                </div>
              ))}
              {floor.rooms.length > 6 && (
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>+{floor.rooms.length - 6} 更多...</div>
              )}
            </>
          )}

          {/* Cost estimate */}
          <div className="h-px" style={{ background: 'var(--sidebar-border)' }} />
          <div className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>造价估算</div>
          <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'var(--surface-2)' }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-3)' }}>建筑面积</span>
              <span style={{ color: 'var(--text-1)' }}>{cost.buildingArea.toFixed(0)} m²</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-3)' }}>层高</span>
              <span style={{ color: 'var(--text-1)' }}>{floorHeight.toFixed(1)} m</span>
            </div>
            <div className="h-px" style={{ background: 'var(--border)' }} />
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-3)' }}>毛坯造价</span>
              <span style={{ color: 'var(--text-1)' }}>约 {fmtWan(cost.roughCost)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span style={{ color: 'var(--text-3)' }}>装修造价</span>
              <div className="flex items-center gap-1">
                <input
                  type="number" value={renovationPerM2} min={400} max={3000} step={100}
                  onChange={e => setRenovationPerM2(+e.target.value)}
                  className="w-14 text-center text-xs px-1 py-0.5 rounded"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', outline: 'none' }}
                />
                <span style={{ color: 'var(--text-3)' }}>/m²</span>
              </div>
            </div>
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-3)' }}>
              <span></span>
              <span>约 {fmtWan(cost.renovationCost)}</span>
            </div>
            <div className="h-px" style={{ background: 'var(--border)' }} />
            <div className="flex justify-between text-sm font-bold">
              <span style={{ color: 'var(--text-2)' }}>预计总造价</span>
              <span style={{ color: 'var(--accent)' }}>约 {fmtWan(cost.totalCost)}</span>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-3)' }}>
              毛坯单价 {cost.roughPerM2} 元/m²
              {province ? `（${province}参考）` : '（全国均价）'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          {/* Save */}
          <button onClick={handleSave} disabled={saveState === 'saving'}
            className="w-full py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
            style={{
              background: saveState === 'saved' ? '#D1FAE5' : saveState === 'error' ? '#FEE2E2' : 'var(--accent-light)',
              color: saveState === 'saved' ? '#065F46' : saveState === 'error' ? '#DC2626' : 'var(--accent)',
              border: '1px solid currentColor',
            }}>
            {saveState === 'saving' ? '保存中...' : saveState === 'saved' ? '✓ 已保存' : saveState === 'error' ? '保存失败' : '💾 保存方案'}
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button onClick={() => setShowExportMenu(v => !v)}
              className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{ background: 'var(--accent)', color: 'white' }}>
              <span>导出图纸</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 8L1 3h10z" /></svg>
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg shadow-lg z-20 overflow-hidden"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {[
                    { label: 'PNG 高清图', sub: '通用格式', action: handleDownloadPNG },
                    { label: 'SVG 矢量图', sub: '无损缩放', action: handleDownloadSVG },
                    { label: 'DXF 工程图', sub: 'CAD 格式', action: handleDownloadDXF },
                  ].map(item => (
                    <button key={item.label} onClick={item.action}
                      className="w-full px-4 py-3 text-left flex items-center justify-between hover:opacity-80 transition-opacity"
                      style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{item.label}</span>
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{item.sub}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Email */}
          <button onClick={() => setShowEmail(true)}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--surface)', color: 'var(--text-1)', border: '1px solid var(--border)' }}>
            📧 发送到邮箱
          </button>
        </div>
      </div>

      {/* ── Main canvas area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="h-11 shrink-0 flex items-center gap-2 px-4"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--sidebar-border)' }}>

          {(
            <div className="flex items-center gap-1">
              {localDesign.floors.map((f, i) => (
                <button key={f.floor} onClick={() => setActiveFloor(i)}
                  className="px-3 py-1 text-xs font-medium rounded transition-colors"
                  style={{
                    background: i === activeFloor ? 'var(--accent)' : 'var(--surface-2)',
                    color: i === activeFloor ? 'white' : 'var(--text-2)',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {unlitRooms.size > 0 && (
            <span className="text-xs px-2 py-0.5 rounded"
              style={{ background: '#FEF2F2', color: '#EF4444' }}>
              ⚠ {unlitRooms.size} 间无采光（红框标记）
            </span>
          )}


          {(
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={() => setScale(s => Math.min(s + 0.2, 3))}
                className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold"
                style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                +
              </button>
              <span className="text-xs w-10 text-center" style={{ color: 'var(--text-3)' }}>
                {Math.round(scale * 100)}%
              </span>
              <button onClick={() => setScale(s => Math.max(s - 0.2, 0.3))}
                className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold"
                style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                −
              </button>
              <button onClick={() => setScale(1)} className="px-2 py-1 text-xs rounded"
                style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                重置
              </button>
              <span className="text-xs ml-2" style={{ color: 'var(--text-3)' }}>
                拖动房间可调整位置
              </span>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 canvas-grid overflow-auto">
          <div className="inline-block p-6"
            style={{ transformOrigin: 'top left', transform: `scale(${scale})` }}>
            <FloorPlanCanvas
              ref={canvasRef}
              floor={floor}
              buildingWidth={localDesign.buildingWidth}
              buildingHeight={localDesign.buildingHeight}
              orientation={localDesign.orientation}
              scale={scale}
              unlitRooms={unlitRooms}
              onRoomsChange={handleRoomsChange}
            />
          </div>
        </div>
      </div>

      {showEmail && <EmailModal design={localDesign} onClose={() => setShowEmail(false)} />}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</div>
      <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-1)' }}>{value}</div>
    </div>
  );
}
