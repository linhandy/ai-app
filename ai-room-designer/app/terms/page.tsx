import { isOverseas } from '@/lib/region'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'

export default function TermsPage() {
  if (!isOverseas) redirect('/')

  return (
    <main className="min-h-screen bg-black">
      <NavBar />
      <article className="max-w-2xl mx-auto px-6 py-16 prose prose-invert prose-sm">
        <h1>Terms of Service</h1>
        <p className="text-gray-400">Last updated: April 14, 2026</p>

        <h2>Service Description</h2>
        <p>RoomAI provides an AI-powered interior design generation service. You upload a photo of a room, select a style, and receive an AI-generated redesigned image.</p>

        <h2>Subscriptions and Billing</h2>
        <ul>
          <li>Free plan: 3 generations per month, watermarked results.</li>
          <li>Pro ($9.99/mo): 30 generations per month, no watermark.</li>
          <li>Unlimited ($19.99/mo): unlimited generations, no watermark.</li>
          <li>Subscriptions renew automatically. Cancel anytime via Account → Manage Billing.</li>
          <li>Refunds are handled on a case-by-case basis. Contact support within 7 days of charge.</li>
        </ul>

        <h2>Intellectual Property</h2>
        <p>You retain full ownership of all images you upload and all AI-generated images produced from your uploads. You may use generated images for personal or commercial purposes.</p>

        <h2>Prohibited Use</h2>
        <p>You may not upload images depicting illegal content, violence, or other content that violates applicable law. We reserve the right to suspend accounts that violate this policy.</p>

        <h2>Limitation of Liability</h2>
        <p>RoomAI is provided "as is." We are not liable for indirect, incidental, or consequential damages arising from use of the service.</p>

        <h2>Changes to Terms</h2>
        <p>We may update these terms with 30 days notice via email. Continued use constitutes acceptance.</p>

        <h2>Contact</h2>
        <p>Questions? Email <a href="mailto:support@roomai.com">support@roomai.com</a></p>
      </article>
    </main>
  )
}
