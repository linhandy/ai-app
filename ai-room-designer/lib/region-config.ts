// lib/region-config.ts
import { isOverseas } from './region'

export const regionConfig = {
  // --- Currency ---
  currency:       isOverseas ? 'USD'  : 'CNY',
  currencySymbol: isOverseas ? '$'    : '¥',

  // --- Auth / Payment / Monetization ---
  authMethod:    isOverseas ? 'google'       : 'wechat_sms'       as 'google' | 'wechat_sms',
  paymentMethod: isOverseas ? 'stripe'       : 'alipay'           as 'stripe' | 'alipay',
  monetization:  isOverseas ? 'subscription' : 'pay_per_unlock'   as 'subscription' | 'pay_per_unlock',

  // --- Share targets (order matters — displayed left to right) ---
  shareTargets: isOverseas
    ? ['twitter', 'facebook', 'copy_link'] as const
    : ['wechat', 'douyin', 'xiaohongshu', 'copy_link'] as const,

  // --- UI Strings ---
  strings: {
    // Hero
    heroTitle:       isOverseas ? 'Redesign Any Room with AI'                          : '拍一张照片，AI秒变理想装修',
    heroSubtitle:    isOverseas ? 'Upload a photo. Get a professional interior design in 30 seconds.' : '上传任意角度的房间照片，30秒内看到专业室内设计师级别的装修效果图',
    heroCta:         isOverseas ? 'Generate for Free'                                  : '免费生成效果图',
    heroSecondaryCta:isOverseas ? 'View Examples'                                      : '查看示例效果',
    heroBadge:       isOverseas ? '✦ Free to generate · Pay only if you love it'      : '✦ 免费生成 · 满意再付费',
    // Nav
    navStyles:       isOverseas ? 'Styles'                                             : '风格展示',
    navPricing:      isOverseas ? 'Pricing'                                            : '价格',
    navFaq:          isOverseas ? 'FAQ'                                                : '常见问题',
    navHistory:      isOverseas ? 'History'                                            : '历史记录',
    navAccount:      isOverseas ? 'Account'                                            : '账户',
    navSignIn:       isOverseas ? 'Sign in'                                            : '登录/注册',
    navSignOut:      isOverseas ? 'Sign out'                                           : '退出',
    navGenerate:     isOverseas ? 'Get Started'                                        : '开始体验',
    // Upload
    uploadPrompt:    isOverseas ? 'Drop your room photo here'                          : '拖拽上传房间照片',
    uploadDragHint:  isOverseas ? 'or click to browse'                                 : '或点击选择文件',
    // Generation
    generating:      isOverseas ? 'AI is redesigning your room...'                    : 'AI生成中，请稍候...',
    generatingSubtitle: isOverseas ? 'About 30 seconds'                               : '约30秒',
    // Result
    downloadBtn:     isOverseas ? 'Download'                                           : '下载',
    shareBtn:        isOverseas ? 'Share'                                              : '分享',
    regenerateBtn:   isOverseas ? 'Regenerate'                                         : '重新生成',
    resultWatermarkNotice: isOverseas ? 'Upgrade to Pro to remove watermark'          : '付费解锁去水印版',
    // Share modal
    shareModalTitle: isOverseas ? '✨ Your design is ready!'                           : '✨ 效果图已生成！',
    shareText:       isOverseas ? 'See my AI room redesign! Try it free →'            : '用AI生成了装修效果图，免费试试 →',
    shareSkip:       isOverseas ? 'Skip, just download'                               : '跳过，直接下载',
    // Upgrade
    upgradePrompt:   isOverseas ? 'You have used all your free generations this month. Upgrade to continue.' : '本月免费次数已用完，升级套餐继续生成',
    // Style/room selectors
    styleSelectTitle:   isOverseas ? 'Choose a Style'                                 : '选择装修风格',
    roomTypeSelectTitle:isOverseas ? 'Room Type'                                      : '房间类型',
  },

  // --- SEO ---
  seoMeta: {
    siteName:    isOverseas ? 'RoomAI'                                                 : '装AI',
    keywords:    isOverseas
      ? 'AI room design, interior design AI, room redesign, home renovation AI'
      : 'AI装修效果图, 室内设计AI, 装修效果图免费生成',
    description: isOverseas
      ? 'Redesign any room with AI. Upload a photo, choose a style, get a professional interior design in 30 seconds.'
      : '上传房间照片，AI 30秒生成专业装修效果图。40+种装修风格，免费生成，满意再付款。',
    verificationTag: isOverseas
      ? { 'google-site-verification': process.env.GOOGLE_SITE_VERIFICATION ?? '' }
      : { 'baidu-site-verification': process.env.BAIDU_SITE_VERIFICATION ?? '' },
  },
} as const
