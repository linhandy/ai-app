import { buildStylePrompt } from '@/lib/zenmux'
import { STYLE_CATEGORIES, ALL_STYLE_KEYS, DESIGN_MODES, ALL_ROOM_TYPE_KEYS } from '@/lib/design-config'

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

test('DESIGN_MODES has 9 entries', () => {
  expect(DESIGN_MODES).toHaveLength(9)
})

test('ALL_ROOM_TYPE_KEYS has 25 entries', () => {
  expect(ALL_ROOM_TYPE_KEYS).toHaveLength(25)
})

test('freestyle mode has needsUpload false', () => {
  const mode = DESIGN_MODES.find((m) => m.key === 'freestyle')
  expect(mode).toBeDefined()
  expect(mode?.needsUpload).toBe(false)
})

test('outdoor_redesign mode has needsStyle false and needsUpload true', () => {
  const mode = DESIGN_MODES.find((m) => m.key === 'outdoor_redesign')
  expect(mode).toBeDefined()
  expect(mode?.needsStyle).toBe(false)
  expect(mode?.needsUpload).toBe(true)
})

test('sketch2render mode has needsStyle true and needsUpload true', () => {
  const mode = DESIGN_MODES.find((m) => m.key === 'sketch2render')
  expect(mode).toBeDefined()
  expect(mode?.needsStyle).toBe(true)
  expect(mode?.needsUpload).toBe(true)
})

test('buildStylePrompt sketch2render returns English sketch prompt for standard', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'sketch2render', 'living_room')
  expect(prompt).toContain('sketch')
  expect(prompt.length).toBeGreaterThan(50)
})

test('buildStylePrompt sketch2render returns Chinese sketch prompt for premium', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'premium', 'sketch2render', 'bedroom')
  expect(prompt).toContain('草图')
})

test('buildStylePrompt freestyle returns English generation prompt for standard', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'freestyle', 'living_room')
  expect(prompt).toContain('Generate a brand new')
})

test('buildStylePrompt freestyle returns Chinese generation prompt for premium', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'premium', 'freestyle', 'bedroom')
  expect(prompt).toContain('生成一张全新')
})

test('buildStylePrompt outdoor_redesign returns English landscaping prompt for standard', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'standard', 'outdoor_redesign', 'garden')
  expect(prompt).toContain('landscaping')
})

test('buildStylePrompt outdoor_redesign returns Chinese landscaping prompt for premium', () => {
  const prompt = buildStylePrompt('nordic_minimal', 'premium', 'outdoor_redesign', 'patio')
  expect(prompt).toContain('户外')
})

test('DESIGN_MODES has 9 entries after adding style-match', () => {
  expect(DESIGN_MODES).toHaveLength(9)
})

test('style-match mode has needsStyle false and needsUpload true', () => {
  const mode = DESIGN_MODES.find((m) => m.key === 'style-match')
  expect(mode).toBeDefined()
  expect(mode?.needsStyle).toBe(false)
  expect(mode?.needsUpload).toBe(true)
})

test('buildStylePrompt style-match returns English prompt for standard quality', () => {
  const prompt = buildStylePrompt('', 'standard', 'style-match', 'living_room')
  expect(prompt).toContain('reference photo')
  expect(prompt).toContain('living room')
  expect(prompt.length).toBeGreaterThan(50)
})

test('buildStylePrompt style-match returns Chinese prompt for premium quality', () => {
  const prompt = buildStylePrompt('', 'premium', 'style-match', 'bedroom')
  expect(prompt).toContain('参考图')
  expect(prompt).toContain('卧室')
  expect(prompt.length).toBeGreaterThan(50)
})
