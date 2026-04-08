import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex" style={{ background: '#F9FAFB' }}>

      {/* Left branding panel */}
      <div className="hidden lg:flex w-96 shrink-0 flex-col justify-between p-10"
        style={{ background: 'linear-gradient(160deg,#1E3A8A 0%,#2563EB 55%,#7C3AED 100%)' }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm text-white"
            style={{ background: 'rgba(255,255,255,0.2)' }}>易</div>
          <span className="font-bold text-base text-white">易建房</span>
        </Link>

        <div className="flex flex-col gap-6">
          <h2 className="text-3xl font-bold text-white leading-snug" style={{ letterSpacing: '-0.02em' }}>
            专业自建房<br />户型设计工具
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            输入地块参数，AI 生成带尺寸标注的平面图与三维预览，支持草图识别与 CAD 导出。
          </p>
          <div className="flex flex-col gap-3">
            {['AI 智能布局生成','专业 CAD 图纸导出','三维立体预览','AI 方案评分'].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>✓</span>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>© 2026 易建房</p>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>易</div>
              <span className="font-bold text-sm" style={{ color: '#111827' }}>易建房</span>
            </Link>
          </div>
          <SignIn />
        </div>
      </div>
    </div>
  );
}
