// lib/errors.ts
import { isOverseas } from './region'

export const ERR = {
  rateLimited:     isOverseas ? 'Too many requests, please slow down.'          : '请求过于频繁，请稍后再试',
  uploadMissing:   isOverseas ? 'Please upload a photo first.'                  : '请先上传图片',
  invalidStyle:    isOverseas ? 'Invalid style selected.'                       : '无效的风格',
  invalidMode:     isOverseas ? 'Invalid design mode.'                          : '无效的设计模式',
  invalidRoomType: isOverseas ? 'Invalid room type.'                            : '无效的房间类型',
  orderFailed:     isOverseas ? 'Order creation failed, please try again.'      : '创建订单失败，请重试',
  invalidUnlock:   isOverseas ? 'Invalid unlock order.'                         : '无效的解锁订单',
  authRequired:    isOverseas ? 'Sign in required.'                             : '请先登录',
  upgradeRequired: isOverseas ? 'Generation limit reached. Please upgrade your plan.' : '生成次数已用完，请升级套餐',
  fileNotFound:    isOverseas ? 'Uploaded file not found, please re-upload.'    : '上传文件不存在，请重新上传',
} as const
