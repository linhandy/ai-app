import { buildStylePrompt } from '@/lib/zenmux'
import { STYLE_CATEGORIES, ALL_STYLE_KEYS } from '@/lib/design-config'

test('STYLE_CATEGORIES has 8 categories', () => {
  expect(STYLE_CATEGORIES).toHaveLength(8)
})

test('ALL_STYLE_KEYS has 40 entries', () => {
  expect(ALL_STYLE_KEYS.length).toBeGreaterThanOrEqual(40)
})

test('buildStylePrompt returns Chinese for premium quality', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'premium', 'redesign', 'living_room')
  expect(prompt).toContain('北欧简约')
  expect(prompt.length).toBeGreaterThan(50)
})

test('buildStylePrompt returns English for standard quality', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'redesign', 'living_room')
  expect(prompt).toContain('Nordic')
  expect(prompt.length).toBeGreaterThan(50)
})

test('buildStylePrompt appends room type hint (English)', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'redesign', 'bedroom')
  expect(prompt).toContain('bedroom')
})

test('buildStylePrompt appends room type hint (Chinese)', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'premium', 'redesign', 'bedroom')
  expect(prompt).toContain('卧室')
})

test('buildStylePrompt appends customPrompt when provided', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'redesign', 'living_room', '加一张书桌')
  expect(prompt).toContain('加一张书桌')
})

test('buildStylePrompt does not include custom text when omitted', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'redesign', 'living_room')
  expect(prompt).not.toContain('加一张书桌')
})

test('buildStylePrompt throws on unknown style', () => {
  expect(() => buildStylePrompt('unknown_style', 'standard', 'redesign', 'living_room')).toThrow('Unknown style')
})

test('paint_walls mode ignores style, appends room type (English)', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'paint_walls', 'kitchen')
  expect(prompt).toContain('kitchen')
})

test('change_lighting mode ignores style, appends room type (Chinese)', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'premium', 'change_lighting', 'bedroom')
  expect(prompt).toContain('卧室')
})
