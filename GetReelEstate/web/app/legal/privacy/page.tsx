import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — GetReelEstate',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-gray-900 text-sm">G</div>
            <span className="font-semibold text-lg">GetReelEstate</span>
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">← Back</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: March 22, 2025</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-white">Photos you upload:</strong> Property images you provide to generate videos. Stored temporarily in our cloud storage.</li>
              <li><strong className="text-white">Property descriptions:</strong> Text descriptions you enter or that are auto-fetched from listing platforms.</li>
              <li><strong className="text-white">Account information:</strong> Name and email address collected via Clerk authentication when you sign in with Google or email.</li>
              <li><strong className="text-white">Usage data:</strong> Basic analytics such as page views. We do not use invasive tracking.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To process your video generation request</li>
              <li>To authenticate you and provide access to the Service</li>
              <li>To improve the Service and diagnose technical issues</li>
            </ul>
            <p className="mt-3">We do not sell, rent, or trade your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Data Storage and Retention</h2>
            <p>Uploaded photos and generated videos are stored in Supabase cloud storage. Generated videos are retained for 30 days after creation, after which they may be automatically deleted. Video metadata may be retained longer for analytics and support purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Third-Party Services</h2>
            <p>We use the following third-party services that may process your data:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-3">
              <li><strong className="text-white">Clerk</strong> — Authentication and user management. Subject to <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Clerk's Privacy Policy</a>.</li>
              <li><strong className="text-white">Supabase</strong> — Database and file storage hosted on AWS.</li>
              <li><strong className="text-white">RapidAPI / Zillow</strong> — Property data fetching when you paste a listing URL.</li>
              <li><strong className="text-white">Microsoft Edge TTS</strong> — Voice synthesis for video narration.</li>
              <li><strong className="text-white">Google Gemini (via Zenmux)</strong> — AI script generation from your property description.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Cookies and Local Storage</h2>
            <p>We use cookies and browser storage for authentication sessions (managed by Clerk) and to maintain your login state. We do not use advertising cookies or cross-site trackers.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Your Rights</h2>
            <p>Depending on your location, you may have rights to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-3">
              <li>Access the personal data we hold about you</li>
              <li>Request deletion of your data</li>
              <li>Request correction of inaccurate data</li>
              <li>Object to processing of your data</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:support@getreelestate.com" className="text-amber-400 hover:text-amber-300">support@getreelestate.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Security</h2>
            <p>We take reasonable measures to protect your data, including HTTPS encryption in transit and access controls on our storage systems. However, no internet transmission is completely secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Children's Privacy</h2>
            <p>The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will post the updated policy on this page with a new effective date. Continued use of the Service constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Contact</h2>
            <p>For privacy-related questions or requests, contact us at <a href="mailto:support@getreelestate.com" className="text-amber-400 hover:text-amber-300">support@getreelestate.com</a>.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex gap-6 text-sm text-gray-500">
          <Link href="/legal/tos" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-gray-300 transition-colors">Home</Link>
        </div>
      </main>
    </div>
  );
}
