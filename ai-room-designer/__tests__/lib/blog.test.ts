import { getAllPosts, getPostBySlug } from '@/lib/blog'

describe('blog utilities', () => {
  it('getAllPosts returns array sorted by date descending', () => {
    const posts = getAllPosts()
    expect(Array.isArray(posts)).toBe(true)
    for (const post of posts) {
      expect(post.slug).toBeDefined()
      expect(post.title).toBeDefined()
      expect(post.date).toBeDefined()
      expect(post.description).toBeDefined()
    }
    for (let i = 1; i < posts.length; i++) {
      expect(new Date(posts[i - 1].date).getTime()).toBeGreaterThanOrEqual(
        new Date(posts[i].date).getTime()
      )
    }
  })

  it('getPostBySlug returns null for non-existent slug', () => {
    const post = getPostBySlug('this-slug-does-not-exist')
    expect(post).toBeNull()
  })
})
