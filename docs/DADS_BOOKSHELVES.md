# Dad's BookShelves Integration Guide

> **Credentials**
> - API Key: `b2h_50556e66-7f15-40bd-b0ef-842f776c6966`
> - Platform UUID: `3ee6c447-128f-46fa-b248-7f7e90d59d38`
> - Webhook Secret: `whsec_test_dads_bookshelves_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567bcd`

## Platform-Specific Actions

Register these actions for library borrowing commissions:

| Action | Display Name | Description |
|--------|--------------|-------------|
| `BORROW_FROM_LIBRARY` | Borrow from Library | User borrows a book from the library |
| `PURCHASE_BOOK` | Purchase Book | User purchases a book from the store |

## Registration Examples

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/platform-actions/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_50556e66-7f15-40bd-b0ef-842f776c6966" \
  -d '{
    "name": "BORROW_FROM_LIBRARY",
    "display_name": "Borrow from Library",
    "description": "User borrows a book from the library"
  }'
```

## Referral Rate Examples

Fixed rate (KES 50 per borrow):
```json
{
  "platform_id": "3ee6c447-128f-46fa-b248-7f7e90d59d38",
  "tier": "DEFAULT",
  "action": "BORROW_FROM_LIBRARY",
  "rate": 50.0,
  "is_percentage": false
}
```

Percentage rate (5% of purchase):
```json
{
  "platform_id": "3ee6c447-128f-46fa-b248-7f7e90d59d38",
  "tier": "DEFAULT",
  "action": "PURCHASE_BOOK",
  "rate": 5.0,
  "is_percentage": true
}
```

## Webhook Examples

User borrows a book (fixed KES 50 reward):
```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d '{
    "referral_code": "AMB123_REF",
    "action": "BORROW_FROM_LIBRARY",
    "platform_id": "3ee6c447-128f-46fa-b248-7f7e90d59d38",
    "conversion_status": "CONVERTED",
    "converted_at": "2026-06-05T06:00:00Z",
    "timestamp": "2026-06-05T06:00:00Z",
    "external_user_id": "db_user_789",
    "email": "reader@example.com",
    "email_verified": true
  }'
```

## Python Implementation

```python
import requests
import hmac
import hashlib
import json
from datetime import datetime, timezone

B2H_BASE = "https://api.bitshustlehubs.co.ke"
API_KEY = "b2h_50556e66-7f15-40bd-b0ef-842f776c6966"
WEBHOOK_SECRET = "whsec_test_dads_bookshelves_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567bcd"
PLATFORM_ID = "3ee6c447-128f-46fa-b248-7f7e90d59d38"

def sign_payload(payload, secret):
    payload_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    return hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def notify_b2h_borrow(referral_code, user_id, email, **kwargs):
    payload = {
        "referral_code": referral_code,
        "action": "BORROW_FROM_LIBRARY",
        "platform_id": PLATFORM_ID,
        "conversion_status": "CONVERTED",
        "converted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "external_user_id": user_id,
        "email": email,
        "email_verified": True,
    }
    payload.update(kwargs)

    sig = sign_payload(payload, WEBHOOK_SECRET)
    resp = requests.post(
        f"{B2H_BASE}/api/webhooks/external-conversion",
        headers={"X-Webhook-Signature": sig, "Content-Type": "application/json"},
        json=payload,
    )
    return resp.json()
```

---

## Lost Webhook Secret Recovery

If you lose your webhook secret, **contact your B2H admin immediately**. The admin will:
1. Navigate to the B2H admin dashboard
2. Go to **Platform Integrations** → Select Dad's BookShelves
3. Click **Regenerate Webhook Secret**
4. Copy the new secret (shown once) and share it securely with your team

> ⚠️ The old secret becomes invalid immediately after regeneration. Update all webhook signing code to use the new secret.