'use client';

import { useState } from 'react';
import type { DesignInput, Orientation, HouseDesign } from '@/lib/types';
import FloorPlanViewer from './FloorPlanViewer';

const ORIENTATIONS: Orientation[] = ['南', '北', '东', '西', '东南', '东北', '西南', '西北'];
const FLOOR_LABELS = ['一层', '二层', '三层', '四层'];
const FLOOR_PLACEHOLDERS = [
  '例如：客厅、厨房、餐厅、卫生间',
  '例如：主卧带卫、两间次卧、书房',
  '例如：主卧套房、次卧、活动室、卫生间',
  '例如：露台、储藏室、晒台',
];

type Status = 'idle' | 'generating' | 'done' | 'error';

export default function DesignForm() {
  const [landWidth, setLandWidth] = useState(12);
  const [landHeight, setLandHeight] = useState(10);
  const [orientation, setOrientation] = useState<Orientation>('南');
  const [numFloors, setNumFloors] = useState(2);
  const [floorReqs, setFloorReqs] = useState<string[]>(['客厅、厨房、餐厅、卫生间', '主卧带卫、两间次卧、书房', '', '']);
  const [status, setStatus] = useState<Status>('idle');
  const [design, setDesign] = useState<HouseDesign | null>(null);
  const [error, setError] = useState('');

  const updateFloorReq = (index: number, value: string) => {
    const next = [...floorReqs];
    next[index] = value;
    setFloorReqs(next);
  };

  const handleSubmit = async () => {
    setStatus('generating');
    setError('');

    const input: DesignInput = {
      landWidth,
      landHeight,
      orientation,
      numFloors,
      floorRequirements: floorReqs.slice(0, numFloors),
    };

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '生成失败');
      }

      const data = await res.json();
      setDesign(data.design);
      setStatus('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '生成失败，请重试');
      setStatus('error');
    }
  };

  return (
    <div className="flex gap-10 h-full">
      {/* Left form panel */}
      <div className="w-[440px] shrink-0 bg-[var(--surface)] rounded-2xl p-8 flex flex-col gap-6 overflow-y-auto">
        <div>
          <h2 className="text-2xl font-bold">设计参数</h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">请填写您的自建房基本信息</p>
        </div>

        {/* Land dimensions */}
        <FieldGroup label="地块尺寸">
          <div className="flex items-center gap-3">
            <NumberInput value={landWidth} onChange={setLandWidth} min={5} max={30} />
            <span className="text-[var(--text-tertiary)]">×</span>
            <NumberInput value={landHeight} onChange={setLandHeight} min={5} max={30} />
            <span className="text-sm text-[var(--text-tertiary)]">米</span>
          </div>
        </FieldGroup>

        {/* Orientation */}
        <FieldGroup label="大门朝向">
          <div className="flex flex-wrap gap-2">
            {ORIENTATIONS.map((o) => (
              <button
                key={o}
                onClick={() => setOrientation(o)}
                className={`px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                  orientation === o
                    ? 'bg-[var(--primary)] text-white font-semibold'
                    : 'bg-white border border-[var(--border)] text-[var(--text-secondary)] hover:border-gray-400'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </FieldGroup>

        {/* Number of floors */}
        <FieldGroup label="楼层数">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setNumFloors(n)}
                className={`px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                  numFloors === n
                    ? 'bg-[var(--primary)] text-white font-semibold'
                    : 'bg-white border border-[var(--border)] text-[var(--text-secondary)] hover:border-gray-400'
                }`}
              >
                {n}层
              </button>
            ))}
          </div>
        </FieldGroup>

        {/* Per-floor requirements */}
        <FieldGroup label="每层布局需求">
          <div className="flex flex-col gap-3">
            {Array.from({ length: numFloors }, (_, i) => (
              <div key={i}>
                <label className="text-xs text-[var(--text-tertiary)] font-medium">{FLOOR_LABELS[i]}</label>
                <textarea
                  value={floorReqs[i]}
                  onChange={(e) => updateFloorReq(i, e.target.value)}
                  placeholder={FLOOR_PLACEHOLDERS[i]}
                  rows={2}
                  className="mt-1 w-full px-3 py-2 bg-white border border-[var(--border)] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                />
              </div>
            ))}
          </div>
        </FieldGroup>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={status === 'generating'}
          className="w-full h-12 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-60 text-white rounded-xl font-semibold text-base transition-colors cursor-pointer"
        >
          {status === 'generating' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              AI 正在设计中...
            </span>
          ) : '开始生成设计'}
        </button>

        {error && (
          <div className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</div>
        )}
      </div>

      {/* Right preview / result */}
      <div className="flex-1 min-w-0">
        {status === 'done' && design ? (
          <FloorPlanViewer design={design} />
        ) : (
          <div className="h-full bg-[var(--surface)] rounded-2xl flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 bg-[var(--border)] rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-[var(--text-tertiary)]">户型图预览区域</p>
            <p className="text-sm text-[var(--border)] text-center leading-relaxed">
              填写左侧参数后点击&quot;开始生成设计&quot;<br />
              AI 将为您生成专业的户型平面图
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (v >= min && v <= max) onChange(v);
      }}
      min={min}
      max={max}
      className="w-full h-11 px-3 bg-white border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
    />
  );
}
