'use client'
import Image from 'next/image'

const STYLES = [
  { key: '北欧简约', desc: '原木 · 白墙 · 绿植' },
  { key: '现代轻奢', desc: '大理石 · 金属 · 灰调' },
  { key: '新中式',   desc: '禅意 · 木格 · 留白' },
  { key: '侘寂风',   desc: '不完美 · 自然 · 素色' },
  { key: '工业风',   desc: '裸砖 · 铁艺 · 水泥灰' },
  { key: '奶油风',   desc: '米白 · 柔软 · 治愈系' },
]

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
          <div className="h-[62px] relative">
            <Image src={`/styles/${key}.jpg`} alt={key} fill className="object-cover" />
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
