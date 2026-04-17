import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/blog'
import { isOverseas } from '@/lib/region'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = isOverseas
  ? {
      title: 'Blog — Interior Design Tips & AI Tools | RoomAI',
      description: 'Design guides, style inspiration, and tips for using AI to redesign your space.',
    }
  : {
      title: '博客 — 装修灵感与AI工具 | 装AI',
      description: '装修设计指南、风格灵感与AI工具使用技巧。',
    }

export default function BlogListingPage() {
  const posts = getAllPosts()

  return (
    <main className="min-h-screen bg-black">
      <NavBar />
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-24">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {isOverseas ? 'Blog' : '博客'}
        </h1>
        <p className="text-gray-400 mb-10">
          {isOverseas
            ? 'Design guides, style inspiration, and AI tips.'
            : '装修指南、风格灵感与AI技巧。'}
        </p>

        {posts.length === 0 && (
          <p className="text-gray-500">{isOverseas ? 'No posts yet.' : '暂无文章。'}</p>
        )}

        <div className="flex flex-col gap-6">
          {posts.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block border border-gray-800 rounded-xl p-6 hover:border-amber-500/40 transition-colors"
            >
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                <span>·</span>
                <span>{post.readingTime} min read</span>
              </div>
              <h2 className="text-lg font-semibold group-hover:text-amber-400 transition-colors mb-1">
                {post.title}
              </h2>
              <p className="text-gray-400 text-sm">{post.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
