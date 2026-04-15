'use client'
import { ROOM_TYPES } from '@/lib/design-config'
import { isOverseas } from '@/lib/region'

interface Props {
  selected: string
  onChange: (roomType: string) => void
}

export default function RoomTypeSelector({ selected, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
      {ROOM_TYPES.map(({ key, label, labelEn, icon }) => {
        const isSelected = selected === key
        return (
          <button
            type="button"
            key={key}
            onClick={() => onChange(key)}
            className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg border transition-all ${
              isSelected
                ? 'border-amber-500 bg-amber-500/10 text-white'
                : 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
            }`}
          >
            <span className="text-lg leading-none">{icon}</span>
            <span className="text-[10px] font-medium whitespace-nowrap leading-tight">{isOverseas ? labelEn : label}</span>
          </button>
        )
      })}
    </div>
  )
}
