# Paralee Platform Integration Specification

# ==========================================

# Technical specification for integrating external platforms

# with the Paralee marketer dashboard

## Overview

Other platforms need to expose their marketers and commission data so they can be aggregated into a single "Paralee" dashboard where marketers manage all their affiliate activities from one source.

---

## 1. Database Schema (Prisma) - Required Tables

Each platform must have these tables (or equivalent):

```prisma
// MARKETER - Affiliate partner profile
model Marketer {
  id            Int      @id @default(autoincrement())
  userId        Int      @unique  // Link to User
  referralCode  String   @unique  // e.g., "MARKETER123"
  isActive      Boolean  @default(true)
  mpesaPhone    String?  // M-Pesa for payouts

  // Financials
  totalEarnings    Decimal @default(0) @db.Decimal(10, 2)
  pendingPayout    Decimal @default(0) @db.Decimal(10, 2)
  totalPaid        Decimal @default(0) @db.Decimal(10, 2)

  // Stats
  totalReferrals         Int @default(0)
  successfulReferrals    Int @default(0)
  conversionRate        Decimal @default(0) @db.Decimal(5, 2)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("marketers")
}

// COMMISSION - Earnings tracking
model Commission {
  id          Int      @id @default(autoincrement())
  marketerId Int
  type        String   // "SERVICE_SIGNUP", "URGENT_NEED", "HOOK_COMPLETION", etc.
  amount     Decimal  @db.Decimal(10, 2)
  percentage Decimal  @db.Decimal(5, 2)
  saleAmount Decimal  @db.Decimal(10, 2)
  status     String   @default("pending") // pending, approved, paid, cancelled

  referenceType String? // "hook", "urgently_needed", "vendor_service"
  referenceId   Int?

  createdAt DateTime @default(now())
  @@index([marketerId])
  @@index([status])
  @@map("commissions")
}

// COMMISSION_RATE - Global rates (defaults)
model CommissionRate {
  id          Int     @id @default(autoincrement())
  serviceType String  @unique // "vendor_service_signup", "urgently_needed", etc.
  name        String
  percentage  Decimal @db.Decimal(5, 2)
  flatFee     Decimal @default(0) @db.Decimal(10, 2)
  isActive    Boolean @default(true)
  @@map("commission_rates")
}

// MARKETER_COMMISSION_RATE - Per-marketer custom rates
model MarketerCommissionRate {
  id          Int     @id @default(autoincrement())
  marketerId  Int
  serviceType String
  percentage  Decimal @db.Decimal(5, 2)
  flatFee     Decimal @default(0)
  isActive    Boolean @default(true)

  @@unique([marketerId, serviceType])
  @@map("marketer_commission_rates")
}

// PAYOUT_REQUEST - Payout tracking
model PayoutRequest {
  id        Int      @id @default(autoincrement())
  marketerId Int
  amount    Decimal  @db.Decimal(10, 2)
  method    String   @default("mpesa")
  status    String   @default("pending") // pending, processing, completed, rejected

  mpesaPhone String?
  transactionId String?

  createdAt DateTime @default(now())
  @@index([marketerId])
  @@map("payout_requests")
}

// AFFILIATE_REFERRAL - Click/conversion tracking
model AffiliateReferral {
  id              Int      @id @default(autoincrement())
  marketerId      Int
  referralCode    String
  isConverted     Boolean @default(false)
  convertedAt     DateTime?
  conversionType  String? // "vendor_service", "urgently_needed", "hook"
  conversionId    Int?

  clickedAt DateTime @default(now())
  @@index([marketerId])
  @@index([referralCode])
  @@map("affiliate_referrals")
}
```

---

## 2. External API Endpoints

This platform exposes the following endpoints for Paralee integration under `/api/external/`:

### Authentication

| Endpoint                   | Method | Auth    | Purpose                |
| -------------------------- | ------ | ------- | ---------------------- |
| `/api/external/auth/login` | POST   | API Key | Get JWT token for user |

### Marketers

| Endpoint                                  | Method | Auth    | Purpose             |
| ----------------------------------------- | ------ | ------- | ------------------- |
| `/api/external/marketers`                 | GET    | API Key | List all marketers  |
| `/api/external/marketers/:id`             | GET    | API Key | Get single marketer |
| `/api/external/marketers/:id/commissions` | GET    | API Key | Get commissions     |
| `/api/external/marketers/:id/payouts`     | GET    | API Key | Get payout history  |

### Commission Rates

| Endpoint                         | Method | Auth    | Purpose          |
| -------------------------------- | ------ | ------- | ---------------- |
| `/api/external/commission-rates` | GET    | API Key | Get global rates |

---

## 3. Authentication

All external APIs use **API Key authentication** via the `x-api-key` header.

### Request Format

```http
GET /api/external/marketers HTTP/1.1
Host: your-domain.com
x-api-key: paralee-integration-key-2026
Content-Type: application/json
```

### Environment Variable

Set `PARALEE_API_KEY` in your environment to secure the API key.

### Login Endpoint Returns JWT

```json
{
	"success": true,
	"message": "Login successful",
	"data": {
		"token": "eyJhbGciOiJIUzI1NiIs...",
		"expiresIn": "7d",
		"user": {
			"id": 1,
			"email": "marketer@example.com",
			"firstName": "John",
			"lastName": "Doe",
			"role": "Marketer",
			"isMarketer": true,
			"marketerId": 5
		}
	}
}
```

---

## 4. API Response Formats

### GET /api/external/marketers

```json
{
	"success": true,
	"data": [
		{
			"id": 1,
			"referralCode": "MARKETER123",
			"isActive": true,
			"mpesaPhone": "+2547...",
			"totalEarnings": 1500.0,
			"pendingPayout": 500.0,
			"totalPaid": 1000.0,
			"totalReferrals": 25,
			"successfulReferrals": 10,
			"conversionRate": 40.0,
			"user": {
				"id": 1,
				"email": "marketer@example.com",
				"firstName": "John",
				"lastName": "Doe",
				"phone": "+2547...",
				"avatar": null,
				"createdAt": "2025-01-15T10:00:00Z"
			},
			"createdAt": "2025-01-15T10:00:00Z",
			"updatedAt": "2025-04-01T12:00:00Z"
		}
	],
	"pagination": {
		"page": 1,
		"limit": 50,
		"total": 100,
		"totalPages": 2
	}
}
```

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)
- `isActive` - Filter by active status (true/false)

---

### GET /api/external/marketers/:id

```json
{
	"success": true,
	"data": {
		"id": 1,
		"referralCode": "MARKETER123",
		"isActive": true,
		"mpesaPhone": "+2547...",
		"totalEarnings": 1500.0,
		"pendingPayout": 500.0,
		"totalPaid": 1000.0,
		"totalReferrals": 25,
		"successfulReferrals": 10,
		"conversionRate": 40.0,
		"user": {
			"id": 1,
			"email": "marketer@example.com",
			"firstName": "John",
			"lastName": "Doe",
			"phone": "+2547...",
			"avatar": null,
			"createdAt": "2025-01-15T10:00:00Z"
		},
		"customRates": [
			{
				"serviceType": "vendor_service_signup",
				"percentage": 15.0,
				"flatFee": 0,
				"isActive": true
			}
		],
		"createdAt": "2025-01-15T10:00:00Z",
		"updatedAt": "2025-04-01T12:00:00Z"
	}
}
```

---

### GET /api/external/marketers/:id/commissions

```json
{
	"success": true,
	"data": [
		{
			"id": 1,
			"type": "SERVICE_SIGNUP",
			"amount": 100.0,
			"percentage": 10.0,
			"saleAmount": 1000.0,
			"status": "pending",
			"referenceType": "vendor_service",
			"referenceId": 123,
			"createdAt": "2025-01-20T10:00:00Z",
			"approvedAt": null,
			"paidAt": null
		}
	],
	"pagination": {
		"page": 1,
		"limit": 20,
		"total": 25,
		"totalPages": 2
	}
}
```

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `status` - Filter by status (pending, approved, paid, cancelled)
- `type` - Filter by commission type

---

### GET /api/external/marketers/:id/payouts

```json
{
	"success": true,
	"data": [
		{
			"id": 1,
			"amount": 500.0,
			"method": "mpesa",
			"status": "completed",
			"mpesaPhone": "+2547...",
			"bankAccountName": null,
			"bankAccountNumber": null,
			"bankName": null,
			"transactionId": "MX123456789",
			"rejectionReason": null,
			"createdAt": "2025-04-01T10:00:00Z",
			"processedAt": "2025-04-02T14:00:00Z",
			"completedAt": "2025-04-02T14:30:00Z"
		}
	],
	"pagination": {
		"page": 1,
		"limit": 20,
		"total": 10,
		"totalPages": 1
	}
}
```

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `status` - Filter by status (pending, processing, completed, rejected)

---

### GET /api/external/commission-rates

```json
{
	"success": true,
	"data": [
		{
			"serviceType": "vendor_service_signup",
			"name": "Vendor Service Signup",
			"percentage": 10.0,
			"flatFee": 0,
			"minAmount": 0,
			"maxAmount": 999999,
			"isActive": true,
			"description": "Commission for new vendor registrations"
		},
		{
			"serviceType": "urgently_needed",
			"name": "Urgent Need Request",
			"percentage": 15.0,
			"flatFee": 50.0,
			"minAmount": 0,
			"maxAmount": 999999,
			"isActive": true,
			"description": "Commission for urgent service requests"
		}
	]
}
```

**Query Parameters:**

- `type` - Filter by type: 'global' or 'marketer'
- `marketerId` - Required when type=marketer

---

## 5. Error Responses

All endpoints return consistent error format:

```json
{
	"success": false,
	"error": "Invalid API key",
	"code": "INVALID_API_KEY"
}
```

### Error Codes

| Code                | HTTP Status | Description                   |
| ------------------- | ----------- | ----------------------------- |
| INVALID_API_KEY     | 401         | API key is missing or invalid |
| INVALID_CREDENTIALS | 401         | Login credentials are wrong   |
| MISSING_CREDENTIALS | 400         | Required fields missing       |
| INVALID_ID          | 400         | Invalid ID parameter          |
| NOT_FOUND           | 404         | Resource not found            |
| SERVER_ERROR        | 500         | Internal server error         |

---

## 6. CORS Configuration

External APIs support Cross-Origin Resource Sharing (CORS):

- `Access-Control-Allow-Origin: *` (or specific domain)
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Max-Age: 86400`

---

## 7. Sample Integration Code

### JavaScript/Node.js

```javascript
const API_BASE = 'https://your-domain.com/api/external';
const API_KEY = 'paralee-integration-key-2026';

const headers = {
	'Content-Type': 'application/json',
	'x-api-key': API_KEY
};

// Get all marketers
async function getMarketers(page = 1, limit = 50) {
	const response = await fetch(`${API_BASE}/marketers?page=${page}&limit=${limit}`, { headers });
	return response.json();
}

// Get single marketer with commissions
async function getMarketerDetails(marketerId) {
	const [marketer, commissions, payouts] = await Promise.all([
		fetch(`${API_BASE}/marketers/${marketerId}`, { headers }),
		fetch(`${API_BASE}/marketers/${marketerId}/commissions`, { headers }),
		fetch(`${API_BASE}/marketers/${marketerId}/payouts`, { headers })
	]);

	return {
		marketer: await marketer.json(),
		commissions: await commissions.json(),
		payouts: await payouts.json()
	};
}

// Login and get JWT token
async function login(identifier, password) {
	const response = await fetch(`${API_BASE}/auth/login`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ identifier, password })
	});
	return response.json();
}
```

### Python

```python
import requests

API_BASE = 'https://your-domain.com/api/external'
API_KEY = 'paralee-integration-key-2026'

headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY
}

def get_marketers(page=1, limit=50):
    response = requests.get(
        f'{API_BASE}/marketers',
        params={'page': page, 'limit': limit},
        headers=headers
    )
    return response.json()

def get_marketer_details(marketer_id):
    marketer = requests.get(f'{API_BASE}/marketers/{marketer_id}', headers=headers)
    commissions = requests.get(f'{API_BASE}/marketers/{marketer_id}/commissions', headers=headers)
    payouts = requests.get(f'{API_BASE}/marketers/{marketer_id}/payouts', headers=headers)

    return {
        'marketer': marketer.json(),
        'commissions': commissions.json(),
        'payouts': payouts.json()
    }
```

---

## 8. Platform Configuration

For Paralee to connect to your platform, provide:

```json
{
	"name": "Your Platform Name",
	"baseUrl": "https://your-domain.com",
	"apiKey": "paralee-integration-key-2026",
	"endpoints": {
		"marketers": "/api/external/marketers",
		"login": "/api/external/auth/login"
	}
}
```

---

## 9. Integration Checklist

- [x] API Key authentication (`x-api-key` header)
- [x] CORS support for cross-origin requests
- [x] Pagination on all list endpoints
- [x] Consistent JSON response format
- [x] Error codes and messages
- [x] JWT token generation on login

---

## 10. Security Considerations

1. **API Key** - Store securely in environment variables
2. **JWT Secret** - Use strong secret and rotate periodically
3. **Rate Limiting** - Implement request rate limits
4. **HTTPS** - Always use HTTPS in production
5. **IP Whitelist** - Optionally restrict by IP address

---

## 11. Environment Variables

Required for production:

```env
# API Key for external integrations
PARALEE_API_KEY=your-secure-api-key

# JWT secret for token generation
JWT_SECRET=your-jwt-secret-min-32-chars

# Database connection
DATABASE_URL=mysql://user:pass@host:3306/db
```

---

Last Updated: 2026-04-08

---

## 12. SMS API (External)

Send SMS notifications to users via external API.

### POST /api/external/sms

**Headers:**

```
x-api-key: paralee-integration-key-2026
Content-Type: application/json
```

**Request Body:**

```json
{
	"phoneNumber": "+254712345678",
	"message": "Your custom message",
	"type": "custom"
}
```

**Or use predefined types:**

```json
{
	"phoneNumber": "+254712345678",
	"type": "marketer_welcome",
	"firstName": "John",
	"referralCode": "MARKETER123"
}
```

```json
{
	"phoneNumber": "+254712345678",
	"type": "commission",
	"firstName": "John",
	"amount": 100.0,
	"commissionType": "SERVICE_SIGNUP"
}
```

```json
{
	"phoneNumber": "+254712345678",
	"type": "payout",
	"firstName": "John",
	"amount": 500.0,
	"transactionId": "MX123456"
}
```

**Supported Types:**

- `marketer_welcome` - Welcome message for new marketers
- `commission` - Commission earned notification
- `payout` - Payout processed notification
- `custom` - Send any custom message

**Response:**

```json
{
	"success": true,
	"message": "SMS sent successfully",
	"phoneNumber": "254712345678"
}
```

---

## 13. Email API (External)

Send email notifications to users via external API.

### POST /api/external/email

**Headers:**

```
x-api-key: paralee-integration-key-2026
Content-Type: application/json
```

**Request Body:**

```json
{
	"to": "user@example.com",
	"type": "marketer_welcome",
	"data": {
		"firstName": "John",
		"referralCode": "MARKETER123"
	}
}
```

**Supported Types:**

- `marketer_welcome` - Welcome email for new marketers
- `welcome` - General welcome email
- `hook_notification` - New hook request notification
- `payment_confirmation` - Payment confirmation
- `custom` - Custom email with subject and HTML

**Response:**

```json
{
	"success": true,
	"message": "Email sent successfully"
}
```

---

## 14. Admin Marketers API (Internal)

Admin endpoints for managing marketers and sending notifications.

### GET /api/admin/marketers

List all marketers with pagination and filters.

**Auth:** Admin/Staff role required (JWT cookie)

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `isActive` - Filter by status (true/false)
- `search` - Search by name, email, phone

### POST /api/admin/marketers

Create marketers or send notifications.

**Actions:**

1. **Create from existing user:**

```json
{
	"action": "create_from_user",
	"userId": 123,
	"mpesaPhone": "+254712345678"
}
```

2. **Send welcome notification:**

```json
{
	"action": "send_welcome",
	"marketerId": 5
}
```

3. **Send custom SMS:**

```json
{
	"action": "send_sms",
	"marketerId": 5,
	"message": "Your custom message"
}
```

4. **Send custom email:**

```json
{
	"action": "send_email",
	"marketerId": 5,
	"subject": "Subject",
	"htmlContent": "<p>HTML content</p>"
}
```

5. **Create new marketer with all details:**

```json
{
	"action": "create_new",
	"firstName": "John",
	"lastName": "Doe",
	"email": "john@example.com",
	"phone": "+254712345678",
	"mpesaPhone": "+254712345678"
}
```

**Response:**

```json
{
	"success": true,
	"message": "Marketer created successfully. Login credentials sent.",
	"marketer": {
		"id": 5,
		"referralCode": "LPABCD12",
		"user": {
			"id": 123,
			"email": "john@example.com",
			"firstName": "John",
			"lastName": "Doe"
		}
	},
	"tempPassword": "Ab3dEfG2"
}
```

6. **Bulk create marketers:**

```json
{
	"action": "bulk_create",
	"marketers": [
		{
			"firstName": "John",
			"lastName": "Doe",
			"email": "john@example.com",
			"phone": "+254712345678"
		},
		{ "firstName": "Jane", "email": "jane@example.com" }
	]
}
```

**Response:**

```json
{
	"success": true,
	"message": "Created 2/2",
	"results": [
		{ "email": "john@example.com", "success": true, "tempPassword": "Ab3dEfG2" },
		{ "email": "jane@example.com", "success": true, "tempPassword": "Xy9zWv8U" }
	],
	"summary": { "total": 2, "success": 2, "failed": 0 }
}
```

---

## 15. External Admin Marketers API

External API for Paralee to manage marketers with API key authentication.

### Base URL

`/api/external/admin/marketers`

### Authentication

- Header: `x-api-key: paralee-integration-key-2026`

### GET /api/external/admin/marketers

List all marketers with pagination.

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)
- `isActive` - Filter by status (true/false)
- `search` - Search by name or email

**Response:**

```json
{
	"success": true,
	"data": [
		{
			"id": 5,
			"referralCode": "LPABCD12",
			"isActive": true,
			"totalEarnings": 1500.0,
			"user": {
				"id": 123,
				"email": "john@example.com",
				"firstName": "John",
				"lastName": "Doe",
				"phone": "+254712345678"
			}
		}
	],
	"pagination": { "page": 1, "limit": 50, "total": 100, "totalPages": 2 }
}
```

### POST /api/external/admin/marketers

Create single or bulk marketers, or send notifications.

**Actions:**

1. **Create single marketer:**

```json
{
	"firstName": "John",
	"lastName": "Doe",
	"email": "john@example.com",
	"phone": "+254712345678",
	"mpesaPhone": "+254712345678"
}
```

2. **Bulk create:**

```json
{
	"action": "bulk_create",
	"marketers": [
		{ "firstName": "John", "email": "john@example.com" },
		{ "firstName": "Jane", "email": "jane@example.com" }
	]
}
```

3. **Resend welcome notification:**

```json
{
	"action": "send_welcome",
	"marketerId": 5
}
```

- Resets password and sends new credentials via email/SMS

4. **Send custom SMS:**

```json
{
	"action": "send_sms",
	"marketerId": 5,
	"message": "Your custom message"
}
```

5. **Send custom email:**

```json
{
	"action": "send_email",
	"marketerId": 5,
	"subject": "Subject",
	"htmlContent": "<p>Your message</p>"
}
```

**Bulk Create:**

```json
{
	"action": "bulk_create",
	"marketers": [
		{ "firstName": "John", "email": "john@example.com" },
		{ "firstName": "Jane", "email": "jane@example.com" }
	]
}
```

**Response (single):**

```json
{
	"success": true,
	"message": "Marketer created",
	"data": {
		"id": 5,
		"referralCode": "LPABCD12",
		"user": { "id": 123, "email": "john@example.com", "firstName": "John" },
		"tempPassword": "Ab3dEfG2"
	}
}
```

**Response (bulk):**

```json
{
	"success": true,
	"message": "Created 2/2",
	"results": [
		{ "email": "john@example.com", "success": true, "tempPassword": "Ab3dEfG2" },
		{ "email": "jane@example.com", "success": true, "tempPassword": "Xy9zWv8U" }
	],
	"summary": { "total": 2, "success": 2, "failed": 0 }
}
```

**Notes:**

- Temporary password is only shown once in response - store securely
- Welcome email and SMS with credentials are sent automatically
- Max 100 marketers per bulk request

---

## 16. Security Notes

### Environment Variables Required

```env
PARALEE_API_KEY=paralee-integration-key-2026
JWT_SECRET=your-jwt-secret-min-32-chars
MOBILESASA_TOKEN=your-mobilesasa-token
EMAIL_USERNAME=noreply@linkpalbits.co.ke
EMAIL_PASSWORD=your-email-password
```

### Password Security

- Temporary passwords are auto-generated (8 characters)
- Marketers should change password after first login
- Passwords are hashed using scrypt before storage

### API Rate Limiting

- Recommended: 100 requests per minute per API key
- Bulk operations: max 100 items per request
