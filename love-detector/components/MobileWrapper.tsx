export default function MobileWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-[390px] bg-white min-h-screen relative overflow-hidden">
        {children}
      </div>
    </div>
  )
}
