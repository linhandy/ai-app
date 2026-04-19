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
    heroTitle:            isOverseas ? 'Redesign Any Room with AI'                              : '拍一张照片，AI秒变理想装修',
    heroSubtitle:         isOverseas ? 'Upload a photo. Get a professional interior design in 30 seconds.' : '上传任意角度的房间照片，30秒内看到专业室内设计师级别的装修效果图',
    heroCta:              isOverseas ? 'Generate for Free'                                      : '免费生成效果图',
    heroSecondaryCta:     isOverseas ? 'View Examples'                                          : '查看示例效果',
    heroBadge:            isOverseas ? '✦ 3 free designs daily (1024px preview) · No credit card needed' : '✦ 免费生成 · 满意再付费',
    // Hero before/after labels
    beforeLabel:          isOverseas ? 'Before'                                                 : '改造前',
    afterLabel:           isOverseas ? 'AI Result'                                              : 'AI效果图',
    beforeCaption:        isOverseas ? 'Plain unfurnished living room'                          : '普通未装修的客厅',
    afterCaption:         isOverseas ? 'Transformed with Nordic Minimal AI'                     : 'AI 改造成北欧简约风',
    // Nav
    navStyles:            isOverseas ? 'Styles'                                                 : '风格展示',
    navPricing:           isOverseas ? 'Pricing'                                                : '价格',
    navFaq:               isOverseas ? 'FAQ'                                                    : '常见问题',
    navHistory:           isOverseas ? 'History'                                                : '历史记录',
    navAccount:           isOverseas ? 'Account'                                                : '账户',
    navSignIn:            isOverseas ? 'Sign in'                                                : '登录/注册',
    navSignOut:           isOverseas ? 'Sign out'                                               : '退出',
    navGenerate:          isOverseas ? 'Get Started'                                            : '开始体验',
    // Mobile menu
    mobileMenuTitle:      isOverseas ? 'Menu'                                                   : '菜单',
    mobileMenuOpen:       isOverseas ? 'Open menu'                                              : '打开菜单',
    mobileMenuCta:        isOverseas ? 'Get Started'                                            : '开始体验',
    // Pricing section (homepage)
    pricingTitle:         isOverseas ? 'Simple, transparent pricing'                            : '选择适合你的方案',
    pricingSubtitle:      isOverseas ? 'Start free. Upgrade when you need more.'                : '免费生成带水印预览 · 满意后付费下载无水印版',
    // FAQ
    faqTitle:             isOverseas ? 'Frequently Asked Questions'                             : '常见问题',
    // Footer
    footer:               isOverseas ? '© 2026 RoomAI · Powered by AI'                  : '© 2026 装AI · 由 AI 驱动',
    // Upload component
    uploadPrompt:         isOverseas ? 'Drop your room photo here'                              : '拖拽上传房间照片',
    uploadDragHint:       isOverseas ? 'or click to browse'                                     : '或点击选择文件',
    uploadBrowse:         isOverseas ? 'Browse Files'                                           : '选择文件',
    uploading:            isOverseas ? 'Uploading...'                                           : '上传中...',
    uploadFailed:         isOverseas ? 'Upload failed'                                          : '上传失败',
    // Generate page nav
    generateNavHint:      isOverseas ? 'Upload photo → Pick style → Generate'                  : '上传照片 → 选择风格 → 生成',
    generateNavHintFree:  isOverseas ? 'Pick style → Describe → Generate'                      : '选择风格 → 描述需求 → 生成',
    // Generate page sections
    uploadTitle:          isOverseas ? 'Upload your room photo'                                 : '上传房间照片',
    uploadSubtitle:       isOverseas ? 'JPG / PNG / WEBP · Front-facing angle works best'      : '支持 JPG / PNG，建议正面拍摄',
    uploadSubtitleSketch: isOverseas ? 'Upload a hand-drawn sketch — AI converts to photorealistic render' : '上传手绘草图，AI转换为写实效果图',
    freeGenTitle:         isOverseas ? 'Free generation mode'                                   : '自由生成模式',
    freeGenSubtitle:      isOverseas ? 'No photo needed — AI generates from scratch'            : '无需照片，AI根据风格从零生成效果图',
    designModeTitle:      isOverseas ? 'Design Mode'                                            : '设计模式',
    roomTypeTitle:        isOverseas ? 'Room Type'                                              : '房间类型',
    styleTitle:           isOverseas ? 'Interior Style'                                         : '装修风格',
    noStyleNeeded:        isOverseas ? 'No style selection needed for this mode'                : '此模式无需选择风格',
    qualityTitle:         isOverseas ? 'Quality'                                                : '画质选择',
    customPromptLabel:    isOverseas ? '+ Add description (optional)'                           : '+ 补充描述（可选）',
    customPromptPlaceholder: isOverseas ? 'e.g. linen curtains, warm tones throughout...'      : '例如：窗帘用亚麻材质，整体偏暖色调...',
    // CTA
    ctaDisclaimer:        isOverseas ? 'AI generation uses compute · No refunds after starting' : 'AI生成消耗计算资源，付款后不支持退款',
    ctaGenerating:        isOverseas ? '⏳ Generating your design...'                           : 'AI生成中，请稍候...',
    ctaGeneratingMobile:  isOverseas ? '⏳ Generating...'                                       : '⏳ AI生成中...',
    ctaProcessing:        isOverseas ? 'Processing...'                                          : '处理中...',
    ctaButton:            isOverseas ? '⚡ Generate Now'                                        : '',
    // Credits / subscription display
    creditsRemaining:     isOverseas ? 'generations left today'                                 : '次免费体验',
    creditsBalance:       isOverseas ? 'Credits remaining:'                                     : '剩余额度:',
    // Errors
    errorUploadFirst:     isOverseas ? 'Please upload a room photo first'                       : '请先上传房间照片',
    errorOrderFailed:     isOverseas ? 'Failed to create order'                                 : '创建订单失败',
    errorGenFailed:       isOverseas ? 'Generation failed, please try again'                    : 'AI 生成失败，请稍后重试',
    // Generation / result
    generating:           isOverseas ? 'AI is redesigning your room...'                         : 'AI生成中，请稍候...',
    generatingSubtitle:   isOverseas ? 'About 30 seconds'                                       : '约30秒',
    // Result
    downloadBtn:          isOverseas ? 'Download'                                               : '下载',
    shareBtn:             isOverseas ? 'Share'                                                  : '分享',
    regenerateBtn:        isOverseas ? 'Regenerate'                                             : '重新生成',
    resultWatermarkNotice:isOverseas ? 'Upgrade to Pro to remove watermark'                     : '付费解锁去水印版',
    // Share modal
    shareModalTitle:      isOverseas ? '✨ Your design is ready!'                               : '✨ 效果图已生成！',
    shareText:            isOverseas ? 'See my AI room redesign! Try it free →'                 : '用AI生成了装修效果图，免费试试 →',
    shareSkip:            isOverseas ? 'Skip, just download'                                    : '跳过，直接下载',
    // Upgrade
    upgradePrompt:        isOverseas ? "You've used today's 3 free designs. Upgrade to Pro ($9.99/mo) for 150/month — or come back tomorrow for 3 more free." : '本月免费次数已用完，升级套餐继续生成',
    // Style/room selectors
    styleSelectTitle:     isOverseas ? 'Choose a Style'                                         : '选择装修风格',
    roomTypeSelectTitle:  isOverseas ? 'Room Type'                                              : '房间类型',
    // Styles section (homepage)
    stylesTitle:          isOverseas ? '40+ Styles, One Click'                                  : '40+ 装修风格，一键切换',
    stylesSubtitle:       isOverseas ? 'The most popular interior design styles · Click to preview' : '覆盖当下最流行的室内设计风格 · 点击图片可放大预览',
    // Referral section
    referralTitle:        isOverseas ? 'Your Referral Code'                                     : '你的推荐码',
    referralCodeLabel:    isOverseas ? 'Referral Code'                                          : '推荐码',
    referralInviteLabel:  isOverseas ? 'Invite URL'                                             : '邀请链接',
    referralCopyBtn:      isOverseas ? 'Copy Link'                                              : '复制链接',
    referralCopied:       isOverseas ? 'Copied!'                                                : '已复制！',
    referralThisMonth:    isOverseas ? 'Referrals This Month'                                  : '本月邀请',
    referralMonthProgress:isOverseas ? (count: number) => `${count}/10` : (count: number) => `${count}/10`,
    referralDescription:  isOverseas ? 'Share your link and earn +2 bonus designs each (up to 10/month).' : '分享你的链接，每成功邀请一个用户就能获得 +2 次免费生成（每月最多 10 个）',
    referralTotalStats:   isOverseas ? 'All-time referrals'                                    : '总邀请数',
    referralLoading:      isOverseas ? 'Loading referral stats...'                             : '加载推荐数据中...',
    referralError:        isOverseas ? 'Failed to load referral stats'                         : '加载推荐数据失败',
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
    verificationTag: (isOverseas
      ? { 'google-site-verification': process.env.GOOGLE_SITE_VERIFICATION ?? '' }
      : { 'baidu-site-verification': process.env.BAIDU_SITE_VERIFICATION ?? '' }) as Record<string, string>,
  },
} as const
