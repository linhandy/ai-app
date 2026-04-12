import { buildStylePrompt, STYLES } from '@/lib/zenmux'

test('STYLES has 6 entries', () => {
  expect(Object.keys(STYLES)).toHaveLength(6)
})

test('buildStylePrompt contains style name', () => {
  const prompt = buildStylePrompt('北欧简约')
  expect(prompt).toContain('北欧简约')
  expect(prompt.length).toBeGreaterThan(50)
})

test('buildStylePrompt throws on unknown style', () => {
  expect(() => buildStylePrompt('未知风格')).toThrow('Unknown style')
})
