import { NextRequest, NextResponse } from 'next/server'
import { getReferralStats } from '@/lib/referral'
import { getServerSession } from '@/lib/auth'

/**
 * Authenticated API endpoint for retrieving referral statistics
 * GET /api/referral/stats
 *
 * Returns referral stats for the authenticated user only.
 * Requires user to be logged in (authenticated session).
 *
 * Response:
 *   - refCode: The referral code for this user
 *   - inviteUrl: The full invite URL
 *   - thisMonthCompleted: Completed referrals this month
 *   - totalCompleted: Total completed referrals (all time)
 *   - monthlyLimit: Maximum referrals per month
 *
 * Error Responses:
 *   - 401: Unauthorized (no valid session)
 *   - 500: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(req)

    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      )
    }

    // Fetch referral stats for authenticated user only
    const stats = await getReferralStats(session.userId)

    // Return stats with CORS headers
    return NextResponse.json(stats, {
      status: 200,
      headers: corsHeaders(),
    })
  } catch (error) {
    // Log error for monitoring
    console.error('[API] referral/stats error:', error)

    // Return generic 500 error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    )
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  })
}

/**
 * Returns CORS headers for cross-origin requests
 */
function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400', // 24 hours
  }
}
