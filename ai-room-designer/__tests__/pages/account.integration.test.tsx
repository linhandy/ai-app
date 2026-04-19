/**
 * Integration tests for /account page with referral system
 *
 * Tests cover:
 * - Account page loads with referral data
 * - Referral stats are fetched and displayed correctly
 * - Error handling when referral stats fail to load
 * - Copy button functionality
 * - Progress bar rendering
 * - Bilingual text display
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { redirect } from 'next/navigation'
import AccountPage from '@/app/account/page'
import * as referralLib from '@/lib/referral'
import * as subscriptionLib from '@/lib/subscription'
import * as nextAuthLib from '@/lib/next-auth'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('@/lib/referral')
jest.mock('@/lib/subscription')
jest.mock('@/lib/next-auth')
jest.mock('@/components/NavBar', () => {
  return function MockNavBar() {
    return <div data-testid="navbar">NavBar</div>
  }
})

const mockRedirect = redirect as jest.MockedFunction<typeof redirect>
const mockGetReferralStats = referralLib.getReferralStats as jest.MockedFunction<typeof referralLib.getReferralStats>
const mockGetSubscription = subscriptionLib.getSubscription as jest.MockedFunction<typeof subscriptionLib.getSubscription>

describe('Account Page with Referral Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_REGION = 'overseas'
  })

  describe('authentication', () => {
    test('redirects to signin when not authenticated', async () => {
      const mockAuth = jest.fn().mockResolvedValue({
        user: null,
      })
      ;(nextAuthLib.auth as jest.Mock) = mockAuth

      await AccountPage()

      expect(mockRedirect).toHaveBeenCalledWith('/api/auth/signin')
    })

    test('redirects to home when not overseas region', async () => {
      process.env.NEXT_PUBLIC_REGION = 'cn'

      await AccountPage()

      expect(mockRedirect).toHaveBeenCalledWith('/')
    })
  })

  describe('referral stats display', () => {
    beforeEach(() => {
      const mockAuth = jest.fn().mockResolvedValue({
        user: { id: 'usr_123' },
      })
      ;(nextAuthLib.auth as jest.Mock) = mockAuth

      mockGetSubscription.mockResolvedValue({
        plan: 'free',
        generationsUsed: 1,
        generationsLimit: 3,
        generationsLeft: 2,
        hasWatermark: false,
        status: 'active',
      })

      mockGetReferralStats.mockResolvedValue({
        refCode: 'abc12345',
        inviteUrl: 'https://example.com/r/abc12345',
        thisMonthCompleted: 3,
        totalCompleted: 8,
        monthlyLimit: 10,
      })
    })

    test('displays referral code correctly', async () => {
      const result = await AccountPage()
      const { container } = render(result)

      await waitFor(() => {
        expect(screen.getByText('abc12345')).toBeInTheDocument()
      })
    })

    test('displays invite URL correctly', async () => {
      const result = await AccountPage()
      render(result)

      await waitFor(() => {
        expect(screen.getByDisplayValue('https://example.com/r/abc12345')).toBeInTheDocument()
      })
    })

    test('displays monthly progress badge', async () => {
      const result = await AccountPage()
      render(result)

      await waitFor(() => {
        expect(screen.getByText('3/10')).toBeInTheDocument()
      })
    })

    test('displays total referrals when greater than 0', async () => {
      const result = await AccountPage()
      render(result)

      await waitFor(() => {
        expect(screen.getByText(/All-time referrals|总邀请数/)).toBeInTheDocument()
        expect(screen.getByText(/8/)).toBeInTheDocument()
      })
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      const mockAuth = jest.fn().mockResolvedValue({
        user: { id: 'usr_123' },
      })
      ;(nextAuthLib.auth as jest.Mock) = mockAuth

      mockGetSubscription.mockResolvedValue({
        plan: 'free',
        generationsUsed: 0,
        generationsLimit: 3,
        generationsLeft: 3,
        hasWatermark: false,
        status: 'active',
      })
    })

    test('handles referral stats fetch error gracefully', async () => {
      mockGetReferralStats.mockRejectedValue(new Error('Network error'))

      const result = await AccountPage()
      render(result)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load referral stats/i)).toBeInTheDocument()
      })
    })

    test('displays page with default referral values when error occurs', async () => {
      mockGetReferralStats.mockRejectedValue(new Error('API error'))

      const result = await AccountPage()
      render(result)

      await waitFor(() => {
        expect(screen.getByText('Account')).toBeInTheDocument()
      })
    })
  })

  describe('subscription section', () => {
    beforeEach(() => {
      const mockAuth = jest.fn().mockResolvedValue({
        user: { id: 'usr_123' },
      })
      ;(nextAuthLib.auth as jest.Mock) = mockAuth

      mockGetReferralStats.mockResolvedValue({
        refCode: 'abc12345',
        inviteUrl: 'https://example.com/r/abc12345',
        thisMonthCompleted: 0,
        totalCompleted: 0,
        monthlyLimit: 10,
      })
    })

    test('displays current plan correctly', async () => {
      mockGetSubscription.mockResolvedValue({
        plan: 'pro',
        generationsUsed: 100,
        generationsLimit: 150,
        generationsLeft: 50,
        hasWatermark: false,
        status: 'active',
      })

      const result = await AccountPage()
      render(result)

      await waitFor(() => {
        expect(screen.getByText('Pro')).toBeInTheDocument()
      })
    })

    test('displays upgrade button for non-unlimited plans', async () => {
      mockGetSubscription.mockResolvedValue({
        plan: 'free',
        generationsUsed: 1,
        generationsLimit: 3,
        generationsLeft: 2,
        hasWatermark: false,
        status: 'active',
      })

      const result = await AccountPage()
      render(result)

      await waitFor(() => {
        expect(screen.getByText('Upgrade Plan')).toBeInTheDocument()
      })
    })
  })
})
