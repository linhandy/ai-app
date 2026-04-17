import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPosts, getPostBySlug } from '@/lib/blog'
import { isOverseas } from '@/lib/region'
import NavBar from '@/components/NavBar'

export function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPostBySlug(params.slug)
  if (!post) return { title: isOverseas ? 'RoomAI' : '装AI' }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  return {
    title: `${post.title} | ${isOverseas ? 'RoomAI' : '装AI'}`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      url: `${base}/blog/${post.slug}`,
    },
  }
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: isOverseas ? 'RoomAI' : '装AI', url: base },
    publisher: { '@type': 'Organization', name: isOverseas ? 'RoomAI' : '装AI', url: base },
  }

  return (
    <main className="min-h-screen bg-black">
      <NavBar />
      <article className="max-w-3xl mx-auto px-6 pt-16 pb-24">
        <Link href="/blog" className="text-amber-400 text-sm hover:underline mb-6 block">
          ← {isOverseas ? 'Back to Blog' : '返回博客'}
        </Link>

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
          <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
          <span>·</span>
          <span>{post.readingTime} min read</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-8" style={{ fontFamily: 'Georgia, serif' }}>
          {post.title}
        </h1>

        <div className="prose prose-invert prose-amber max-w-none
          prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
          prose-li:text-gray-300
          prose-strong:text-white
          prose-table:text-sm prose-th:text-left prose-th:text-gray-400 prose-td:text-gray-300
          prose-th:border-gray-700 prose-td:border-gray-800
        ">
          <MDXRemote source={post.content} />
        </div>

        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 text-center">
          <p className="text-lg font-semibold mb-2">
            {isOverseas ? 'Ready to redesign your room?' : '准备重新设计你的房间？'}
          </p>
          <p className="text-gray-400 text-sm mb-4">
            {isOverseas ? '3 free HD designs — no credit card needed.' : '免费体验，30秒出图。'}
          </p>
          <Link
            href="/generate"
            className="inline-flex items-center bg-amber-500 text-black font-bold px-8 h-12 rounded hover:bg-amber-400 transition-colors"
          >
            {isOverseas ? 'Try it free →' : '立即体验 →'}
          </Link>
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </article>
    </main>
  )
}
