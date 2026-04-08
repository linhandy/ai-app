'use client';

import { useEffect, useRef, useState } from 'react';
import type { HouseDesign } from '@/lib/types';

interface ScoreItem { score: number; comment: string; }
interface Analysis {
  scores: {
    layout: ScoreItem;
    lighting: ScoreItem;
    aesthetics: ScoreItem;
    structure: ScoreItem;
    flexibility: ScoreItem;
  };
  overall: number;
  pros: string[];
  cons: string[];
  suggestions: string[];
}

const DIMENSIONS: { key: keyof Analysis['scores']; label: string }[] = [
  { key: 'layout',      label: '布局动线' },
  { key: 'lighting',    label: '采光通风' },
  { key: 'structure',   label: '结构安全' },
  { key: 'aesthetics',  label: '外观美学' },
  { key: 'flexibility', label: '未来适应' },
];

function scoreColor(s: number) {
  return s >= 85 ? '#10B981' : s >= 70 ? '#F59E0B' : '#EF4444';
}

interface Props {
  design: HouseDesign;
  onDesignUpdate?: (design: HouseDesign) => void;
}

export default function DesignAnalysis({ design, onDesignUpdate }: Props) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState('');
  const lastKeyRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);

  // Stable key — only re-score when the design structure actually changes
  const designKey = `${design.buildingWidth}-${design.buildingHeight}-${design.orientation}-${(design.floors ?? []).length}`;

  // ─── Score once on new design (no auto-optimize) ──────────────────────────
  useEffect(() => {
    if (designKey === lastKeyRef.current) return;
    lastKeyRef.current = designKey;
    setAnalysis(null);
    setError('');
    setLoading(true);

    // Abort previous request if still in flight
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ design }),
      signal: ctrl.signal,
    })
      .then(async res => {
        const text = await res.text();
        let data: any;
        try { data = JSON.parse(text); } catch { throw new Error(`评分接口异常 (${res.status})`); }
        if (!res.ok || data.error) throw new Error(data.error || `请求失败 (${res.status})`);
        if (!ctrl.signal.aborted) setAnalysis(data);
      })
      .catch(e => {
        if (e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : '评分失败');
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [designKey, design]);

  // ─── Manual optimize ──────────────────────────────────────────────────────
  const handleOptimize = async () => {
    if (!analysis) return;
    const weakDims = DIMENSIONS
      .filter(dim => analysis.scores[dim.key].score < 80)
      .map(dim => ({ key: dim.key, label: dim.label, score: analysis.scores[dim.key].score, comment: analysis.scores[dim.key].comment }));
    if (!weakDims.length) return;

    setOptimizing(true);
    setError('');
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design, weakDimensions: weakDims }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`优化接口异常`); }
      if (!res.ok) throw new Error(data.error || '优化失败');

      // Poll for result
      const jobId = data.jobId;
      const poll = setInterval(async () => {
        try {
          const jr = await fetch(`/api/jobs/${jobId}`);
          const jt = await jr.text();
          let jd: any;
          try { jd = JSON.parse(jt); } catch { return; }
          const job = jd.job;
          if (!job) return;
          if (job.status === 'done') {
            clearInterval(poll);
            setOptimizing(false);
            onDesignUpdate?.(job.design_data as HouseDesign);
          } else if (job.status === 'failed') {
            clearInterval(poll);
            setOptimizing(false);
            setError(job.error_msg || '优化失败');
          }
        } catch { /* keep polling */ }
      }, 1500);
    } catch (e) {
      setOptimizing(false);
      setError(e instanceof Error ? e.message : '优化失败');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin shrink-0"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      <span className="text-xs" style={{ color: 'var(--text-3)' }}>评分中…</span>
    </div>
  );

  if (error && !analysis) return (
    <div className="text-xs px-2 py-1 rounded" style={{ background: '#FEF2F2', color: '#DC2626' }}>⚠ {error}</div>
  );

  if (!analysis) return null;

  const hasWeakDims = DIMENSIONS.some(d => analysis.scores[d.key].score < 80);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Overall + per-dimension compact */}
      <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
        style={{ background: 'var(--surface-2)', border: `1px solid ${scoreColor(analysis.overall)}33` }}>
        <div className="text-lg font-bold" style={{ color: scoreColor(analysis.overall) }}>{analysis.overall}</div>
        <div className="flex flex-col gap-0.5 items-end">
          {DIMENSIONS.map(d => (
            <div key={d.key} className="flex items-center gap-1">
              <span style={{ color: 'var(--text-3)', fontSize: 9 }}>{d.label}</span>
              <span className="font-semibold w-5 text-right" style={{ color: scoreColor(analysis.scores[d.key].score), fontSize: 9 }}>
                {analysis.scores[d.key].score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pros/Cons one-liner */}
      {analysis.pros?.length > 0 && (
        <div className="text-xs flex gap-1" style={{ color: 'var(--text-3)', fontSize: 10 }}>
          <span style={{ color: '#10B981' }}>✓</span>{analysis.pros[0]}
        </div>
      )}
      {analysis.cons?.length > 0 && (
        <div className="text-xs flex gap-1" style={{ color: 'var(--text-3)', fontSize: 10 }}>
          <span style={{ color: '#EF4444' }}>!</span>{analysis.cons[0]}
        </div>
      )}

      {error && <div className="text-xs" style={{ color: '#DC2626', fontSize: 10 }}>⚠ {error}</div>}

      {/* Manual optimize button */}
      {hasWeakDims && onDesignUpdate && (
        <button onClick={handleOptimize} disabled={optimizing}
          className="w-full py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
          style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
          {optimizing ? '优化中…' : '🔄 优化低分项'}
        </button>
      )}
    </div>
  );
}
