jest.mock('@/lib/storage', () => ({
  downloadFromStorage: jest.fn().mockResolvedValue(null),
  uploadStoragePath: jest.fn((id: string) => `uploads/${id}`),
  uploadToStorage: jest.fn().mockResolvedValue(undefined),
  resultStoragePath: jest.fn((id: string) => `results/${id}`),
}))

import { createOrder, updateOrder, getOrder, closeDb } from '@/lib/orders'

beforeEach(() => {
  process.env.ORDERS_DB = ':memory:'
  closeDb()
})

afterEach(() => {
  closeDb()
  delete process.env.ORDERS_DB
})

describe('gallery opt-in', () => {
  it('order isPublicGallery defaults to false', async () => {
    const order = await createOrder({
      style: 'nordic_minimal',
      uploadId: 'test-upload',
      quality: 'standard',
      mode: 'redesign',
      roomType: 'bedroom',
    })
    const fetched = await getOrder(order.id)
    expect(fetched?.isPublicGallery).toBe(false)
  })

  it('can set isPublicGallery to true', async () => {
    const order = await createOrder({
      style: 'nordic_minimal',
      uploadId: 'test-upload',
      quality: 'standard',
      mode: 'redesign',
      roomType: 'bedroom',
    })
    await updateOrder(order.id, { isPublicGallery: true })
    const fetched = await getOrder(order.id)
    expect(fetched?.isPublicGallery).toBe(true)
  })
})
