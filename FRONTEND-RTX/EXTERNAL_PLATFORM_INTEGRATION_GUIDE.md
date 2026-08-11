> **⚠️ THIS IS AN EXTERNAL INTEGRATION GUIDE — NOT A B2H IMPLEMENTATION SPEC**
>
> This document is intended for **third-party partner platforms** (e.g. Dad's BookShelves, TutorConnect) that want to integrate their systems **with** Bits Hustle Hubs (B2H) to enable automated referral tracking.
>
> **This is NOT a specification for building B2H itself.** B2H already exists as the receiving system. Partner platforms call B2H APIs and send webhooks **to** B2H. If you are a B2H developer working on this codebase, do NOT implement the API endpoints, webhook receivers, or platform management features described here — they already exist in the B2H backend.

> **🚨 BEFORE USING THIS GUIDE: Identify your platform and use its credentials.**
>
> | Platform | API Key | Platform UUID |
> |----------|---------|---------------|
> | Dad's BookShelves | `b2h_50556e66-7f15-40bd-b0ef-842f776c6966` | `3ee6c447-128f-46fa-b248-7f7e90d59d38` |
> | **BitTutorConnect** | **`b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab`** | **`b552099e-987c-4109-bdc8-8b7600600752`** |
> | PayDebt Technologies | `b2h_ca4baf52-b2f9-4dbb-b8f3-6dd445ef1e19` | `ad06c2af-a7a0-4026-bbe6-c26fae29941c` |
> | PhotoMart | `b2h_a7d5d626-7246-4f4a-afbf-9a37d6b2113d` | `1e0575d7-80d8-4de8-82fb-a8552df10fe0` |
> | Virtual Assistance | `b2h_a2e955be-c92f-4bfc-9fb4-11363cf74586` | `b1353dbf-d4b5-4dea-bdda-d2c8b8fe8073` |
> | Home & Away Services | `b2h_f4adc2f8-1a6d-4bdb-9c61-de865bd6c60e` | `bb115a3a-b212-46c7-99b7-dda6551ef844` |
> | LinkPal Bits Online | `b2h_9671fc3d-c461-4528-9fdf-b61483a5652b` | `32822149-c8a6-4561-89cc-6ca58a123530` |
> | Booking Services | `b2h_f5673535-bea7-4162-8a6a-4d647f97e8b9` | `39fcaee2-6319-4718-9bdc-f31edd5365d5` |
> | Business Hub | `b2h_2abbfebe-01bc-4434-9a73-b4378bfa08ba` | `1e800d20-fa1e-4ff0-b5a4-9fde681226ae` |
> | Campus Connect | `b2h_fe05eadb-a78e-4ede-94cf-408ef6d8e449` | `668fec80-a897-436f-828e-cd482a88fab3` |
>
> If you are developing for **BitTutorConnect**, always use the **BitTutorConnect** row. Never mix credentials from different platforms. All code examples below use BitTutorConnect values. Substitute your own platform's values if integrating a different partner.

For Dad's BookShelves, TutorConnect, and other Bits partner platforms.

## Overview

Integrate your platform with Bits Hustle Hubs (B2H) to enable automated referral tracking and ambassador rewards. When users sign up via B2H referral codes and complete actions on your platform, B2H automatically credits their wallets.

## Step 1: Get Your Platform Identifier

Each partner platform has a predefined identifier in the B2H system:

| Platform | Identifier | Platform UUID |
|----------|------------|---------------|
| Dad's BookShelves | `BITS_DADS_BOOKSHELVES` | `3ee6c447-128f-46fa-b248-7f7e90d59d38` |
| TutorConnect | `BITS_TUTORCONNECT` | `b552099e-987c-4109-bdc8-8b7600600752` |
| PayDebt Technologies | `BITS_PAYDEBT` | `ad06c2af-a7a0-4026-bbe6-c26fae29941c` |
| PhotoMart | `BITS_PHOTOMART` | `1e0575d7-80d8-4de8-82fb-a8552df10fe0` |
| Virtual Assistance | `BITS_VIRTUAL_ASSISTANCE` | `b1353dbf-d4b5-4dea-bdda-d2c8b8fe8073` |
| Home & Away Services | `BITS_HOME_AWAY_SERVICES` | `bb115a3a-b212-46c7-99b7-dda6551ef844` |
| LinkPal Bits Online | `BITS_LINKPAL_BITS_ONLINE` | `32822149-c8a6-4561-89cc-6ca58a123530` |
| Booking Services | `BITS_BOOKING_SERVICES` | `39fcaee2-6319-4718-9bdc-f31edd5365d5` |
| Business Hub | `BITS_BUSINESS_HUB` | `1e800d20-fa1e-4ff0-b5a4-9fde681226ae` |
| Campus Connect | `BITS_CAMPUS_CONNECT` | `668fec80-a897-436f-828e-cd482a88fab3` |

## Step 2: Your API Key and Webhook Secret

Use the credentials for **your platform** from the table below. If you are a new platform not yet listed, contact B2H admin — a self-service UI for credential generation is available.

| Platform | API Key | Platform UUID |
|----------|---------|---------------|
| Dad's BookShelves | `b2h_50556e66-7f15-40bd-b0ef-842f776c6966` | `3ee6c447-128f-46fa-b248-7f7e90d59d38` |
| **BitTutorConnect** | **`b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab`** | **`b552099e-987c-4109-bdc8-8b7600600752`** |
| PayDebt Technologies | `b2h_ca4baf52-b2f9-4dbb-b8f3-6dd445ef1e19` | `ad06c2af-a7a0-4026-bbe6-c26fae29941c` |
| PhotoMart | `b2h_a7d5d626-7246-4f4a-afbf-9a37d6b2113d` | `1e0575d7-80d8-4de8-82fb-a8552df10fe0` |
| Virtual Assistance | `b2h_a2e955be-c92f-4bfc-9fb4-11363cf74586` | `b1353dbf-d4b5-4dea-bdda-d2c8b8fe8073` |
| Home & Away Services | `b2h_f4adc2f8-1a6d-4bdb-9c61-de865bd6c60e` | `bb115a3a-b212-46c7-99b7-dda6551ef844` |
| LinkPal Bits Online | `b2h_9671fc3d-c461-4528-9fdf-b61483a5652b` | `32822149-c8a6-4561-89cc-6ca58a123530` |
| Booking Services | `b2h_f5673535-bea7-4162-8a6a-4d647f97e8b9` | `39fcaee2-6319-4718-9bdc-f31edd5365d5` |
| Business Hub | `b2h_2abbfebe-01bc-4434-9a73-b4378bfa08ba` | `1e800d20-fa1e-4ff0-b5a4-9fde681226ae` |
| Campus Connect | `b2h_fe05eadb-a78e-4ede-94cf-408ef6d8e449` | `668fec80-a897-436f-828e-cd482a88fab3` |

> ⚠️ Your API key is shown here for reference. Treat it like a password — do not commit it to public repos. The webhook secret is generated via the B2H admin dashboard's **Platform Integrations** page.

**Webhook Secret Generation (B2H Admin):**
B2H admin uses the **Platform Integrations** page (requires `platforms:create` permission) to generate webhook secrets. Each platform has its own unique secret, shown once upon generation. Share it securely with your platform team.

---

## Base URL

All B2H API endpoints are hosted on the **B2H server**. Partner platforms (like BitTutorConnect) call these endpoints remotely — they do **not** host these endpoints themselves.

| Who | Base URL | Context |
|-----|----------|---------|
| **Single-platform developers** (external partners only) | `https://api.bitshustlehubs.co.ke/api` | Production — only this URL applies |
| **B2H developers** (building/testing the partner integration locally) | `http://localhost:5000/api` | Internal testing — run `flask run` from `flask-api/`, then point the partner client here |

> **🚨 Critical distinction:**
> - **Partner platforms** (e.g., BitTutorConnect) = **clients** that **call** B2H's APIs. They do not expose these endpoints.
> - **B2H server** = the system that **hosts** these endpoints (`/api/platform-actions/register`, `/api/referral-rates`, `/api/webhooks/external-conversion`).
>
> **If you are developing BOTH B2H and a partner platform** (e.g., BTC as a single developer): Run the B2H Flask API locally on `localhost:5000`, then configure the partner platform to call `http://localhost:5000/api` for end-to-end integration testing. Switch to the production URL before deploying.
>
> **If you are only an external partner:** Use **only** the Production base URL. You do not run B2H locally.

## Step 3: Register Actions

Register **all actions** that can trigger ambassador commissions on your platform.

### Endpoint

All URLs below use `{B2H_BASE}`. Substitute either:
- `https://api.bitshustlehubs.co.ke` (production — external partners using deployed B2H)
- `http://localhost:5000` (local testing — when you run the B2H Flask API locally to test the partner integration)

  ```
  POST {B2H_BASE}/api/platform-actions/register
  ```

**Complete example (BitTutorConnect - production):**
```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/platform-actions/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab" \
  -d '{
    "name": "START_TUTORING_SESSION",
    "display_name": "Start Tutoring Session",
    "description": "User completes their first tutoring session"
  }'
```

**Complete example (BitTutorConnect - localhost):**
```bash
curl -X POST http://localhost:5000/api/platform-actions/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab" \
  -d '{
    "name": "START_TUTORING_SESSION",
    "display_name": "Start Tutoring Session",
    "description": "User completes their first tutoring session"
  }'
```

### Headers
```
Content-Type: application/json
X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab
```

### Request Body
```json
{
  "name": "ACTION_NAME",
  "display_name": "Human Readable Name",
  "description": "Description of the action"
}
```

### Example: Dad's BookShelves
```json
{
  "name": "BORROW_FROM_LIBRARY",
  "display_name": "Borrow from Library",
  "description": "User borrows a book from the library"
}
```

### Example: TutorConnect
```json
{
  "name": "START_TUTORING_SESSION",
  "display_name": "Start Tutoring Session",
  "description": "User completes their first tutoring session"
}
```

### Response (201)
```json
{
  "success": true,
  "message": "action registered — pending admin approval",
  "data": {
    "id": "uuid-here",
    "name": "BORROW_FROM_LIBRARY",
    "display_name": "Borrow from Library",
    "is_approved": false,
    "platform_id": "b552099e-987c-4109-bdc8-8b7600600752"
  }
}
```

**Note:** Actions require admin approval before use. Once approved, you'll receive confirmation.

---

## Step 4: Set Referral Rates (After Approval)

Set rates for **all registered actions**. Choose one approach per action:

- **Fixed amount:** Ambassador receives fixed KES for each conversion
- **Percentage:** Ambassador receives percentage of transaction amount

All URLs below use `{B2H_BASE}`. Substitute either:
- `https://api.bitshustlehubs.co.ke` (production — external partners using deployed B2H)
- `http://localhost:5000` (local testing — when you run the B2H Flask API locally to test the partner integration)

  ```
  POST {B2H_BASE}/api/referral-rates
  ```

**Complete example (BitTutorConnect - production):**
```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/referral-rates \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab" \
  -d '{
    "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
    "tier": "DEFAULT",
    "action": "BOOK_SESSION",
    "rate": 8.0,
    "is_percentage": true
  }'
```

**Complete example (BitTutorConnect - localhost):**
```bash
curl -X POST http://localhost:5000/api/referral-rates \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab" \
  -d '{
    "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
    "tier": "DEFAULT",
    "action": "BOOK_SESSION",
    "rate": 8.0,
    "is_percentage": true
  }'
```

### Headers
```
Content-Type: application/json
X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab
```

### Request Body (Fixed Amount - KES 50 per conversion)
```json
{
  "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
  "tier": "DEFAULT",
  "action": "BORROW_FROM_LIBRARY",
  "rate": 50.0
}
```

### Request Body (Percentage - 5% of transaction)
```json
{
  "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
  "tier": "DEFAULT",
  "action": "PURCHASE",
  "rate": 5.0,
  "is_percentage": true
}
```

**For percentage rates:** The `amount` field in your webhook payload determines the reward (e.g., amount 1500 with rate 5 = KES 75 reward).

---

## Step 5: Track Conversions via Webhook

When a referred user completes a registered action, notify B2H to credit the ambassador and notify the ambassador.

### Notify B2H on Signup

When a user signs up using a referral code, send a webhook to create the referral record immediately.

**For free signup platforms:** Send with `conversion_status: "PENDING"` to track the referral. Send another webhook with `conversion_status: "CONVERTED"` when user completes a paid action.

**For paid subscription platforms:** Send with `conversion_status: "CONVERTED"` directly on signup (payment confirms the conversion immediately). Include the subscription amount.

**Action names:** Use platform-specific names like `SUBSCRIPTION_SIGNUP`, `USER_SIGNUP`, `ACCOUNT_CREATION`, `REGISTRATION`, or any action registered in Step 3.

```json
{
  "referral_code": "AMB123_REF",
  "action": "SUBSCRIPTION_SIGNUP",
  "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
  "conversion_status": "CONVERTED",
  "amount": 5000.00,
  "converted_at": "2026-05-27T10:30:00Z",
  "timestamp": "2026-05-27T10:30:00Z",
  "external_user_id": "user_123",
  "email": "user@example.com",
  "email_verified": true
}
```

### Get Referral Identifier

When a user clicks a B2H referral link, extract the `referral_code` from the URL. B2H provides this in your signup flow.

### Endpoint

All URLs below use `{B2H_BASE}`. Substitute either:
- `https://api.bitshustlehubs.co.ke` (production — external partners using deployed B2H)
- `http://localhost:5000` (local testing — when you run the B2H Flask API locally to test the partner integration)

  ```
  POST {B2H_BASE}/api/webhooks/external-conversion
  ```

**Complete example (BitTutorConnect — user books a KES 2,500 session — production):**
```bash
SIGNATURE=$(echo -n '{"action":"BOOK_SESSION","converted_at":"2026-06-05T06:00:00Z","conversion_status":"CONVERTED","email":"student@example.com","email_verified":true,"external_user_id":"tc_user_456","platform_id":"b552099e-987c-4109-bdc8-8b7600600752","referral_code":"AMB123_REF","timestamp":"2026-06-05T06:00:00Z","amount":2500}' \
  | openssl dgst -sha256 -hmac "your_webhook_secret_here" | awk '{print $NF}')

curl -X POST https://api.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d '{
    "referral_code": "AMB123_REF",
    "action": "BOOK_SESSION",
    "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
    "conversion_status": "CONVERTED",
    "amount": 2500.00,
    "converted_at": "2026-06-05T06:00:00Z",
    "timestamp": "2026-06-05T06:00:00Z",
    "external_user_id": "tc_user_456",
    "email": "student@example.com",
    "email_verified": true
  }'
```

**Complete example (BitTutorConnect — user books a KES 2,500 session — localhost):**
```bash
SIGNATURE=$(echo -n '{"action":"BOOK_SESSION","converted_at":"2026-06-05T06:00:00Z","conversion_status":"CONVERTED","email":"student@example.com","email_verified":true,"external_user_id":"tc_user_456","platform_id":"b552099e-987c-4109-bdc8-8b7600600752","referral_code":"AMB123_REF","timestamp":"2026-06-05T06:00:00Z","amount":2500}' \
  | openssl dgst -sha256 -hmac "your_webhook_secret_here" | awk '{print $NF}')

curl -X POST http://localhost:5000/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d '{
    "referral_code": "AMB123_REF",
    "action": "BOOK_SESSION",
    "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
    "conversion_status": "CONVERTED",
    "amount": 2500.00,
    "converted_at": "2026-06-05T06:00:00Z",
    "timestamp": "2026-06-05T06:00:00Z",
    "external_user_id": "tc_user_456",
    "email": "student@example.com",
    "email_verified": true
  }'
```

### Headers
```
Content-Type: application/json
X-Webhook-Signature: hmac-sha256-signature-here
```

### Request Body
```json
{
  "referral_code": "AMB123_REF",
  "action": "BORROW_FROM_LIBRARY",
  "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
  "conversion_status": "CONVERTED",
  "amount": 300.00,
  "converted_at": "2026-05-27T10:30:00Z",
  "timestamp": "2026-05-27T10:30:00Z"
}
```

### Required Fields
| Field | Description |
|-------|-------------|
| `referral_code` | The referral code from the ambassador (e.g., `AMB123_REF`) |
| `action` | Registered action name (e.g., `SUBSCRIPTION_SIGNUP`, `BORROW_FROM_LIBRARY`). This tracks the specific client step. |
| `platform_id` | Your platform's UUID |
| `conversion_status` | `PENDING` (free signup) or `CONVERTED` (paid action/completed signup) |
| `timestamp` | ISO 8601 UTC timestamp of webhook |
| `external_user_id` | Unique identifier for the user on your platform |
| `email` or `phone` | User contact info (one required) |
| `email_verified` or `phone_verified` | Boolean indicating contact verification |
| `amount` | **Required for CONVERTED status** - transaction/purchase amount |

---

## Signature Verification (Security)

B2H requires HMAC-SHA256 signatures to verify webhook authenticity.

### Shared Secret
Obtain from B2H admin. Stored in your environment as `WEBHOOK_SECRET`.

### Signature Algorithm
```python
import hmac
import hashlib
import json

def sign_payload(payload, secret):
    payload_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    signature = hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature
```

### Timestamp Validation
Include a recent timestamp (within 5 minutes) to prevent replay attacks.

---

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success — conversion processed |
| 400 | Invalid payload (missing fields, bad format) |
| 401 | Invalid signature or authentication |
| 404 | Referral code not found |
| 409 | Already processed (idempotent — safe to retry) |
| 500 | Server error — contact B2H support |

---

## Integration Examples

### BitTutorConnect — Referral Rate Management + Webhook Flow

BitTutorConnect uses the B2H Platform API (key-based auth) to register tutoring actions, set referral rates, and notify B2H of completed sessions.

```python
import requests
import hmac
import hashlib
import json
from datetime import datetime, timezone

B2H_BASE = "https://api.bitshustlehubs.co.ke"  # Production
# B2H_BASE = "http://localhost:5000"            # Local testing
API_KEY = "b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab"  # TutorConnect's key
WEBHOOK_SECRET = "your_webhook_secret_here"           # Provided by B2H admin
PLATFORM_ID = "b552099e-987c-4109-bdc8-8b7600600752"  # TutorConnect UUID


def api_request(method, path, payload=None):
    """Helper for authenticated B2H Platform API calls."""
    headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
    url = f"{B2H_BASE}{path}"
    if method == "GET":
        return requests.get(url, headers=headers, params=payload)
    return requests.request(method, url, headers=headers, json=payload)


# ── Step 1: Register TutorConnect-specific actions ──────────────────────────
def register_tutor_action(name, display_name, description=""):
    resp = api_request("POST", "/api/platform-actions/register", {
        "name": name,
        "display_name": display_name,
        "description": description,
    })
    resp.raise_for_status()
    return resp.json()


register_tutor_action("START_TUTORING_SESSION", "Start Tutoring Session",
                      "User completes their first tutoring session")
register_tutor_action("BOOK_SESSION", "Book a Session",
                      "User books a paid tutoring session")


# ── Step 2: Set referral rates for TutorConnect actions ─────────────────────
# Fixed rate: KES 200 per completed session
rate_resp = api_request("POST", "/api/referral-rates", {
    "platform_id": PLATFORM_ID,
    "tier": "DEFAULT",
    "action": "START_TUTORING_SESSION",
    "rate": 200.0,
    "is_percentage": False,
})
print("Rate set:", rate_resp.json())

# Percentage rate: 8% of session fee goes to ambassador
pct_resp = api_request("POST", "/api/referral-rates", {
    "platform_id": PLATFORM_ID,
    "tier": "DEFAULT",
    "action": "BOOK_SESSION",
    "rate": 8.0,
    "is_percentage": True,
})
print("Percentage rate set:", pct_resp.json())


# ── Step 3: View current rates for TutorConnect ─────────────────────────────
rates_resp = api_request("GET", "/api/referral-rates", {"platform_id": PLATFORM_ID})
print("Current rates:", rates_resp.json())


# ── Step 4: Send conversion webhook when user completes a session ───────────
def sign_payload(payload, secret):
    payload_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    return hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()


def notify_b2h_conversion(referral_code, action, amount=None,
                          conversion_status="CONVERTED", **kwargs):
    payload = {
        "referral_code": referral_code,
        "action": action,
        "platform_id": PLATFORM_ID,
        "conversion_status": conversion_status,
        "converted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    if amount is not None:
        payload["amount"] = amount
    payload.update(kwargs)

    sig = sign_payload(payload, WEBHOOK_SECRET)

    resp = requests.post(
        f"{B2H_BASE}/api/webhooks/external-conversion",
        headers={"X-Webhook-Signature": sig, "Content-Type": "application/json"},
        json=payload,
    )
    resp.raise_for_status()
    return resp.json()


# User books a KES 2,500 tutoring session via ambassador referral
notify_b2h_conversion(
    referral_code="AMB123_REF",
    action="BOOK_SESSION",
    amount=2500.00,                  # triggers 8% = KES 200 reward
    conversion_status="CONVERTED",
    external_user_id="tc_user_456",
    email="student@example.com",
    email_verified=True,
)

# User completes their first free session (fixed KES 200 reward)
notify_b2h_conversion(
    referral_code="AMB123_REF",
    action="START_TUTORING_SESSION",
    conversion_status="CONVERTED",
    external_user_id="tc_user_456",
    email="student@example.com",
    email_verified=True,
)
```

### Node.js (fetch)
```javascript
import fetch from 'node-fetch';
import crypto from 'crypto';

const API_BASE = 'https://api.bitshustlehubs.co.ke/api';  // Production
// const API_BASE = 'http://localhost:5000/api';            // Local testing
const API_KEY = 'b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab';
const WEBHOOK_SECRET = 'your_webhook_secret_here';
const PLATFORM_ID = 'b552099e-987c-4109-bdc8-8b7600600752';

function signPayload(payload) {
  const payloadStr = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payloadStr)
    .digest('hex');
}

async function registerAction(name, displayName, description) {
  const response = await fetch(`${API_BASE}/platform-actions/register`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, display_name: displayName, description }),
  });
  return response.json();
}

async function sendConversionWebhook(referralCode, action, amount = null, conversionStatus = 'CONVERTED', extra = {}) {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const payload = {
    referral_code: referralCode,
    action,
    platform_id: PLATFORM_ID,
    conversion_status: conversionStatus,
    converted_at: now,
    timestamp: now,
    ...(amount && { amount }),
    ...extra,
  };
  const sig = signPayload(payload);
  
  const response = await fetch(`${API_BASE}/webhooks/external-conversion`, {
    method: 'POST',
    headers: {
      'X-Webhook-Signature': sig,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return response.json();
}

// Register all actions that trigger commissions
registerAction('SUBSCRIPTION_SIGNUP', 'Subscription Signup');
registerAction('MAKE_PURCHASE', 'Make Purchase');
registerAction('COMPLETE_COURSE', 'Complete Course');

// Set rates for each action via referral-rates API endpoint
// Fixed: {platform_id, tier: "DEFAULT", action: "action_name", rate: 100.0}
// Percentage: {platform_id, tier: "DEFAULT", action: "action_name", rate: 5.0, is_percentage: true}

// For paid subscription platforms - send CONVERTED directly on signup
sendConversionWebhook('AMB123_REF', 'SUBSCRIPTION_SIGNUP', 5000.00, 'CONVERTED', {
  external_user_id: 'user_123',
  email: 'user@example.com',
  email_verified: true
});

// For free signup platforms - send PENDING on signup, CONVERTED on paid action
sendConversionWebhook('AMB123_REF', 'USER_SIGNUP', null, 'PENDING', {
  external_user_id: 'user_456',
  email: 'freeuser@example.com',
  email_verified: true
});
// Later when user pays:
sendConversionWebhook('AMB123_REF', 'MAKE_PURCHASE', 1500.00);
```

---

## Testing

### Test Webhook Signature

**Production:**
```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test-signature" \
  -d '{"referral_code":"TEST_REF","action":"CONVERSION","platform_id":"test","conversion_status":"CONVERTED","timestamp":"2026-05-27T10:30:00Z"}'
```

**Localhost:**
```bash
curl -X POST http://localhost:5000/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test-signature" \
  -d '{"referral_code":"TEST_REF","action":"CONVERSION","platform_id":"test","conversion_status":"CONVERTED","timestamp":"2026-05-27T10:30:00Z"}'
```

Expected: `401` with `"invalid signature"`

---

## Support

Contact: support@bitshustlehubs.co.ke

Provide:
- Your platform name
- Error message received
- Request/response payloads (redact sensitive data)
