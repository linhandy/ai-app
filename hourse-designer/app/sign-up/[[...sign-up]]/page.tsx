import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignUpPage() {
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
            开始您的<br />专业设计之旅
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            免费注册，即刻使用 AI 生成专业自建房平面图，告别手工画图。
          </p>
          <div className="flex flex-col gap-3">
            {[
              ['🤖','AI 智能户型生成'],
              ['📐','专业尺寸标注图纸'],
              ['🏗️','三维立体预览'],
              ['💰','造价实时估算'],
              ['⭐','AI 方案评分'],
            ].map(([icon, f]) => (
              <div key={f} className="flex items-center gap-2.5">
                <span className="text-base">{icon}</span>
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
          <SignUp />
        </div>
      </div>
    </div>
  );
}
