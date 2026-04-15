import NavBar from '@/components/NavBar'
import PricingCards from '@/components/PricingCards'
import { isOverseas } from '@/lib/region'
import { redirect } from 'next/navigation'

export default function PricingPage() {
  if (!isOverseas) redirect('/')
  return (
    <main className="min-h-screen bg-black">
      <NavBar />
      <section className="flex flex-col items-center px-6 pt-16 pb-24 gap-8">
        <h1 className="text-4xl md:text-5xl font-bold text-center">Simple, transparent pricing</h1>
        <p className="text-gray-400 text-center max-w-md">Start free. Upgrade when you need more generations.</p>
        <PricingCards />
      </section>
    </main>
  )
}
