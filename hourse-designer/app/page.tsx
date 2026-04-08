'use client';

import Link from 'next/link';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useUser, SignInButton, SignUpButton } from '@clerk/nextjs';
import FloorPlanCanvas from '@/components/FloorPlanCanvas';
import type { HouseDesign } from '@/lib/types';

// ─── 3-floor demo design (10×12m building, 南向) ────────────────────────────
const DEMO_3F: HouseDesign = {
  landWidth: 12, landHeight: 14,
  orientation: '南',
  buildingWidth: 10, buildingHeight: 12,
  floors: [
    {
      floor: 1, label: '一层',
      rooms: [
        { id: 'f1r1', name: '客厅',   type: '客厅',   x: 0,   y: 0,   width: 5,   height: 6   },
        { id: 'f1r2', name: '餐厅',   type: '餐厅',   x: 5,   y: 0,   width: 5,   height: 4.5 },
        { id: 'f1r3', name: '厨房',   type: '厨房',   x: 5,   y: 4.5, width: 3,   height: 3   },
        { id: 'f1r4', name: '卫生间', type: '卫生间', x: 8,   y: 4.5, width: 2,   height: 3   },
        { id: 'f1r5', name: '老人房', type: '老人房', x: 0,   y: 6,   width: 5,   height: 6   },
        { id: 'f1r6', name: '楼梯间', type: '楼梯间', x: 5,   y: 7.5, width: 2.5, height: 4.5 },
        { id: 'f1r7', name: '储藏室', type: '储藏室', x: 7.5, y: 7.5, width: 2.5, height: 4.5 },
      ],
      windows: [
        { id: 'f1w1', roomId: 'f1r1', wall: 'north',  position: 0.5, widthMeters: 2.4 },
        { id: 'f1w2', roomId: 'f1r1', wall: 'south',  position: 0.5, widthMeters: 3.0 },
        { id: 'f1w3', roomId: 'f1r2', wall: 'north',  position: 0.5, widthMeters: 1.8 },
        { id: 'f1w4', roomId: 'f1r3', wall: 'east',   position: 0.5, widthMeters: 1.2 },
        { id: 'f1w5', roomId: 'f1r4', wall: 'east',   position: 0.5, widthMeters: 0.9 },
        { id: 'f1w6', roomId: 'f1r5', wall: 'south',  position: 0.5, widthMeters: 2.0 },
        { id: 'f1w7', roomId: 'f1r5', wall: 'west',   position: 0.5, widthMeters: 1.5 },
      ],
      doors: [
        { id: 'f1d1', roomId: 'f1r1', wall: 'south',  position: 0.35, widthMeters: 1.8, isMain: true  },
        { id: 'f1d2', roomId: 'f1r5', wall: 'east',   position: 0.5,  widthMeters: 0.9, isMain: false },
        { id: 'f1d3', roomId: 'f1r3', wall: 'west',   position: 0.5,  widthMeters: 0.9, isMain: false },
        { id: 'f1d4', roomId: 'f1r4', wall: 'west',   position: 0.5,  widthMeters: 0.8, isMain: false },
      ],
    },
    {
      floor: 2, label: '二层',
      rooms: [
        { id: 'f2r1', name: '主卧',   type: '主卧',   x: 0,   y: 0,   width: 5,   height: 5   },
        { id: 'f2r2', name: '主卫',   type: '卫生间', x: 5,   y: 0,   width: 2,   height: 5   },
        { id: 'f2r3', name: '书房',   type: '书房',   x: 7,   y: 0,   width: 3,   height: 5   },
        { id: 'f2r4', name: '次卧一', type: '次卧',   x: 0,   y: 5,   width: 4,   height: 7   },
        { id: 'f2r5', name: '走廊',   type: '走廊',   x: 4,   y: 5,   width: 2,   height: 2.5 },
        { id: 'f2r6', name: '卫生间', type: '卫生间', x: 6,   y: 5,   width: 1.5, height: 2.5 },
        { id: 'f2r7', name: '楼梯间', type: '楼梯间', x: 7.5, y: 5,   width: 2.5, height: 2.5 },
        { id: 'f2r8', name: '次卧二', type: '次卧',   x: 4,   y: 7.5, width: 6,   height: 4.5 },
      ],
      windows: [
        { id: 'f2w1', roomId: 'f2r1', wall: 'north',  position: 0.5, widthMeters: 2.0 },
        { id: 'f2w2', roomId: 'f2r1', wall: 'south',  position: 0.5, widthMeters: 1.8 },
        { id: 'f2w3', roomId: 'f2r3', wall: 'north',  position: 0.5, widthMeters: 1.5 },
        { id: 'f2w4', roomId: 'f2r3', wall: 'east',   position: 0.5, widthMeters: 1.2 },
        { id: 'f2w5', roomId: 'f2r4', wall: 'south',  position: 0.5, widthMeters: 1.8 },
        { id: 'f2w6', roomId: 'f2r4', wall: 'west',   position: 0.5, widthMeters: 1.5 },
        { id: 'f2w7', roomId: 'f2r8', wall: 'south',  position: 0.5, widthMeters: 2.4 },
        { id: 'f2w8', roomId: 'f2r8', wall: 'east',   position: 0.5, widthMeters: 1.5 },
      ],
      doors: [
        { id: 'f2d1', roomId: 'f2r1', wall: 'east',   position: 0.5, widthMeters: 0.9, isMain: false },
        { id: 'f2d2', roomId: 'f2r4', wall: 'east',   position: 0.3, widthMeters: 0.9, isMain: false },
        { id: 'f2d3', roomId: 'f2r8', wall: 'north',  position: 0.5, widthMeters: 0.9, isMain: false },
        { id: 'f2d4', roomId: 'f2r3', wall: 'west',   position: 0.5, widthMeters: 0.9, isMain: false },
      ],
    },
    {
      floor: 3, label: '三层',
      rooms: [
        { id: 'f3r1', name: '次卧三', type: '次卧',   x: 0,   y: 0,   width: 4.5, height: 5.5 },
        { id: 'f3r2', name: '儿童房', type: '次卧',   x: 4.5, y: 0,   width: 5.5, height: 5.5 },
        { id: 'f3r3', name: '卫生间', type: '卫生间', x: 0,   y: 5.5, width: 2,   height: 3   },
        { id: 'f3r4', name: '楼梯间', type: '楼梯间', x: 2,   y: 5.5, width: 2.5, height: 3   },
        { id: 'f3r5', name: '走廊',   type: '走廊',   x: 4.5, y: 5.5, width: 2,   height: 3   },
        { id: 'f3r6', name: '晒台',   type: '阳台',   x: 6.5, y: 5.5, width: 3.5, height: 6.5 },
        { id: 'f3r7', name: '储藏室', type: '储藏室', x: 0,   y: 8.5, width: 2,   height: 3.5 },
        { id: 'f3r8', name: '健身房', type: '书房',   x: 2,   y: 8.5, width: 4.5, height: 3.5 },
      ],
      windows: [
        { id: 'f3w1', roomId: 'f3r1', wall: 'north',  position: 0.5, widthMeters: 1.8 },
        { id: 'f3w2', roomId: 'f3r1', wall: 'west',   position: 0.5, widthMeters: 1.5 },
        { id: 'f3w3', roomId: 'f3r2', wall: 'north',  position: 0.5, widthMeters: 2.0 },
        { id: 'f3w4', roomId: 'f3r2', wall: 'east',   position: 0.5, widthMeters: 1.5 },
        { id: 'f3w5', roomId: 'f3r8', wall: 'south',  position: 0.5, widthMeters: 2.0 },
        { id: 'f3w6', roomId: 'f3r3', wall: 'west',   position: 0.5, widthMeters: 0.9 },
      ],
      doors: [
        { id: 'f3d1', roomId: 'f3r1', wall: 'east',   position: 0.5, widthMeters: 0.9, isMain: false },
        { id: 'f3d2', roomId: 'f3r2', wall: 'south',  position: 0.5, widthMeters: 0.9, isMain: false },
        { id: 'f3d3', roomId: 'f3r8', wall: 'north',  position: 0.5, widthMeters: 0.9, isMain: false },
      ],
    },
  ],
};

const SCALE = 0.62;
const CW = Math.round((10 * 50 + 160) * SCALE);   // canvas width  after scale
const CH = Math.round((12 * 50 + 160) * SCALE);   // canvas height after scale

// ─── Animated generation demo ─────────────────────────────────────────────────
const DEMO_STEPS = [
  { label: '解析地块参数',     pct: 15 },
  { label: '生成一层平面布局', pct: 35 },
  { label: '生成二层平面布局', pct: 55 },
  { label: '生成三层平面布局', pct: 75 },
  { label: '添加门窗标注',     pct: 88 },
  { label: '生成尺寸标注链',   pct: 95 },
  { label: '完成',             pct: 100 },
];

function GenerationDemo() {
  const [phase, setPhase] = useState<'input' | 'loading' | 'done'>('input');
  const [stepIdx, setStepIdx] = useState(0);
  const [pct, setPct] = useState(0);
  const [activeFloor, setActiveFloor] = useState(0);
  const canvasRefs = [
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null),
  ];

  const startGeneration = useCallback(() => {
    setPhase('loading');
    setStepIdx(0);
    setPct(0);
    let idx = 0;
    const tick = () => {
      if (idx >= DEMO_STEPS.length) {
        setPhase('done');
        return;
      }
      const step = DEMO_STEPS[idx];
      setStepIdx(idx);
      // Animate pct from current to step.pct
      const target = step.pct;
      const prev = idx === 0 ? 0 : DEMO_STEPS[idx - 1].pct;
      const duration = 600 + Math.random() * 400;
      const start = Date.now();
      const anim = () => {
        const t = Math.min(1, (Date.now() - start) / duration);
        setPct(Math.round(prev + (target - prev) * t));
        if (t < 1) requestAnimationFrame(anim);
        else {
          idx++;
          setTimeout(tick, 300 + Math.random() * 200);
        }
      };
      requestAnimationFrame(anim);
    };
    setTimeout(tick, 400);
  }, []);

  const reset = () => { setPhase('input'); setPct(0); setStepIdx(0); setActiveFloor(0); };

  const inputRows = [
    ['地块宽度', '12 m'],
    ['地块深度', '14 m'],
    ['建筑朝向', '朝南'],
    ['楼层数',   '3 层'],
    ['一层需求', '客厅、餐厅、厨房、老人房、卫生间'],
    ['二层需求', '主卧（带主卫）、书房、次卧×2、卫生间'],
    ['三层需求', '次卧、儿童房、健身房、晒台、卫生间'],
  ];

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 24px 64px rgba(0,0,0,0.1)' }}>

      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3"
        style={{ background: '#1c1c1e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {['#EF4444','#F59E0B','#10B981'].map(c => (
          <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.8 }} />
        ))}
        <span className="mx-auto text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
          易建房 — 三层自建房设计演示
        </span>
        {phase !== 'input' && (
          <button onClick={reset}
            className="text-xs px-2 py-0.5 rounded transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
            重置
          </button>
        )}
      </div>

      {/* ── Phase: Input form ── */}
      {phase === 'input' && (
        <div className="flex flex-col md:flex-row" style={{ background: '#fafafa' }}>
          {/* Left: parameters */}
          <div className="md:w-72 shrink-0 p-6 flex flex-col gap-4"
            style={{ borderRight: '1px solid #e5e7eb', background: '#fff' }}>
            <div>
              <p className="text-xs font-semibold mb-3" style={{ color: '#374151' }}>地块 & 需求参数</p>
              <div className="flex flex-col gap-2.5">
                {inputRows.map(([label, val]) => (
                  <div key={label}>
                    <div className="text-xs" style={{ color: '#9ca3af' }}>{label}</div>
                    <div className="text-xs font-medium mt-0.5" style={{ color: '#111827' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={startGeneration}
              className="mt-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg,#D97706,#B45309)', boxShadow: '0 4px 16px rgba(217,119,6,0.3)' }}>
              ✨ 点击生成图纸
            </button>
          </div>

          {/* Right: preview placeholder */}
          <div className="flex-1 flex flex-col items-center justify-center p-10 gap-5"
            style={{ background: '#F3F4F6', minHeight: 320 }}>
            <div className="grid grid-cols-3 gap-3 opacity-25">
              {DEMO_3F.floors.map((_, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-gray-300"
                  style={{ width: CW * 0.55, height: CH * 0.55, background: '#e5e7eb' }}>
                  <div className="w-full h-full" style={{ transform: `scale(${SCALE * 0.55})`, transformOrigin: 'top left', width: 10*50+160, height: 12*50+160 }}>
                    <FloorPlanCanvas
                      ref={canvasRefs[i]}
                      floor={DEMO_3F.floors[i]}
                      buildingWidth={DEMO_3F.buildingWidth}
                      buildingHeight={DEMO_3F.buildingHeight}
                      orientation={DEMO_3F.orientation}
                      scale={1}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm font-medium" style={{ color: '#9ca3af' }}>点击左侧按钮开始 AI 生成</p>
          </div>
        </div>
      )}

      {/* ── Phase: Loading ── */}
      {phase === 'loading' && (
        <div className="flex flex-col md:flex-row" style={{ background: '#fafafa' }}>
          {/* Left: progress */}
          <div className="md:w-72 shrink-0 p-6 flex flex-col gap-4"
            style={{ borderRight: '1px solid #e5e7eb', background: '#fff' }}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold" style={{ color: '#374151' }}>AI 正在生成…</p>
                <span className="text-xs font-bold" style={{ color: '#D97706' }}>{pct}%</span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-full mb-5" style={{ background: '#e5e7eb' }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#D97706,#B45309)' }} />
              </div>
              {/* Steps */}
              <div className="flex flex-col gap-2.5">
                {DEMO_STEPS.slice(0, -1).map((s, i) => (
                  <div key={s.label} className={`flex items-center gap-2 text-xs transition-all ${i <= stepIdx ? 'opacity-100' : 'opacity-30'}`}>
                    <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[9px]"
                      style={{ background: i < stepIdx ? '#10B981' : i === stepIdx ? '#D97706' : '#e5e7eb', color: i <= stepIdx ? 'white' : '#9ca3af' }}>
                      {i < stepIdx ? '✓' : i + 1}
                    </div>
                    <span style={{ color: i === stepIdx ? '#111827' : '#6b7280' }}>{s.label}</span>
                    {i === stepIdx && <span className="animate-pulse" style={{ color: '#D97706' }}>…</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Right: blurred preview */}
          <div className="flex-1 flex items-center justify-center p-6"
            style={{ background: '#F3F4F6', minHeight: 320 }}>
            <div className="grid grid-cols-3 gap-3" style={{ filter: `blur(${Math.max(0, 8 - pct * 0.08)}px)`, opacity: 0.4 + pct * 0.006 }}>
              {DEMO_3F.floors.map((_, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-gray-300"
                  style={{ width: CW * 0.55, height: CH * 0.55 }}>
                  <div style={{ transform: `scale(${SCALE * 0.55})`, transformOrigin: 'top left', width: 10*50+160, height: 12*50+160 }}>
                    <FloorPlanCanvas
                      ref={canvasRefs[i]}
                      floor={DEMO_3F.floors[i]}
                      buildingWidth={DEMO_3F.buildingWidth}
                      buildingHeight={DEMO_3F.buildingHeight}
                      orientation={DEMO_3F.orientation}
                      scale={1}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Phase: Done — tabbed floor viewer ── */}
      {phase === 'done' && (
        <div className="flex flex-col md:flex-row" style={{ background: '#fafafa' }}>
          {/* Left: sidebar */}
          <div className="md:w-56 shrink-0 p-4 flex flex-col gap-3"
            style={{ borderRight: '1px solid #e5e7eb', background: '#fff' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white"
                style={{ background: '#10B981' }}>✓</div>
              <p className="text-xs font-semibold" style={{ color: '#111827' }}>生成完成</p>
            </div>
            {[['建筑面积','99.0 m²/层'],['总建筑面积','297 m²'],['地块','12×14 m'],['朝向','朝南'],['楼层','3 层']].map(([l, v]) => (
              <div key={l}>
                <div className="text-xs" style={{ color: '#9ca3af' }}>{l}</div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: '#111827' }}>{v}</div>
              </div>
            ))}
            {/* Floor tabs */}
            <div className="mt-3 flex flex-col gap-1">
              <p className="text-xs font-semibold mb-1" style={{ color: '#374151' }}>楼层</p>
              {DEMO_3F.floors.map((f, i) => (
                <button key={i} onClick={() => setActiveFloor(i)}
                  className="text-xs font-medium px-3 py-2 rounded-lg text-left transition-all"
                  style={{
                    background: activeFloor === i ? 'rgba(217,119,6,0.1)' : 'transparent',
                    color: activeFloor === i ? '#B45309' : '#6b7280',
                    border: activeFloor === i ? '1px solid rgba(217,119,6,0.3)' : '1px solid transparent',
                  }}>
                  {f.label} — {f.rooms.length} 个房间
                </button>
              ))}
            </div>
            <div className="mt-auto pt-2 py-2 rounded-lg text-xs font-semibold text-center text-white"
              style={{ background: 'linear-gradient(135deg,#D97706,#B45309)' }}>
              AI 已生成 ✨
            </div>
          </div>
          {/* Right: canvas */}
          <div className="flex-1 flex flex-col" style={{ background: '#F3F4F6' }}>
            <div className="px-4 py-2.5 flex items-center justify-between"
              style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
              <span className="text-xs font-medium" style={{ color: '#6b7280' }}>
                {DEMO_3F.floors[activeFloor].label}平面图 · 带尺寸标注
              </span>
              <span className="text-xs" style={{ color: '#9ca3af' }}>
                {DEMO_3F.floors[activeFloor].rooms.length} 个房间 · 10×12 m
              </span>
            </div>
            <div className="flex items-center justify-center p-4"
              style={{ minHeight: CH + 32 }}>
              <div style={{ overflow: 'hidden', width: CW, height: CH }}>
                <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left', width: 10*50+160, height: 12*50+160 }}>
                  <FloorPlanCanvas
                    ref={canvasRefs[activeFloor]}
                    floor={DEMO_3F.floors[activeFloor]}
                    buildingWidth={DEMO_3F.buildingWidth}
                    buildingHeight={DEMO_3F.buildingHeight}
                    orientation={DEMO_3F.orientation}
                    scale={1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <div className="min-h-screen"
      style={{ background: '#FAF9F7', fontFamily: '"Inter",-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif', color: '#1a1a1a' }}>

      {/* ── Nav ── */}
      <header className="fixed top-0 inset-x-0 z-50 h-14"
        style={{ background: 'rgba(250,249,247,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs"
              style={{ background: 'linear-gradient(135deg,#D97706,#B45309)' }}>易</div>
            <span className="font-semibold text-sm tracking-tight" style={{ color: '#1a1a1a' }}>易建房</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {[['#demo','生成演示'],['#features','功能特点']].map(([href, label]) => (
              <a key={href} href={href} className="text-sm transition-colors"
                style={{ color: '#6b7280' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1a1a1a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}>
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isLoaded && isSignedIn ? (
              <Link href="/design"
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#D97706,#B45309)' }}>
                进入设计
              </Link>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    style={{ color: '#374151' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#111')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#374151')}>
                    登录
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#D97706,#B45309)' }}>
                    免费开始
                  </button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-36 pb-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-8"
            style={{ background: 'rgba(217,119,6,0.08)', color: '#B45309', border: '1px solid rgba(217,119,6,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#D97706' }} />
            AI 驱动 · 专业自建房户型设计
          </div>

          <h1 className="font-bold mb-5 leading-[1.1] tracking-tight"
            style={{ fontSize: 'clamp(2.6rem,5vw,4rem)', color: '#111827' }}>
            描述需求，即刻生成
            <br />
            <span style={{ background: 'linear-gradient(135deg,#D97706,#2563EB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              专业三层户型图纸
            </span>
          </h1>

          <p className="text-base leading-relaxed mb-10 max-w-xl mx-auto" style={{ color: '#6b7280' }}>
            输入地块尺寸与房间需求，AI 在 30 秒内生成带尺寸标注的三层平面图、
            三维预览与造价估算，支持 CAD 导出。
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap mb-16">
            {isLoaded && isSignedIn ? (
              <Link href="/design"
                className="px-7 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg,#D97706,#B45309)', boxShadow: '0 6px 24px rgba(217,119,6,0.3)' }}>
                进入设计工具 →
              </Link>
            ) : (
              <SignUpButton mode="modal">
                <button className="px-7 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg,#D97706,#B45309)', boxShadow: '0 6px 24px rgba(217,119,6,0.3)' }}>
                  免费开始设计 →
                </button>
              </SignUpButton>
            )}
            <a href="#demo"
              className="px-7 py-3 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'rgba(0,0,0,0.04)', color: '#374151', border: '1px solid rgba(0,0,0,0.08)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}>
              查看生成演示
            </a>
          </div>

          <div className="flex items-center justify-center gap-10 flex-wrap">
            {[['30s','AI 生成速度'],['3','楼层全覆盖'],['0.1m','标注精度'],['DXF','CAD 导出']].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-xl font-bold tracking-tight" style={{ color: '#111827' }}>{v}</div>
                <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive Generation Demo ── */}
      <section id="demo" className="py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2 tracking-tight" style={{ color: '#111827' }}>
              三层自建房 · 生成演示
            </h2>
            <p className="text-sm" style={{ color: '#6b7280' }}>
              点击"生成图纸"，体验 AI 实时生成三层户型全流程
            </p>
          </div>
          <GenerationDemo />
        </div>
      </section>


      {/* ── Features ── */}
      <section id="features" className="py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2 tracking-tight" style={{ color: '#111827' }}>
              专业工具，一站式解决
            </h2>
            <p className="text-sm" style={{ color: '#6b7280' }}>AI 驱动，覆盖自建房设计全流程</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title}
                className="rounded-xl p-5 flex flex-col gap-3 transition-all cursor-default"
                style={{ background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.06)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(217,119,6,0.3)'; (e.currentTarget as HTMLElement).style.background = 'rgba(217,119,6,0.03)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.background = '#FAFAFA'; }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                  style={{ background: f.bg }}>{f.icon}</div>
                <h3 className="font-semibold text-sm" style={{ color: '#111827' }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6" style={{ background: '#FAF9F7' }}>
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3 tracking-tight" style={{ color: '#111827' }}>
            立即生成您的专属户型
          </h2>
          <p className="text-sm mb-8" style={{ color: '#6b7280' }}>免费注册 · 无需下载 · 即时可用</p>
          {isLoaded && isSignedIn ? (
            <Link href="/design"
              className="inline-block px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg,#D97706,#B45309)', boxShadow: '0 6px 24px rgba(217,119,6,0.25)' }}>
              进入设计工具 →
            </Link>
          ) : (
            <SignUpButton mode="modal">
              <button className="px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg,#D97706,#B45309)', boxShadow: '0 6px 24px rgba(217,119,6,0.25)' }}>
                免费开始设计 →
              </button>
            </SignUpButton>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 text-center"
        style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: '#FAF9F7' }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg,#D97706,#B45309)' }}>易</div>
          <span className="font-semibold text-sm" style={{ color: '#374151' }}>易建房</span>
        </div>
        <p className="text-xs" style={{ color: '#9ca3af' }}>© 2026 易建房 — AI 驱动的自建房户型设计工具</p>
      </footer>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '🤖', title: 'AI 智能布局',   desc: '输入地块参数，AI 自动生成符合建筑规范的户型方案，动静分区合理，南北通透', bg: 'rgba(217,119,6,0.08)' },
  { icon: '📐', title: '专业尺寸标注',  desc: '每个房间面积清晰标注，门窗符号完整，支持导出 DXF 工程图格式',            bg: 'rgba(16,185,129,0.08)' },
  { icon: '🏗️', title: '三维立体预览', desc: '等轴测 3D 视图直观展示建筑空间，楼层堆叠效果一目了然',                  bg: 'rgba(245,158,11,0.08)' },
  { icon: '💰', title: '造价实时估算',  desc: '按省份毛坯单价 + 可调装修造价，自动估算总建设成本，辅助决策',             bg: 'rgba(239,68,68,0.08)' },
  { icon: '⭐', title: 'AI 方案评分',   desc: '从空间布局、采光通风、结构安全等维度智能评分，提供改进建议',              bg: 'rgba(37,99,235,0.08)' },
];
