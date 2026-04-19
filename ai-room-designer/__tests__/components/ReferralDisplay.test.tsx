import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReferralDisplay from '@/components/ReferralDisplay'
import { regionConfig } from '@/lib/region-config'

// Mock 系统剪贴板 API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
})

describe('ReferralDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    test('renders referral code correctly', () => {
      render(
        <ReferralDisplay
          refCode="abc12345"
          inviteUrl="https://example.com/r/abc12345"
          thisMonthCompleted={3}
          totalCompleted={7}
          monthlyLimit={10}
        />
      )

      expect(screen.getByText('abc12345')).toBeInTheDocument()
      expect(screen.getByDisplayValue('https://example.com/r/abc12345')).toBeInTheDocument()
    })

    test('renders progress badge with current month count', () => {
      render(
        <ReferralDisplay
          refCode="abc12345"
          inviteUrl="https://example.com/r/abc12345"
          thisMonthCompleted={5}
          totalCompleted={10}
          monthlyLimit={10}
        />
      )

      expect(screen.getByText('5/10')).toBeInTheDocument()
    })

    test('renders loading state', () => {
      render(
        <ReferralDisplay
          refCode="abc12345"
          inviteUrl="https://example.com/r/abc12345"
          thisMonthCompleted={0}
          totalCompleted={0}
          monthlyLimit={10}
          isLoading={true}
        />
      )

      expect(screen.getByText(regionConfig.strings.referralLoading)).toBeInTheDocument()
    })

    test('renders error state', () => {
      render(
        <ReferralDisplay
          refCode="abc12345"
          inviteUrl="https://example.com/r/abc12345"
          thisMonthCompleted={0}
          totalCompleted={0}
          monthlyLimit={10}
          error="Network error"
        />
      )

      expect(screen.getByText(regionConfig.strings.referralError)).toBeInTheDocument()
    })
  })

  describe('copy functionality', () => {
    test('copies invite URL on button click', async () => {
      render(
        <ReferralDisplay
          refCode="abc12345"
          inviteUrl="https://example.com/r/abc12345"
          thisMonthCompleted={0}
          totalCompleted={0}
          monthlyLimit={10}
        />
      )

      const copyButton = screen.getByRole('button', {
        name: new RegExp(regionConfig.strings.referralCopyBtn, 'i'),
      })

      fireEvent.click(copyButton)

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://example.com/r/abc12345'
      )
    })

    test('shows "Copied!" feedback after copy', async () => {
      render(
        <ReferralDisplay
          refCode="abc12345"
          inviteUrl="https://example.com/r/abc12345"
          thisMonthCompleted={0}
          totalCompleted={0}
          monthlyLimit={10}
        />
      )

      const copyButton = screen.getByRole('button', {
        name: new RegExp(regionConfig.strings.referralCopyBtn, 'i'),
      })

      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(screen.getByText(regionConfig.strings.referralCopied)).toBeInTheDocument()
      })
    })

    test('shows "Copy Link" again after 2 seconds', async () => {
      jest.useFakeTimers()

      render(
        <ReferralDisplay
          refCode="abc12345"
          inviteUrl="https://example.com/r/abc12345"
          thisMonthCompleted={0}
          totalCompleted={0}
          monthlyLimit={10}
        />
      )

      const copyButton = screen.getByRole('button', {
        name: new RegExp(regionConfig.strings.referralCopyBtn, 'i'),
      })

      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(screen.getByText(regionConfig.strings.referralCopied)).toBeInTheDocument()
      })

      jest.advanceTimersByTime(2000)

      expect(screen.getByText(regionConfig.strings.referralCopyBtn)).toBeInTheDocument()

      jest.useRealTimers()
    })
  })

  describe('progress styling', () => {
    test('renders progress bar with correct percentage', () => {
      const { container } = render(
        <ReferralDisplay
          refCode="abc12345"
          inviteUrl="https://example.com/r/abc12345"
          thisMonthCompleted={5}
          totalCompleted={0}
          monthlyLimit={10}
        />
      )

      const progressBar = container.querySelector('div[style*="width"]')
      expect(progressBar).toHaveStyle('width: 50%')
    })

    test('applies correct badge color based on completion', () => {
      const { rerender } = render(
        <ReferralDisplay
          refCode="abc12345"
          inviteUrl="https://example.com/r/abc12345"
          thisMonthCompleted={3}
          totalCompleted={0}
          monthlyLimit={10}
        />
      )

      // 3/10: 灰色
      let badge = screen.getByText('3/10')
      expect(badge).toHaveClass('bg-gray-800')

      // 5/10: 紫色
      rerender(
        <ReferralDisplay
          refCode="abc12345"
          inviteUrl="https://example.com/r/abc12345"
          thisMonthCompleted={5}
          totalCompleted={0}
          monthlyLimit={10}
        />
      )

      badge = screen.getByText('5/10')
      expect(badge).toHaveClass('bg-purple-900')

      // 10/10: 琥珀色
      rerender(
        <ReferralDisplay
          refCode="abc12345"
          inviteUrl="https://example.com/r/abc12345"
          thisMonthCompleted={10}
          totalCompleted={0}
          monthlyLimit={10}
        />
      )

      badge = screen.getByText('10/10')
      expect(badge).toHaveClass('bg-amber-900')
    })
  })

  describe('total referrals display', () => {
    test('shows total referrals when greater than 0', () => {
      render(
        <ReferralDisplay
          refCode="abc12345"
          inviteUrl="https://example.com/r/abc12345"
          thisMonthCompleted={0}
          totalCompleted={15}
          monthlyLimit={10}
        />
      )

      expect(screen.getByText(/All-time referrals|总邀请数/)).toBeInTheDocument()
      expect(screen.getByText(/15/)).toBeInTheDocument()
    })

    test('does not show total referrals when 0', () => {
      const { queryByText } = render(
        <ReferralDisplay
          refCode="abc12345"
          inviteUrl="https://example.com/r/abc12345"
          thisMonthCompleted={0}
          totalCompleted={0}
          monthlyLimit={10}
        />
      )

      expect(queryByText(/All-time referrals|总邀请数/)).not.toBeInTheDocument()
    })
  })
})
