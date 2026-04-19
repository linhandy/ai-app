# Referral Stats API Endpoint

## Overview

The Referral Stats API is a **public, unauthenticated endpoint** that returns referral statistics for a given user. This endpoint is intentionally public to allow sharing stats via URLs, emails, social media, and other channels.

**Endpoint:** `GET /api/referral/stats`

## Authentication

**None required.** This is a public endpoint.

## Request

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | The user ID to fetch referral stats for |

### Validation

- `userId` is required and cannot be empty
- `userId` must match the format: `[a-zA-Z0-9_\-.]+`
- `userId` maximum length: 128 characters
- Invalid formats return HTTP 400

### Example Request

```bash
# Valid request
curl "https://example.com/api/referral/stats?userId=usr_abc123"

# With special characters (URL-encoded)
curl "https://example.com/api/referral/stats?userId=user-name.123"
```

## Response

### Success Response (HTTP 200)

```json
{
  "refCode": "a1b2c3d4",
  "inviteUrl": "https://example.com/r/a1b2c3d4",
  "thisMonthCompleted": 3,
  "totalCompleted": 7,
  "monthlyLimit": 10
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `refCode` | string | 8-character hexadecimal referral code |
| `inviteUrl` | string | Full shareable invite URL |
| `thisMonthCompleted` | number | Completed referrals in current month |
| `totalCompleted` | number | Total completed referrals (all time) |
| `monthlyLimit` | number | Maximum referrals allowed per month |

### Error Responses

#### 400 Bad Request

**Cause:** Missing or invalid `userId` parameter

```json
{
  "error": "Missing required parameter: userId"
}
```

or

```json
{
  "error": "Invalid userId format"
}
```

#### 500 Internal Server Error

**Cause:** Unexpected server error

```json
{
  "error": "Internal server error"
}
```

## CORS Headers

The endpoint includes full CORS headers for cross-origin requests:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 86400
```

### Preflight Requests

OPTIONS requests are supported for CORS preflight:

```bash
curl -X OPTIONS "https://example.com/api/referral/stats"
```

## Security Considerations

### 1. Input Validation

- `userId` is validated against a whitelist pattern `[a-zA-Z0-9_\-.]+` to prevent injection attacks
- Maximum length of 128 characters prevents buffer overflow
- Empty or missing `userId` returns 400

### 2. Public Data

- This endpoint returns **only public stats**, no sensitive information
- Stats are derivable from the referral code alone
- No authentication is required or checked

### 3. Rate Limiting (Optional)

While not implemented in the endpoint itself, consider adding rate limiting at the infrastructure level:

- Suggest 1000 requests per minute per IP
- Or 100 requests per minute per userId

### 4. Monitoring

- All errors are logged to `console.error` for monitoring
- Consider adding metrics collection (requests/response times)

## Use Cases

### 1. Email Signature

Embed stats in email templates:

```html
<a href="https://example.com/api/referral/stats?userId=usr_john">
  Check my referral stats
</a>
```

### 2. Social Media Sharing

Generate shareable links:

```
Check out my referral stats: https://example.com/api/referral/stats?userId=usr_jane
```

### 3. Dashboard Widget

Fetch stats for client-side display:

```javascript
const response = await fetch(
  `/api/referral/stats?userId=${userId}`
);
const stats = await response.json();
console.log(`You've made ${stats.thisMonthCompleted} referrals this month!`);
```

### 4. Third-party Integrations

Integrate with external tools:

```bash
curl "https://api.example.com/referral/stats?userId=usr_integration" \
  | jq '.inviteUrl'
```

## Testing

### Unit Tests

Run the API tests:

```bash
npm test -- __tests__/api/referral-stats.test.ts
```

### Manual Testing

```bash
# Valid request
curl "http://localhost:3000/api/referral/stats?userId=usr_test"

# Missing userId
curl "http://localhost:3000/api/referral/stats"

# Invalid format
curl "http://localhost:3000/api/referral/stats?userId=user@invalid"

# CORS preflight
curl -X OPTIONS "http://localhost:3000/api/referral/stats"
```

## Performance

- **Single request latency:** < 100ms (typical)
- **Database queries:** 3-4 (cached by Next.js)
- **Response size:** ~200 bytes

### Optimization Tips

- Consider caching the response at the CDN level (5-minute TTL)
- Use compression (gzip) for bandwidth savings

## Implementation Details

### File Location

```
app/api/referral/stats/route.ts
```

### Dependencies

- `getReferralStats()` from `lib/referral`
- Next.js `NextRequest` and `NextResponse`

### Logging

Errors are logged with context:

```
[API] referral/stats error: <error message>
```

## FAQ

### Q: Why is this endpoint public?

**A:** Public endpoints enable users to share their referral stats easily. The stats themselves contain no sensitive information — they're already public through the referral code URL.

### Q: What if a userId has no referrals?

**A:** The endpoint still returns a valid response with zero counts:

```json
{
  "refCode": "a1b2c3d4",
  "inviteUrl": "https://example.com/r/a1b2c3d4",
  "thisMonthCompleted": 0,
  "totalCompleted": 0,
  "monthlyLimit": 10
}
```

### Q: Can I use special characters in userId?

**A:** Only `[a-zA-Z0-9_\-.]+` are allowed. Other characters return 400. Make sure to URL-encode if necessary.

### Q: Is the userId case-sensitive?

**A:** Yes. `usr_ABC` and `usr_abc` are treated as different users.

### Q: How are referral codes generated?

**A:** Deterministically from userId using SHA-256 hash with a salt. Falls back to random 8-character hex on collision.

### Q: What's included in monthlyLimit?

**A:** The maximum number of referrals a user can complete per calendar month (currently 10).

## Related

- [Referral System Design](../../docs/superpowers/specs/2026-04-18-referral-reward-system-design.md)
- [getReferralStats() function](../../lib/referral.ts)
- [API Tests](../../__tests__/api/referral-stats.test.ts)
