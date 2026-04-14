import { getOrderStats, getRecentOrders, getGenerationMetrics, getUserStats } from '@/lib/admin-queries'

interface Props {
  searchParams: { token?: string }
}

function formatGmv(amount: number) {
  return `¥${amount.toFixed(2)}`
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

function formatDuration(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`
}

const MODE_LABELS: Record<string, string> = {
  redesign: '风格改造',
  virtual_staging: '虚拟家装',
  add_furniture: '添加家具',
  paint_walls: '墙面换色',
  change_lighting: '灯光优化',
  sketch2render: '草图渲染',
  freestyle: '自由生成',
  outdoor_redesign: '户外设计',
  unlock: '去水印',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  generating: '生成中',
  done: '完成',
  failed: '失败',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400',
  paid: 'text-blue-400',
  generating: 'text-amber-400',
  done: 'text-green-400',
  failed: 'text-red-400',
}

export default async function AdminPage({ searchParams }: Props) {
  const adminToken = process.env.ADMIN_TOKEN
  if (!adminToken || searchParams.token !== adminToken) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg font-semibold">403 — 无权访问</p>
          <p className="text-gray-600 text-sm mt-2">请携带正确的 token 参数访问</p>
        </div>
      </main>
    )
  }

  const [stats, orders, metrics, users] = await Promise.all([
    getOrderStats(),
    getRecentOrders(100),
    getGenerationMetrics(),
    getUserStats(),
  ])

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <h1 className="text-2xl font-bold mb-8">装AI 运营后台</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="今日订单" value={String(stats.todayCount)} sub={`本月 ${stats.monthCount} 单`} />
        <StatCard label="今日 GMV" value={formatGmv(stats.todayGmv)} sub={`总计 ${formatGmv(stats.totalGmv)}`} />
        <StatCard label="注册用户" value={String(users.totalUsers)} sub={`今日新增 ${users.todayNewUsers}`} />
        <StatCard
          label="生成成功率（7天）"
          value={`${(metrics.successRate * 100).toFixed(1)}%`}
          sub={`平均 ${formatDuration(metrics.avgDurationMs)}`}
        />
      </div>

      {/* Recent orders */}
      <h2 className="text-lg font-semibold mb-4">最近订单（{orders.length} 条）</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500">
              <th className="text-left px-4 py-3 font-medium">时间</th>
              <th className="text-left px-4 py-3 font-medium">订单ID</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-right px-4 py-3 font-medium">金额</th>
              <th className="text-left px-4 py-3 font-medium">风格</th>
              <th className="text-left px-4 py-3 font-medium">模式</th>
              <th className="text-left px-4 py-3 font-medium">质量</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-gray-900 hover:bg-gray-900/40 transition-colors">
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatTime(o.createdAt)}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{o.id.slice(-8)}</td>
                <td className={`px-4 py-2.5 font-medium ${STATUS_COLORS[o.status] ?? 'text-gray-400'}`}>
                  {STATUS_LABELS[o.status] ?? o.status}
                </td>
                <td className="px-4 py-2.5 text-right text-amber-400 font-semibold">¥{o.amount}</td>
                <td className="px-4 py-2.5 text-gray-300">{o.style}</td>
                <td className="px-4 py-2.5 text-gray-400">{MODE_LABELS[o.mode] ?? o.mode}</td>
                <td className="px-4 py-2.5 text-gray-500">{o.quality}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-600">暂无订单</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <p className="text-gray-500 text-xs mb-2">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-600 text-xs mt-1">{sub}</p>
    </div>
  )
}
