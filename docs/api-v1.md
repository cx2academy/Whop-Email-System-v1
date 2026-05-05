# Whop Email Engine — API v1 Reference

Base URL: `https://whop-email-system-v1.vercel.app/api/v1`

All requests must include:
```
Authorization: Bearer wee_<your_api_key>
```

Generate API keys in your workspace **Settings → API Keys**.

---

## Rate Limiting

60 requests per minute per API key. Exceeded requests return `429`.

Headers returned on every response:
- `X-RateLimit-Limit` — max requests per window
- `X-RateLimit-Remaining` — requests left in current window
- `X-RateLimit-Reset` — Unix timestamp when window resets

---

## Endpoints

### GET /api/v1/campaigns

List campaigns for your workspace.

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | — | Filter by status: DRAFT, SENDING, COMPLETED, FAILED |
| limit | number | 20 | Max results (cap: 100) |
| offset | number | 0 | Pagination offset |

**Response:**
```json
{
  "data": [
    {
      "id": "cm...",
      "name": "April Newsletter",
      "status": "COMPLETED",
      "subject": "What's new this month",
      "totalSent": 1240,
      "totalOpened": 310,
      "totalClicked": 88,
      "totalBounced": 4,
      "sentAt": "2025-04-01T10:00:00.000Z",
      "createdAt": "2025-03-28T09:00:00.000Z"
    }
  ],
  "meta": { "total": 12, "limit": 20, "offset": 0 }
}
```

---

### POST /api/v1/send

Send a one-off transactional email using your workspace sender identity.

**Request body:**
```json
{
  "to": "user@example.com",
  "subject": "Your receipt",
  "html": "<p>Thanks for your purchase.</p>",
  "text": "Thanks for your purchase."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| to | string or string[] | Yes | Recipient(s) |
| subject | string | Yes | Email subject line |
| html | string | Yes | HTML email body |
| text | string | No | Plain text fallback |

**Response:**
```json
{
  "messageId": "msg_abc123",
  "provider": "resend"
}
```

**Error (no sender configured):**
```json
{ "error": "No sender email configured", "message": "Add a sender email in workspace Settings first." }
``` (status 422)

---

### GET /api/v1/analytics

Aggregate analytics summary for your workspace.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| campaignId | string | Filter to a single campaign |

**Response:**
```json
{
  "data": {
    "totalSent": 5000,
    "totalDelivered": 4950,
    "totalOpened": 1200,
    "totalClicked": 340,
    "totalBounced": 22,
    "totalComplaints": 1,
    "openRate": 24.0,
    "clickRate": 6.8,
    "bounceRate": 0.44,
    "campaigns": [
      {
        "id": "cm...",
        "name": "April Newsletter",
        "sentAt": "2025-04-01T10:00:00.000Z",
        "totalSent": 1240,
        "openRate": 25.0,
        "clickRate": 7.1,
        "bounceRate": 0.32
      }
    ]
  }
}
```

---

## Error Responses

All errors follow this shape:
```json
{ "error": "Short error code", "message": "Human-readable detail" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request — missing or invalid fields |
| 401 | Unauthorized — missing or invalid API key |
| 403 | Forbidden — key doesn't have access to this resource |
| 404 | Not found |
| 422 | Unprocessable — valid request but precondition not met |
| 429 | Rate limited |
| 502 | Upstream send failure (Resend error) |

---

## Usage Logging

Every API call is logged to the `api_logs` table with:
- API key ID
- HTTP method and path
- Response status code
- Duration in milliseconds

Logs are visible to workspace admins (future: Settings → API Logs).

---

## Key Management

Keys are managed via the Settings → API Keys page in the dashboard.

- Keys are prefixed `wee_` followed by 32 hex chars
- The raw key is shown **once** at creation — store it immediately
- Revoke keys from the Settings page at any time
- Maximum 10 keys per workspace
- Keys are stored as bcrypt hashes — Whop Email Engine cannot recover your key

---

## Example: cURL

```bash
# List campaigns
curl https://whop-email-system-v1.vercel.app/api/v1/campaigns \
  -H "Authorization: Bearer wee_your_key_here"

# Send a transactional email
curl -X POST https://whop-email-system-v1.vercel.app/api/v1/send \
  -H "Authorization: Bearer wee_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"to":"user@example.com","subject":"Hello","html":"<p>Hi there</p>"}'

# Get analytics
curl https://whop-email-system-v1.vercel.app/api/v1/analytics \
  -H "Authorization: Bearer wee_your_key_here"
```

---

## Example: JavaScript (fetch)

```js
const API_KEY = 'wee_your_key_here';
const BASE = 'https://whop-email-system-v1.vercel.app/api/v1';
const headers = { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };

// Get campaigns
const { data } = await fetch(`${BASE}/campaigns`).then(r => r.json());

// Send email
await fetch(`${BASE}/send`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ to: 'user@example.com', subject: 'Hello', html: '<p>Hi</p>' }),
});

// Get analytics
const { data: analytics } = await fetch(`${BASE}/analytics`, { headers }).then(r => r.json());
```
