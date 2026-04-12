import { formatAmount, buildOrderSubject } from '@/lib/alipay'

test('formatAmount converts number to 2dp string', () => {
  expect(formatAmount(1)).toBe('1.00')
  expect(formatAmount(9.9)).toBe('9.90')
  expect(formatAmount(0.01)).toBe('0.01')
})

test('buildOrderSubject returns readable string', () => {
  const subject = buildOrderSubject('北欧简约')
  expect(subject).toBe('AI装修效果图-北欧简约风格')
})
