'use client';

import { useState, useRef, useCallback } from 'react';

interface SketchAnalysis {
  buildingWidth: number;
  buildingHeight: number;
  orientation: string;
  numFloors: number;
  floorRequirements: string[];
  summary: string; // human-readable analysis text
}

interface Props {
  onGenerate: (imageBase64: string) => void;
  onGenerateFromAnalysis?: (analysis: SketchAnalysis) => void;
  disabled: boolean;
}

export default function SketchUpload({ onGenerate, onGenerateFromAnalysis, disabled }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SketchAnalysis | null>(null);
  const [editableText, setEditableText] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const original = e.target?.result as string;
      // Compress: resize to max 1200px, quality 0.85 to stay under Vercel 4.5MB body limit
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setPreview(compressed);
        setAnalysis(null);
        setEditableText('');
        setError('');
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Step 1: Analyze the image — get structured description
  const handleAnalyze = async () => {
    if (!preview) return;
    setAnalyzing(true);
    setError('');
    setAnalysis(null);

    try {
      const res = await fetch('/api/sketch-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: preview }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`识别接口异常 (${res.status})`); }
      if (!res.ok || data.error) throw new Error(data.error || '识别失败');

      setAnalysis(data);
      setEditableText(data.summary || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : '图片识别失败');
    } finally {
      setAnalyzing(false);
    }
  };

  // Step 2: Generate CAD from the (possibly edited) analysis
  const handleGenerate = () => {
    if (analysis && onGenerateFromAnalysis) {
      // User may have edited the text — pass the analysis along with edited summary
      onGenerateFromAnalysis({ ...analysis, summary: editableText });
    } else if (preview) {
      // Fallback: direct generation from image
      onGenerate(preview);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setAnalysis(null);
    setEditableText('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Upload area */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>上传草图</div>
        <div
          onClick={() => !preview && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className="relative rounded-xl overflow-hidden transition-all"
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : preview ? 'var(--border)' : 'var(--border-strong)'}`,
            background: dragOver ? 'var(--accent-light)' : 'var(--surface)',
            cursor: preview ? 'default' : 'pointer',
            minHeight: preview ? 120 : 160,
          }}
        >
          {preview ? (
            <>
              <img src={preview} alt="草图预览" className="w-full h-full object-contain" style={{ maxHeight: 160 }} />
              <button onClick={(e) => { e.stopPropagation(); handleReset(); }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>
                ×
              </button>
            </>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center gap-3">
              <div className="text-3xl opacity-40">📷</div>
              <div className="text-center">
                <div className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>点击或拖拽上传草图</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>支持 JPG、PNG、WebP</div>
              </div>
            </div>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Step 1 button: Analyze */}
      {preview && !analysis && !analyzing && (
        <button onClick={handleAnalyze}
          className="w-full py-2 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
          🔍 AI 识别图纸
        </button>
      )}

      {analyzing && (
        <div className="flex items-center justify-center gap-2 py-3">
          <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>AI 正在识别图纸内容…</span>
        </div>
      )}

      {error && (
        <div className="text-xs px-2.5 py-1.5 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626' }}>
          ⚠ {error}
        </div>
      )}

      {/* Step 2: Show editable analysis */}
      {analysis && (
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>识别结果（可编辑修正）</div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg px-2.5 py-1.5" style={{ background: 'var(--surface-2)' }}>
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>面宽×进深</div>
              <div className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{analysis.buildingWidth}m × {analysis.buildingHeight}m</div>
            </div>
            <div className="rounded-lg px-2.5 py-1.5" style={{ background: 'var(--surface-2)' }}>
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>朝向 / 层数</div>
              <div className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>朝{analysis.orientation} / {analysis.numFloors}层</div>
            </div>
          </div>

          {/* Editable analysis text */}
          <textarea
            value={editableText}
            onChange={e => setEditableText(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 rounded-lg text-xs resize-none leading-relaxed"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            💡 如识别有误，可直接修改上方文案后再生成
          </p>
        </div>
      )}

      {/* Step 3 button: Generate from analysis */}
      {analysis && (
        <button onClick={handleGenerate} disabled={disabled}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'white' }}>
          {disabled ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              生成中…
            </span>
          ) : '确认并生成 CAD 图'}
        </button>
      )}
    </div>
  );
}
