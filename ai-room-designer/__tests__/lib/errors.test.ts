describe('ERR messages', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('returns Chinese errors in CN mode', async () => {
    process.env.REGION = 'cn'
    const { ERR } = await import('@/lib/errors')
    expect(ERR.rateLimited).toMatch(/频繁/)
    expect(ERR.uploadMissing).toMatch(/上传/)
    expect(ERR.invalidStyle).toMatch(/风格/)
    expect(ERR.orderFailed).toMatch(/失败/)
  })

  it('returns English errors in overseas mode', async () => {
    process.env.REGION = 'overseas'
    const { ERR } = await import('@/lib/errors')
    expect(ERR.rateLimited).toMatch(/Too many/)
    expect(ERR.uploadMissing).toMatch(/upload/)
    expect(ERR.invalidStyle).toMatch(/style/)
    expect(ERR.orderFailed).toMatch(/failed/)
  })
})
