# Referral Invite Feature Documentation

## Overview

The SharePanel component now includes a complete referral invite functionality that allows users to:
- View their unique referral code and invitation link
- See referral statistics (this month's completed invitations and total)
- Share their referral link across multiple platforms (region-aware)
- Receive +2 bonus generations when friends sign up through their link

## Features

### 1. Invite Button
- **Location**: Displayed prominently at the top of the SharePanel on the result page
- **Visibility**: Only shows when:
  - User ID is available (`userId` prop)
  - Referral stats API call succeeds
  - User is logged in
- **Text**: Bilingual support
  - English: "Invite Friends"
  - Chinese: "邀请朋友"

### 2. Referral Statistics Display
When users click the "Invite Friends" button, a modal displays:
- **This Month's Completed Invitations**: `thisMonthCompleted / monthlyLimit` (10 max)
- **Total Completed Invitations**: All-time referral count
- **Referral URL**: Direct invitation link users can share
- **Bonus Information**: "+2 free generations" when friend completes signup

### 3. Region-Aware Share Integration

#### Overseas (English)
Share targets: Twitter, Facebook, Copy Link
- Twitter: Opens tweet composer with referral link and pre-filled message
- Facebook: Opens Facebook sharer
- Copy Link: Copies invitation URL to clipboard

#### Domestic (Chinese)
Share targets: WeChat, Douyin, Xiaohongshu, Copy Link
- WeChat: Generates QR code for easy scanning and sharing
- Douyin: Displays invitation link for manual sharing
- Xiaohongshu: Displays invitation link for manual sharing
- Copy Link: Copies invitation URL to clipboard

### 4. Bilingual UI

All text supports both English and Chinese:

| Feature | English | Chinese |
|---------|---------|---------|
| Button | Invite Friends | 邀请朋友 |
| Modal Title | Invite Friends | 邀请朋友 |
| Description | Share your referral link. When friends sign up and generate once, you both get +2 bonus generations | 分享你的推荐链接，朋友注册并生成一次后，你们都能获得 +2 次免费生成 |
| This Month | This month | 本月邀请成功 |
| Total | Total referrals | 总共邀请成功 |
| Link Label | Your referral link | 你的邀请链接 |
| Close | Close | 关闭 |

### 5. Copy to Clipboard

Users can copy:
- Referral URL from the main invite modal
- Referral URL from platform-specific modals (Douyin, Xiaohongshu)
- Display confirmation: "已复制" (Chinese) / "Copied" (English) for 2 seconds

### 6. Error Handling

The feature gracefully degrades if:
- User ID is not provided: Invite button doesn't show
- API call fails: Invite button doesn't show, standard share panel still works
- Network error during stats fetch: Invite button hidden, regular sharing available
- QR code generation fails: Error logged, user can still manually share

## Usage

### Props

```typescript
interface Props {
  style: string                    // Room design style (e.g., "Nordic Minimal")
  resultUrl: string               // Relative URL for result image
  pageUrl?: string                // Full URL of result page
  referralCount?: number           // Display count of people who used referral link
  isOverseas?: boolean             // Detect region (true = English/overseas)
  userId?: string                  // Current user ID (enables referral features)
}
```

### Example Integration

```tsx
import SharePanel from '@/components/SharePanel'

export default function ResultPage() {
  const userId = getCurrentUserId() // Your auth logic
  const isOverseas = detectRegion()  // Your region detection logic

  return (
    <SharePanel
      style="Nordic Minimal"
      resultUrl="/api/preview?design=abc123"
      pageUrl={window.location.href}
      userId={userId}
      isOverseas={isOverseas}
    />
  )
}
```

## API Integration

### GET /api/referral/stats

The component calls this endpoint to fetch referral information:

**Query Parameters:**
- `userId`: User ID (required)

**Response:**
```json
{
  "refCode": "abc12345",
  "inviteUrl": "https://example.com/r/abc12345",
  "thisMonthCompleted": 3,
  "totalCompleted": 7,
  "monthlyLimit": 10
}
```

**Error Handling:**
- If API returns error or network fails, invite button is hidden
- Standard share panel continues to function
- Errors are logged to console for debugging

## Testing

Run the test suite:

```bash
npm test -- __tests__/components/SharePanel.test.tsx
```

### Test Coverage

Tests verify:
- ✓ Invite button visibility based on `userId` prop
- ✓ API calls with correct parameters
- ✓ Region-aware share targets
- ✓ Bilingual text rendering
- ✓ Copy to clipboard functionality
- ✓ QR code generation for WeChat
- ✓ Error handling and graceful degradation
- ✓ Modal interactions
- ✓ Referral stats display

## State Management

The component manages:
- `referralStats`: Cached referral data from API
- `referralError`: Error state for API failures
- `modal`: Current modal view (invite, invite_wechat, invite_douyin, invite_xiaohongshu)
- `copied`: Clipboard copy confirmation state

## Performance Considerations

1. **Lazy Loading**: Referral stats are only fetched when user clicks "Invite Friends"
2. **Caching**: Stats are cached in component state, avoiding duplicate API calls
3. **QR Code**: Generated on-demand only when WeChat share is clicked
4. **Async/Await**: All API calls use proper async/await with error handling

## Security

1. **CORS**: API endpoint accepts cross-origin requests
2. **User Validation**: `userId` is validated server-side
3. **Rate Limiting**: Monthly cap of 10 referrals per user (server-enforced)
4. **URL Encoding**: Referral URLs properly encoded in share links

## Troubleshooting

### Invite Button Doesn't Show
- Check if `userId` prop is being passed
- Verify `/api/referral/stats` endpoint is working
- Check browser console for API errors
- Ensure user is logged in

### Copy to Clipboard Not Working
- Browser must support `navigator.clipboard` API
- HTTPS connection required
- Check browser permissions for clipboard access

### WeChat QR Code Not Generating
- Check if `qrcode` package is installed
- Verify QRCode module can access window/DOM
- Check console for QR generation errors

### Share URLs Not Opening
- Verify `window.open` is available
- Check browser pop-up blocker settings
- Ensure referral URL is valid and accessible

## Future Enhancements

Potential improvements:
1. Track referral link clicks
2. Custom share messages per platform
3. Referral performance analytics dashboard
4. Reward tracking and notifications
5. Bulk share functionality
6. Email/SMS sharing options
