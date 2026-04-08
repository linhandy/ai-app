'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { DesignInput, Orientation, HouseDesign, FloorSpec, GlobalSpec } from '@/lib/types';
import { defaultFloorSpec, DEFAULT_GLOBAL_SPEC, PROVINCE_RULES } from '@/lib/types';
import { floorSpecToText } from '@/lib/prompts';
import FloorPlanViewer from './FloorPlanViewer';
import SketchUpload from './SketchUpload';
import FloorSpecForm from './FloorSpecForm';

const ORIENTATIONS: Orientation[] = ['南', '北', '东', '西', '东南', '东北', '西南', '西北'];
const FLOOR_LABELS = ['一层', '二层', '三层', '四层'];

const QUICK_SAMPLES = [
  '两层自建房，地块10×12米，朝南。一楼：大客厅、餐厅厨房一体、老人房；二楼：主卧带独卫、两间次卧、公共卫生间。现代简约风格。',
  '三层住宅，5×15米窄地块，朝南。一楼停车库和入口玄关，二楼客厅餐厅厨房，三楼三卧两卫，主卧朝南。',
  '两层自建房，12×9米，朝南，一楼：宽敞客厅朝南带大飘窗、餐厅、厨房靠东、卫生间；二楼：主卧朝南带阳台独卫、两间次卧、公卫。',
  '四层自建房，8×14米，朝南。一楼商铺或车库，二楼全家活动区（大客厅+开放厨餐厅），三楼主卧次卧带卫生间，四楼两卧一卫+露台花园。',
  '单层平房，15×10米大地块，朝南，三室两厅两卫：主卧老人房朝南，客厅餐厅朝南采光好，厨房靠东，两卫生间靠北集中布管。',
];

type Mode   = 'param' | 'sketch' | 'quick';
type Status = 'idle' | 'generating' | 'done' | 'error';

// ─── Per-mode isolated state ─────────────────────────────────────────────────
interface DesignSlot {
  design: HouseDesign | null;
  status: Status;
  error: string;
  progress: string;
  progressPct: number;
}

const EMPTY_SLOT: DesignSlot = { design: null, status: 'idle', error: '', progress: '', progressPct: 0 };

export default function DesignWorkspace() {
  const [mode, setMode] = useState<Mode>('param');

  // Per-mode slots (each mode has independent design state)
  const [slots, setSlots] = useState<Record<Mode, DesignSlot>>({
    param:  { ...EMPTY_SLOT },
    quick:  { ...EMPTY_SLOT },
    sketch: { ...EMPTY_SLOT },
  });
  const pollRefs = useRef<Record<Mode, ReturnType<typeof setInterval> | null>>({
    param: null, quick: null, sketch: null,
  });

  // Land params
  const [landWidth, setLandWidth]     = useState(12);
  const [landHeight, setLandHeight]   = useState(10);
  const [orientation, setOrientation] = useState<Orientation>('南');
  const [numFloors, setNumFloors]     = useState(2);

  // Structured floor specs
  const [floorSpecs, setFloorSpecs] = useState<FloorSpec[]>([
    defaultFloorSpec(true),
    defaultFloorSpec(false),
  ]);

  // Global spec
  const [globalSpec, setGlobalSpec] = useState<GlobalSpec>(DEFAULT_GLOBAL_SPEC);

  // UI state
  const [activeFloorTab, setActiveFloorTab] = useState(0);
  const [showGlobal, setShowGlobal]         = useState(false);

  // Quick design mode
  const [quickPrompt, setQuickPrompt] = useState('');
  const [sampleIdx, setSampleIdx] = useState(0);

  // Clean up all polling on unmount
  useEffect(() => () => {
    Object.values(pollRefs.current).forEach(ref => { if (ref) clearInterval(ref); });
  }, []);

  const handleNumFloors = (n: number) => {
    setNumFloors(n);
    setFloorSpecs(prev => Array.from({ length: n }, (_, i) => prev[i] ?? defaultFloorSpec(i === 0)));
    setActiveFloorTab(t => Math.min(t, n - 1));
  };

  // ─── Slot helpers ──────────────────────────────────────────────────────────
  const updateSlot = useCallback((m: Mode, patch: Partial<DesignSlot>) => {
    setSlots(prev => ({ ...prev, [m]: { ...prev[m], ...patch } }));
  }, []);

  const slot = slots[mode];

  // ─── Handle design update from optimizer ──────────────────────────────────
  const handleDesignUpdate = useCallback((newDesign: HouseDesign) => {
    updateSlot(mode, { design: newDesign });
  }, [mode, updateSlot]);

  // ─── Job queue polling ────────────────────────────────────────────────────
  const startPolling = useCallback((jobId: string, m: Mode) => {
    if (pollRefs.current[m]) clearInterval(pollRefs.current[m]!);
    pollRefs.current[m] = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();
        const job = data.job;
        if (!job) return;
        if (job.status === 'done') {
          clearInterval(pollRefs.current[m]!);
          pollRefs.current[m] = null;
          updateSlot(m, { design: job.design_data, status: 'done', progress: '', progressPct: 100 });
        } else if (job.status === 'failed') {
          clearInterval(pollRefs.current[m]!);
          pollRefs.current[m] = null;
          updateSlot(m, { error: job.error_msg || '生成失败，请重试', status: 'error', progress: '' });
        } else {
          updateSlot(m, { progress: job.progress_msg || 'AI 生成中...', progressPct: job.progress ?? 10 });
        }
      } catch { /* network hiccup, keep polling */ }
    }, 1500);
  }, [updateSlot]);

  // ─── Generate handlers ────────────────────────────────────────────────────
  const handleGenerate = async () => {
    updateSlot('param', { status: 'generating', error: '', progress: '正在创建任务...', progressPct: 5, design: null });
    const input: DesignInput = {
      landWidth, landHeight, orientation, numFloors,
      floorRequirements: floorSpecs.slice(0, numFloors).map((spec, i) =>
        floorSpecToText(spec, i + 1, numFloors)
      ),
    };
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, globalSpec }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updateSlot('param', { progress: '任务已提交，AI 生成中...', progressPct: 10 });
      startPolling(data.jobId, 'param');
    } catch (err: unknown) {
      updateSlot('param', { error: err instanceof Error ? err.message : '生成失败，请重试', status: 'error' });
    }
  };

  const handleQuickGenerate = async () => {
    if (!quickPrompt.trim()) return;
    updateSlot('quick', { status: 'generating', error: '', progress: 'AI 正在理解需求...', progressPct: 5, design: null });
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'quick', prompt: quickPrompt.trim(), landWidth, landHeight, orientation, globalSpec }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updateSlot('quick', { progress: '需求已提交，AI 生成中...', progressPct: 10 });
      startPolling(data.jobId, 'quick');
    } catch (err: unknown) {
      updateSlot('quick', { error: err instanceof Error ? err.message : '生成失败，请重试', status: 'error' });
    }
  };

  // Legacy sketch generate (direct from image — fallback)
  const handleSketchGenerate = async (imageBase64: string) => {
    updateSlot('sketch', { status: 'generating', error: '', progress: 'AI 正在识别草图...', progressPct: 5, design: null });
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'sketch', imageBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updateSlot('sketch', { progress: '草图已提交，AI 识别中...', progressPct: 15 });
      startPolling(data.jobId, 'sketch');
    } catch (err: unknown) {
      updateSlot('sketch', { error: err instanceof Error ? err.message : '草图识别失败，请重试', status: 'error' });
    }
  };

  // New sketch flow: generate from parsed analysis (user confirmed/edited)
  const handleSketchFromAnalysis = async (analysis: { buildingWidth: number; buildingHeight: number; orientation: string; numFloors: number; floorRequirements: string[]; summary: string }) => {
    updateSlot('sketch', { status: 'generating', error: '', progress: 'AI 正在生成 CAD 图...', progressPct: 10, design: null });
    // Use the quick mode API with the analysis summary + floorRequirements as the prompt
    const prompt = `${analysis.summary}\n\n每层需求：\n${analysis.floorRequirements.join('\n')}`;
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'quick',
          prompt,
          landWidth: analysis.buildingWidth + 1,
          landHeight: analysis.buildingHeight + 1,
          orientation: analysis.orientation,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updateSlot('sketch', { progress: '正在生成高清 CAD 图...', progressPct: 20 });
      startPolling(data.jobId, 'sketch');
    } catch (err: unknown) {
      updateSlot('sketch', { error: err instanceof Error ? err.message : '生成失败，请重试', status: 'error' });
    }
  };

  return (
    <div className="h-full flex overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* ── Left Sidebar ── */}
      <aside className="w-80 shrink-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>

        {/* Mode tabs */}
        <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          {([['param', '参数设计'], ['quick', '快捷设计'], ['sketch', '草图识别']] as [Mode, string][]).map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)}
              className="flex-1 py-2.5 text-xs font-medium transition-colors relative"
              style={{
                background: mode === m ? 'var(--surface)' : 'transparent',
                color: mode === m ? 'var(--accent)' : 'var(--text-3)',
                borderBottom: mode === m ? '2px solid var(--accent)' : '2px solid transparent',
              }}>
              {label}
            </button>
          ))}
        </div>

        {mode === 'sketch' ? (
          <div className="flex-1 overflow-y-auto">
            <SketchUpload onGenerate={handleSketchGenerate} onGenerateFromAnalysis={handleSketchFromAnalysis} disabled={slots.sketch.status === 'generating'} />
          </div>
        ) : mode === 'quick' ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
                  用自然语言描述你的房子需求，AI 将自动生成完整户型方案。
                </p>
                <textarea
                  value={quickPrompt}
                  onChange={e => setQuickPrompt(e.target.value)}
                  placeholder="例如：三层自建房，一楼客厅餐厅厨房和一个老人房，二楼三个卧室主卧带独卫，三楼一个大阳台和储物间，地块12x10米，南向大门..."
                  rows={8}
                  className="w-full px-3 py-2.5 rounded-lg text-xs resize-none leading-relaxed"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <Section label="参考尺寸（未提及时使用）">
                <div className="flex items-center gap-2">
                  <DimInput label="宽" value={landWidth} onChange={setLandWidth} />
                  <span className="text-sm" style={{ color: 'var(--text-3)' }}>×</span>
                  <DimInput label="长" value={landHeight} onChange={setLandHeight} />
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-3)' }}>米</span>
                </div>
              </Section>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>示例提示词（点击填入）</span>
                  <button onClick={() => setSampleIdx(i => (i + 1) % QUICK_SAMPLES.length)}
                    className="text-xs px-2 py-0.5 rounded transition-colors"
                    style={{ background: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                    换一组
                  </button>
                </div>
                <button onClick={() => setQuickPrompt(QUICK_SAMPLES[sampleIdx])}
                  className="text-left text-xs p-2.5 rounded-lg leading-relaxed transition-opacity hover:opacity-70"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                  {QUICK_SAMPLES[sampleIdx]}
                </button>
              </div>
            </div>
            <div className="p-4 shrink-0" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
              {slots.quick.error && (
                <div className="mb-3 text-xs p-2.5 rounded-lg leading-relaxed"
                  style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>{slots.quick.error}</div>
              )}
              <button onClick={handleQuickGenerate} disabled={slots.quick.status === 'generating' || !quickPrompt.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
                style={{ background: 'var(--accent)', color: 'white' }}>
                {slots.quick.status === 'generating' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    生成中...
                  </span>
                ) : 'AI 快捷生成'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 flex flex-col gap-4">
                <Section label="地块尺寸">
                  <div className="flex items-center gap-2">
                    <DimInput label="宽" value={landWidth} onChange={setLandWidth} />
                    <span className="text-sm" style={{ color: 'var(--text-3)' }}>×</span>
                    <DimInput label="长" value={landHeight} onChange={setLandHeight} />
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-3)' }}>米</span>
                  </div>
                </Section>

                <Section label="大门朝向">
                  <div className="grid grid-cols-4 gap-1.5">
                    {ORIENTATIONS.map(o => (
                      <button key={o} onClick={() => setOrientation(o)}
                        className="py-1.5 rounded text-xs font-medium transition-all"
                        style={{
                          background: orientation === o ? 'var(--accent)' : 'var(--surface)',
                          color: orientation === o ? 'white' : 'var(--text-2)',
                          border: `1px solid ${orientation === o ? 'var(--accent)' : 'var(--border)'}`,
                        }}>
                        {o}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section label="楼层数">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map(n => (
                      <button key={n} onClick={() => handleNumFloors(n)}
                        className="flex-1 py-1.5 rounded text-xs font-medium transition-all"
                        style={{
                          background: numFloors === n ? 'var(--accent)' : 'var(--surface)',
                          color: numFloors === n ? 'white' : 'var(--text-2)',
                          border: `1px solid ${numFloors === n ? 'var(--accent)' : 'var(--border)'}`,
                        }}>
                        {n}层
                      </button>
                    ))}
                  </div>
                </Section>

                <Section label="每层功能需求">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: numFloors }, (_, i) => (
                      <button key={i} onClick={() => setActiveFloorTab(i)}
                        className="flex-1 py-1 rounded text-xs font-medium transition-all"
                        style={{
                          background: activeFloorTab === i ? 'var(--accent)' : 'var(--surface)',
                          color: activeFloorTab === i ? 'white' : 'var(--text-2)',
                          border: `1px solid ${activeFloorTab === i ? 'var(--accent)' : 'var(--border)'}`,
                        }}>
                        {FLOOR_LABELS[i]}
                      </button>
                    ))}
                  </div>
                  <FloorSpecForm
                    key={activeFloorTab}
                    floorIndex={activeFloorTab}
                    spec={floorSpecs[activeFloorTab]}
                    onChange={spec => {
                      const next = [...floorSpecs];
                      next[activeFloorTab] = spec;
                      setFloorSpecs(next);
                    }}
                  />
                </Section>

                <div>
                  <button onClick={() => setShowGlobal(v => !v)}
                    className="w-full flex items-center justify-between py-1"
                    style={{ color: 'var(--text-2)' }}>
                    <span className="text-xs font-semibold">全局选项</span>
                    <span className="text-xs">{showGlobal ? '▲' : '▼'}</span>
                  </button>
                  {showGlobal && (
                    <GlobalSpecPanel spec={globalSpec} onChange={setGlobalSpec} numFloors={numFloors} landWidth={landWidth} landHeight={landHeight} />
                  )}
                </div>

                <div className="rounded-lg p-3 text-xs leading-relaxed"
                  style={{ background: 'var(--accent-light)', color: 'var(--accent-text)' }}>
                  💡 AI 自动优化动静分区、管道集中、南北通透等建筑规范
                </div>
              </div>
            </div>

            <div className="p-4 shrink-0" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
              {slots.param.error && (
                <div className="mb-3 text-xs p-2.5 rounded-lg leading-relaxed"
                  style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>{slots.param.error}</div>
              )}
              <button onClick={handleGenerate} disabled={slots.param.status === 'generating'}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
                style={{ background: 'var(--accent)', color: 'white' }}>
                {slots.param.status === 'generating' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    生成中...
                  </span>
                ) : '生成设计方案'}
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ── Main canvas — keep all completed viewers mounted to preserve scoring ── */}
      <main className="flex-1 overflow-hidden relative">
        {(['param', 'quick', 'sketch'] as Mode[]).map(m => {
          const s = slots[m];
          if (s.status !== 'done' || !s.design) return null;
          return (
            <div key={m} className="absolute inset-0" style={{ display: m === mode ? 'block' : 'none' }}>
              <FloorPlanViewer
                design={s.design}
                province={globalSpec.province}
                floorHeight={globalSpec.floorHeight}
                onDesignUpdate={m === mode ? handleDesignUpdate : undefined}
              />
            </div>
          );
        })}
        {/* Show empty canvas if current mode has no design */}
        {(slot.status !== 'done' || !slot.design) && (
          <EmptyCanvas status={slot.status} progress={slot.progress} progressPct={slot.progressPct} />
        )}
      </main>
    </div>
  );
}

// ─── Global spec panel ────────────────────────────────────────────────────────
function GlobalSpecPanel({ spec, onChange, numFloors, landWidth, landHeight }: {
  spec: GlobalSpec; onChange: (s: GlobalSpec) => void; numFloors: number;
  landWidth: number; landHeight: number;
}) {
  const u = (p: Partial<GlobalSpec>) => onChange({ ...spec, ...p });
  const provinces = Object.keys(PROVINCE_RULES);
  const rule = spec.province ? PROVINCE_RULES[spec.province] : null;
  const buildArea = landWidth * landHeight;
  const areaViolation = rule && buildArea > rule.maxArea;
  const floorViolation = rule && numFloors > rule.maxFloors;

  return (
    <div className="flex flex-col gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
      {/* Province selector */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs" style={{ color: 'var(--text-2)' }}>所在省份（宅基地合规检查）</span>
        <select value={spec.province} onChange={e => u({ province: e.target.value })}
          className="w-full px-2 py-1.5 rounded-lg text-xs"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', outline: 'none' }}>
          <option value="">-- 不选择 --</option>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {rule && (
          <div className="text-xs leading-relaxed px-2 py-1.5 rounded-lg"
            style={{ background: (areaViolation || floorViolation) ? 'var(--error-bg)' : '#F0FDF4', color: (areaViolation || floorViolation) ? 'var(--error)' : '#15803D' }}>
            {rule.note}
            {areaViolation && <div className="mt-1 font-semibold">⚠ 地块面积 {buildArea}m² 超出限额 {rule.maxArea}m²</div>}
            {floorViolation && <div className="mt-1 font-semibold">⚠ 楼层数 {numFloors} 超出限额 {rule.maxFloors} 层</div>}
            {!areaViolation && !floorViolation && <div className="mt-1">✓ 地块面积和楼层数符合规定</div>}
            <div className="mt-1" style={{ color: 'var(--text-3)' }}>参考造价：约 {rule.costPerM2} 元/m²</div>
          </div>
        )}
      </div>

      {/* Elevator */}
      {numFloors > 1 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text-2)' }}>电梯</span>
            <ToggleSwitch on={spec.hasElevator} onChange={v => u({ hasElevator: v })} />
          </div>
          {spec.hasElevator && (
            <div className="flex gap-1.5 pl-2">
              {(['left', 'center', 'right'] as const).map(pos => (
                <button key={pos} onClick={() => u({ elevatorPos: pos })}
                  className="flex-1 py-1 rounded text-xs transition-all"
                  style={spec.elevatorPos === pos
                    ? { background: 'var(--accent)', color: 'white' }
                    : { background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                  {pos === 'left' ? '靠左' : pos === 'center' ? '居中' : '靠右'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stairs position */}
      {numFloors > 1 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs" style={{ color: 'var(--text-2)' }}>楼梯位置</span>
          <div className="flex gap-1.5">
            {(['left', 'center', 'right'] as const).map(pos => (
              <button key={pos} onClick={() => u({ stairsPos: pos })}
                className="flex-1 py-1 rounded text-xs transition-all"
                style={spec.stairsPos === pos
                  ? { background: 'var(--accent)', color: 'white' }
                  : { background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                {pos === 'left' ? '靠左' : pos === 'center' ? '居中' : '靠右'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Style preset */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs" style={{ color: 'var(--text-2)' }}>设计风格</span>
        <div className="grid grid-cols-3 gap-1">
          {['现代简约', '新中式', '欧式', '实用经济'].map(s => (
            <button key={s} onClick={() => u({ style: spec.style === s ? '' : s })}
              className="py-1 rounded text-xs transition-all"
              style={spec.style === s
                ? { background: 'var(--accent)', color: 'white' }
                : { background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Floor height */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-2)' }}>层高</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{spec.floorHeight.toFixed(1)} m</span>
        </div>
        <input type="range" min={2.8} max={4.0} step={0.1} value={spec.floorHeight}
          onChange={e => u({ floorHeight: +e.target.value })} className="w-full" />
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-3)' }}>
          <span>2.8m</span><span>标准 3.0m</span><span>4.0m</span>
        </div>
      </div>

      {/* Overhang */}
      {numFloors > 1 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs" style={{ color: 'var(--text-2)' }}>二楼以上飘出宽度（米）</span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pl-1">
            {([['front', '前（南）'], ['back', '后（北）'], ['left', '左（西）'], ['right', '右（东）']] as [keyof typeof spec.overhang, string][]).map(([dir, label]) => (
              <div key={dir} className="flex items-center gap-1.5">
                <span className="text-xs w-14 shrink-0" style={{ color: 'var(--text-3)' }}>{label}</span>
                <input type="number" value={spec.overhang[dir]} min={0} max={3} step={0.1}
                  onChange={e => u({ overhang: { ...spec.overhang, [dir]: +e.target.value } })}
                  className="w-14 text-center text-xs px-1 py-1 rounded"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>m</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className="w-10 h-5 rounded-full transition-all relative"
      style={{ background: on ? 'var(--accent)' : 'var(--border)' }}>
      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: on ? '22px' : '2px' }} />
    </button>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{label}</div>
      {children}
    </div>
  );
}

function DimInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex-1">
      <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{label}</div>
      <input
        type="number" value={value} min={5} max={50}
        onChange={e => { const v = Number(e.target.value); if (v >= 5 && v <= 50) onChange(v); }}
        className="w-full px-2 py-1.5 rounded-lg text-sm text-center font-medium"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', outline: 'none' }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  );
}

function EmptyCanvas({ status, progress, progressPct }: { status: Status; progress: string; progressPct: number }) {
  return (
    <div className="h-full canvas-grid flex flex-col items-center justify-center gap-4">
      {status === 'generating' ? (
        <>
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{progress || 'AI 正在生成户型方案...'}</p>
          <div className="w-64">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-3)' }}>
              <span>进度</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: 'var(--accent)' }} />
            </div>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>逐层分析，通常需要 30-90 秒</p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            📐
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>设计图将在此处显示</p>
          <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--text-3)' }}>
            在左侧配置房间参数后<br />点击「生成设计方案」
          </p>
        </>
      )}
    </div>
  );
}
