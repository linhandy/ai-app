describe('region', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('defaults to cn when REGION is unset', async () => {
    delete process.env.REGION
    const { REGION, isOverseas, isCN } = await import('@/lib/region')
    expect(REGION).toBe('cn')
    expect(isOverseas).toBe(false)
    expect(isCN).toBe(true)
  })

  it('is overseas when REGION=overseas', async () => {
    process.env.REGION = 'overseas'
    const { REGION, isOverseas, isCN } = await import('@/lib/region')
    expect(REGION).toBe('overseas')
    expect(isOverseas).toBe(true)
    expect(isCN).toBe(false)
  })
})
