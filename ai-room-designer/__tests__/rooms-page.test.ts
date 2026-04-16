import { ROOM_TYPES, STYLE_CATEGORIES } from '@/lib/design-config'

describe('room landing pages', () => {
  it('generates static params for all room types', () => {
    const params = ROOM_TYPES.map(r => ({ slug: r.key }))
    expect(params).toHaveLength(ROOM_TYPES.length)
    expect(params.length).toBeGreaterThanOrEqual(24)
  })

  it('all room types have English labels', () => {
    for (const room of ROOM_TYPES) {
      expect(typeof room.labelEn).toBe('string')
      expect(room.labelEn.length).toBeGreaterThan(0)
    }
  })
})

describe('sitemap coverage', () => {
  it('has 40 styles and room types for sitemap', () => {
    const styleCount = STYLE_CATEGORIES.flatMap(c => c.styles).length
    expect(styleCount).toBe(40)
    expect(ROOM_TYPES.length).toBeGreaterThanOrEqual(24)
    // Total sitemap entries: 2 static + 40 styles + N rooms
    const total = 2 + styleCount + ROOM_TYPES.length
    expect(total).toBeGreaterThanOrEqual(66)
  })
})
