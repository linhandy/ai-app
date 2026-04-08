'use client';

import { useState, useRef } from 'react';
import type { HouseDesign } from '@/lib/types';
import FloorPlanSVG from './FloorPlanSVG';
import { downloadPNG } from '@/lib/svg-export';

interface Props {
  design: HouseDesign;
  onClose: () => void;
}

export default function EmailModal({ design, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const svgRefs = useRef<(SVGSVGElement | null)[]>([]);

  const handleSend = async () => {
    if (!email || !email.includes('@')) { setError('请输入有效的邮箱地址'); return; }
    setSending(true); setError('');

    try {
      // Generate PNG for current (first) floor
      const svgEl = svgRefs.current[0];
      if (!svgEl) throw new Error('图片生成失败');

      // Convert SVG to PNG base64
      const { svgToPngBase64 } = await import('@/lib/svg-export');
      const pngBase64 = await svgToPngBase64(svgEl, 2);

      const floor = design.floors[0];
      const designSummary = `
        <p><strong>地块尺寸：</strong>${design.landWidth}m × ${design.landHeight}m</p>
        <p><strong>大门朝向：</strong>${design.orientation}</p>
        <p><strong>楼层数：</strong>${design.floors.length}层</p>
        <p><strong>建筑面积：</strong>约 ${(design.buildingWidth * design.buildingHeight * design.floors.length).toFixed(0)} m²</p>
      `;

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          floorLabel: floor.label,
          svgDataUrl: `data:image/png;base64,${pngBase64}`,
          designSummary,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '发送失败');
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '发送失败，请重试');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      {/* Modal */}
      <div className="relative rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" style={{ background: 'var(--surface)' }}>
        {/* Hidden SVG refs for PNG generation */}
        <div className="hidden">
          {design.floors.map((floor, i) => (
            <FloorPlanSVG
              key={floor.floor}
              ref={el => { svgRefs.current[i] = el; }}
              floor={floor}
              buildingWidth={design.buildingWidth}
              buildingHeight={design.buildingHeight}
              orientation={design.orientation}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>发送设计图到邮箱</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-sm hover:opacity-80"
            style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
            ×
          </button>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>发送成功！</div>
            <div className="text-sm" style={{ color: 'var(--text-2)' }}>
              设计图已发送至 <strong>{email}</strong>，请查收邮件。
            </div>
            <button onClick={onClose} className="mt-5 px-6 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--accent)', color: 'white' }}>
              关闭
            </button>
          </div>
        ) : (
          <>
            <div className="mb-2 text-xs" style={{ color: 'var(--text-3)' }}>
              将为您发送一层平面图（PNG 格式）至指定邮箱
            </div>

            {/* Design summary */}
            <div className="rounded-lg p-3 mb-4 text-xs leading-loose" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
              <div>📐 {design.landWidth}m × {design.landHeight}m · {design.orientation}向 · {design.floors.length}层</div>
              <div>🏗️ 建筑面积约 {(design.buildingWidth * design.buildingHeight * design.floors.length).toFixed(0)} m²</div>
            </div>

            {/* Email input */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>收件人邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
            </div>

            {error && (
              <div className="mb-3 text-xs p-2.5 rounded-lg" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                取消
              </button>
              <button onClick={handleSend} disabled={sending || !email}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60 transition-colors"
                style={{ background: 'var(--accent)', color: 'white' }}>
                {sending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    发送中...
                  </span>
                ) : '发送'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
