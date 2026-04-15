import { isOverseas } from '@/lib/region'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'

export default function PrivacyPage() {
  if (!isOverseas) redirect('/')

  return (
    <main className="min-h-screen bg-black">
      <NavBar />
      <article className="max-w-2xl mx-auto px-6 py-16 prose prose-invert prose-sm">
        <h1>Privacy Policy</h1>
        <p className="text-gray-400">Last updated: April 14, 2026</p>

        <h2>What We Collect</h2>
        <p>When you sign in with Google, we receive your name, email address, and profile picture. We store these to identify your account. We also store the room photos you upload and the AI-generated images we create for you.</p>

        <h2>How We Use Your Data</h2>
        <p>Your photos are used solely to generate interior design images. We do not sell, share, or use your data for advertising purposes.</p>

        <h2>Data Retention</h2>
        <ul>
          <li>Uploaded photos are deleted after 7 days.</li>
          <li>Generated images are retained indefinitely so you can access your history.</li>
          <li>Account data (name, email) is retained until you delete your account.</li>
        </ul>

        <h2>Your Rights (GDPR)</h2>
        <p>If you are in the EU/EEA, you have the right to access, correct, or delete your personal data. To exercise these rights or to delete your account, contact us at: <a href="mailto:privacy@roomai.com">privacy@roomai.com</a></p>

        <h2>Cookies</h2>
        <p>We use cookies for session management and, with your consent, Google Analytics to understand how users interact with the site. You can withdraw consent at any time via the cookie banner.</p>

        <h2>Third-Party Services</h2>
        <ul>
          <li><strong>Google OAuth</strong> — for sign-in</li>
          <li><strong>Stripe</strong> — for payment processing (we never store card data)</li>
          <li><strong>Google Analytics</strong> — with your consent only</li>
        </ul>

        <h2>Contact</h2>
        <p>Questions? Email <a href="mailto:privacy@roomai.com">privacy@roomai.com</a></p>
      </article>
    </main>
  )
}
