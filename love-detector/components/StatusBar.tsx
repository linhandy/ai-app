export default function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`w-full h-[44px] flex items-center px-6 ${dark ? 'bg-[#2D0A6E]' : 'bg-white'}`}>
      <span className={`text-[15px] font-semibold ${dark ? 'text-white' : 'text-black'}`}>9:41</span>
    </div>
  )
}
