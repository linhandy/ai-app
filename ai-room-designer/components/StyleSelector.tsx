'use client'

const STYLES = [
  { key: '北欧简约', desc: '原木 · 白墙 · 绿植' },
  { key: '现代轻奢', desc: '大理石 · 金属 · 灰调' },
  { key: '新中式',   desc: '禅意 · 木格 · 留白' },
  { key: '侘寂风',   desc: '不完美 · 自然 · 素色' },
  { key: '工业风',   desc: '裸砖 · 铁艺 · 水泥灰' },
  { key: '奶油风',   desc: '米白 · 柔软 · 治愈系' },
]

const STYLE_COLORS: Record<string, string> = {
  '北欧简约': '#E8F0E9',
  '现代轻奢': '#E8E4F0',
  '新中式':   '#F0E8E0',
  '侘寂风':   '#E8E4DC',
  '工业风':   '#E0E0E0',
  '奶油风':   '#FFF8ED',
}

interface Props {
  selected: string
  onChange: (style: string) => void
}

export default function StyleSelector({ selected, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {STYLES.map(({ key, desc }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded-lg overflow-hidden border-2 text-left transition-all
            ${selected === key ? 'border-amber-500' : 'border-gray-800 hover:border-gray-600'}`}
        >
          <div className="h-[62px] flex items-center justify-center text-2xl" style={{ backgroundColor: STYLE_COLORS[key] }}>
            🏡
          </div>
          <div className="bg-[#0D0D0D] px-3 py-2">
            <div className={`text-xs font-semibold ${selected === key ? 'text-amber-500' : 'text-white'}`}>
              {selected === key ? '✓  ' : ''}{key}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">{desc}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
