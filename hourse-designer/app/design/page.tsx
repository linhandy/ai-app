import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import DesignWorkspace from '@/components/DesignWorkspace';

export default function DesignPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-12 shrink-0 flex items-center justify-between px-5"
        style={{ background: 'var(--header-bg)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2" style={{ color: 'var(--header-text)' }}>
            <div className="w-6 h-6 rounded flex items-center justify-center text-sm" style={{ background: 'var(--accent)' }}>🏠</div>
            <span className="font-semibold text-sm">易建房</span>
          </Link>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            专业版
          </span>
        </div>

        <div />

        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs transition-colors hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            返回首页
          </Link>
          <UserButton />
        </div>
      </header>

      {/* Main workspace */}
      <main className="flex-1 overflow-hidden">
        <DesignWorkspace />
      </main>
    </div>
  );
}
