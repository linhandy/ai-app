export type ShareTarget = 'twitter' | 'facebook' | 'copy_link' | 'wechat' | 'douyin' | 'xiaohongshu'

export interface ShareOptions {
  url: string
  title: string
}

export function getShareUrl(target: ShareTarget, options: ShareOptions): string | null {
  const { url, title } = options
  switch (target) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    case 'copy_link':
      return null  // handled via clipboard API, not a URL
    case 'wechat':
      return null  // WeChat sharing is handled by WeixinJSBridge, not a URL
    case 'douyin':
      return `https://www.douyin.com/`
    case 'xiaohongshu':
      return `https://www.xiaohongshu.com/`
    default:
      return null
  }
}

export const SHARE_TARGET_LABELS: Record<ShareTarget, string> = {
  twitter:     'Twitter / X',
  facebook:    'Facebook',
  copy_link:   'Copy Link',
  wechat:      '微信',
  douyin:      '抖音',
  xiaohongshu: '小红书',
}

export const SHARE_TARGET_ICONS: Record<ShareTarget, string> = {
  twitter:     '𝕏',
  facebook:    'f',
  copy_link:   '🔗',
  wechat:      '💬',
  douyin:      '🎵',
  xiaohongshu: '📕',
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
