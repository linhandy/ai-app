import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — GetReelEstate',
};

export default function TermsOfService() {
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
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: March 22, 2025</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using GetReelEstate ("Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p>GetReelEstate is an AI-powered video generation tool that converts real estate listing photos and descriptions into short-form social media videos (MP4 format). The Service uses third-party AI models, text-to-speech services, and video processing tools to produce the output.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. User Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You must own or have rights to all photos and content you upload.</li>
              <li>You are solely responsible for ensuring the accuracy of property descriptions.</li>
              <li>You may not use the Service to create misleading, fraudulent, or defamatory content.</li>
              <li>You may not upload content that violates any applicable law or third-party rights.</li>
              <li>You are responsible for complying with any applicable real estate advertising regulations in your jurisdiction.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Free Service</h2>
            <p>GetReelEstate is currently free to use. We reserve the right to introduce paid plans in the future, with reasonable advance notice to users. Any future pricing changes will be communicated before they take effect.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Intellectual Property</h2>
            <p>You retain ownership of all photos and descriptions you provide. You grant GetReelEstate a limited, non-exclusive license to process your content solely to generate the requested video. The AI-generated scripts are provided to you under a commercial license for your personal and business use. GetReelEstate retains ownership of the Service's underlying technology, models, and processes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" without warranties of any kind. We do not guarantee that generated videos will meet any specific quality standard, be suitable for any particular purpose, or comply with any platform's content policies. We are not responsible for how third-party platforms (Instagram, TikTok, YouTube, etc.) handle your uploaded content.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, GetReelEstate shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability to you for any claim arising from the Service shall not exceed $100.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Third-Party Services</h2>
            <p>The Service integrates with third-party providers including Zillow/RapidAPI (property data), Clerk (authentication), Supabase (data storage), and Microsoft Edge TTS (voice synthesis). Your use of these integrated services is also subject to their respective terms and policies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Modifications to Terms</h2>
            <p>We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Contact</h2>
            <p>For questions about these Terms, please contact us at <a href="mailto:support@getreelestate.com" className="text-amber-400 hover:text-amber-300">support@getreelestate.com</a>.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex gap-6 text-sm text-gray-500">
          <Link href="/legal/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
          <Link href="/" className="hover:text-gray-300 transition-colors">Home</Link>
        </div>
      </main>
    </div>
  );
}
