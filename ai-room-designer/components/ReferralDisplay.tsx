'use client'

import { useState } from 'react'
import { regionConfig } from '@/lib/region-config'

interface ReferralDisplayProps {
  refCode: string
  inviteUrl: string
  thisMonthCompleted: number
  totalCompleted: number
  monthlyLimit: number
  isLoading?: boolean
  error?: string | null
}

export default function ReferralDisplay({
  refCode,
  inviteUrl,
  thisMonthCompleted,
  totalCompleted,
  monthlyLimit,
  isLoading = false,
  error = null,
}: ReferralDisplayProps) {
  const [urlCopied, setUrlCopied] = useState(false)

  // 处理复制操作
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // 计算进度百分比
  const progressPercent = Math.round((thisMonthCompleted / monthlyLimit) * 100)

  // 加载状态
  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-6">
        <p className="text-gray-400 text-sm">
          {regionConfig.strings.referralLoading}
        </p>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-6">
        <p className="text-red-400 text-sm">
          {regionConfig.strings.referralError}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-6">
      {/* 标题 */}
      <h2 className="text-lg font-semibold mb-1">
        {regionConfig.strings.referralTitle}
      </h2>
      <p className="text-gray-400 text-sm mb-4">
        {regionConfig.strings.referralDescription}
      </p>

      {/* 推荐码显示 */}
      <div className="mb-4">
        <label className="text-gray-400 text-xs mb-1 block">
          {regionConfig.strings.referralCodeLabel}
        </label>
        <div className="bg-gray-800 border border-gray-700 rounded px-3 py-2 font-mono text-sm text-gray-300">
          {refCode}
        </div>
      </div>

      {/* 邀请链接显示和复制 */}
      <div className="mb-4">
        <label className="text-gray-400 text-xs mb-1 block">
          {regionConfig.strings.referralInviteLabel}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            className="flex-1 bg-gray-800 text-gray-300 text-sm px-3 h-10 rounded border border-gray-700 outline-none"
          />
          <button
            onClick={handleCopyUrl}
            className="shrink-0 bg-amber-500 text-black text-sm font-semibold px-4 h-10 rounded hover:bg-amber-400 transition-colors"
          >
            {urlCopied ? regionConfig.strings.referralCopied : regionConfig.strings.referralCopyBtn}
          </button>
        </div>
      </div>

      {/* 本月邀请进度 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-gray-400 text-xs">
            {regionConfig.strings.referralThisMonth}
          </label>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            thisMonthCompleted >= monthlyLimit
              ? 'bg-amber-900 text-amber-400'
              : thisMonthCompleted >= 5
              ? 'bg-purple-900 text-purple-300'
              : 'bg-gray-800 text-gray-400'
          }`}>
            {thisMonthCompleted}/{monthlyLimit}
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-amber-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* 总邀请数统计 */}
      {totalCompleted > 0 && (
        <p className="text-gray-500 text-xs">
          {regionConfig.strings.referralTotalStats}: {totalCompleted}
        </p>
      )}
    </div>
  )
}
