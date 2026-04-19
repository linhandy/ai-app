import { isOverseas } from '@/lib/region'

export const metadata = {
  title: isOverseas ? 'Contact Us - RoomAI' : '联系我们 - AI装修设计',
  description: isOverseas ? 'Get in touch with the RoomAI team. We are here to help with any questions about our AI interior design service.' : '联系我们，关于AI装修设计服务的任何问题都可以咨询我们。',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8 text-center" style={{ fontFamily: 'Georgia, serif' }}>
          {isOverseas ? 'Contact Us' : '联系我们'}
        </h1>

        <div className="prose prose-invert max-w-none">
          {isOverseas ? (
            <>
              <p className="text-gray-300 mb-6">
                Have questions about RoomAI? We are here to help.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Support</h2>
              <p className="text-gray-300">
                For support inquiries, please email us at: <a href="mailto:support@roomai.com" className="text-amber-500 hover:text-amber-400">support@roomai.com</a>
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Business Inquiries</h2>
              <p className="text-gray-300">
                For business partnerships and other commercial questions: <a href="mailto:business@roomai.com" className="text-amber-500 hover:text-amber-400">business@roomai.com</a>
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Response Time</h2>
              <p className="text-gray-300">
                We typically respond to inquiries within 1-2 business days.
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-300 mb-6">
                如果您对我们的AI装修设计服务有任何问题，欢迎联系我们。
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">客服支持</h2>
              <p className="text-gray-300">
                如有使用问题，请发送邮件至：<a href="mailto:support@yourdomain.com" className="text-amber-500 hover:text-amber-400">support@yourdomain.com</a>
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">商务合作</h2>
              <p className="text-gray-300">
                商务合作洽谈：<a href="mailto:business@yourdomain.com" className="text-amber-500 hover:text-amber-400">business@yourdomain.com</a>
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">回复时间</h2>
              <p className="text-gray-300">
                我们通常会在1-2个工作日内回复您的咨询。
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}