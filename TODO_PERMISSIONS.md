# Permission UI Rules - TODO List

## Overview
This document lists all pages in FRONTEND-RTX that do NOT follow the permission UI rules as defined in `dbsrules.md`.

**Rule:** All UI elements and pages must use `usePermissions` hook from `@/hooks/usePermissions` instead of role-based checks (`isSuperAdmin`, `isAdmin`, etc.) or direct authentication checks.

---

## Pages Missing Permission Checks

All pages have been updated to use permission-based checks! 🎉
- **Path:** `FRONTEND-RTX/src/pages/admin/RolesPage.tsx`
- **Issue:** Uses `isSuperAdmin` from `useAuth` (line 233)
- **Fix:** Import and use `usePermissions` hook
- **Required:** `canView('roles')` for page access, `canAdd('roles')`, `canEdit('roles')`, `canDelete('roles')` for actions

### 2. AdminBooksPage.tsx
- **Path:** `FRONTEND-RTX/src/pages/admin/AdminBooksPage.tsx`
- **Issue:** Uses `isAdmin` from `useAuth` (line 52)
- **Fix:** Import and use `usePermissions` hook
- **Required:** `canView('books')` for page access, `canAdd('books')`, `canEdit('books')`, `canDelete('books')` for actions

### 3. OrdersPage.tsx (Admin)
- **Path:** `FRONTEND-RTX/src/pages/admin/OrdersPage.tsx`
- **Issue:** No permission check at all
- **Fix:** Add permission check at page level
- **Required:** `canView('orders')` for page access, `canEdit('orders')` for status update dropdown

### 4. PaymentsPage.tsx (Admin)
- **Path:** `FRONTEND-RTX/src/pages/admin/PaymentsPage.tsx`
- **Issue:** No permission check at all
- **Fix:** Add permission check at page level
- **Required:** `canView('payments')` for page access, `canEdit('payments')` for status update dropdown

### 5. MarketersPage.tsx
- **Path:** `FRONTEND-RTX/src/pages/admin/MarketersPage.tsx`
- **Issue:** Uses `isAdmin` from `useAuth` (line 32)
- **Fix:** Import and use `usePermissions` hook
- **Required:** `canView('marketers')` for page access, `canAdd('marketers')`, `canEdit('marketers')`, `canDelete('marketers')` for actions

### 6. DashboardPage.tsx
- **Path:** `FRONTEND-RTX/src/pages/dashboard/DashboardPage.tsx`
- **Issue:** Uses `isSuperAdmin`, `isAdmin`, `isMarketer`, `isUser` from store (lines 85-88)
- **Fix:** Import and use `usePermissions` hook
- **Required:** 
  - Use `canView('dashboard')` for dashboard access
  - Use `canView('users')`, `canView('books')`, `canView('payments')` for stats
  - Use `canView('marketers')` for marketers section
  - Use `canView('orders')` for orders section
  - Use `canView('settings')` for settings link
  - Use `canView('roles')` for roles/permissions link

### 7. BookShopPage.tsx
- **Path:** `FRONTEND-RTX/src/pages/shop/BookShopPage.tsx`
- **Issue:** Uses `isAuthenticated` from store instead of permission check
- **Fix:** Import and use `usePermissions` hook
- **Required:** `canView('shop')` for page access

### 8. OrdersPage.tsx (User)
- **Path:** `FRONTEND-RTX/src/pages/shop/OrdersPage.tsx`
- **Issue:** Uses `user` from store but doesn't check permission for `user_orders` module
- **Fix:** Import and use `usePermissions` hook
- **Required:** `canView('user_orders')` for page access

### 9. PaymentsPage.tsx (User)
- **Path:** `FRONTEND-RTX/src/pages/shop/PaymentsPage.tsx`
- **Issue:** Uses `user` from store but doesn't check permission for `user_payments` module
- **Fix:** Import and use `usePermissions` hook
- **Required:** `canView('user_payments')` for page access

### 10. CartPage.tsx
- **Path:** `FRONTEND-RTX/src/pages/shop/CartPage.tsx`
- **Issue:** Uses `isAuthenticated` from store but doesn't check permission for `cart` module
- **Fix:** Import and use `usePermissions` hook
- **Required:** `canView('cart')` for page access

### 11. MainLibraryPage.tsx
- **Path:** `FRONTEND-RTX/src/pages/library/MainLibraryPage.tsx`
- **Issue:** Uses `isAuthenticated` from store but doesn't check permission for `library` module
- **Fix:** Import and use `usePermissions` hook
- **Required:** `canView('library')` for page access

### 12. OfflineLibraryPage.tsx
- **Path:** `FRONTEND-RTX/src/pages/library/OfflineLibraryPage.tsx`
- **Issue:** No permission check at all
- **Fix:** Add permission check at page level
- **Required:** `canView('library')` for page access

### 13. HomePage.tsx
- **Path:** `FRONTEND-RTX/src/pages/home/HomePage.tsx`
- **Issue:** No permission check at all
- **Fix:** This is a public page, but links to protected pages should check permissions

### 14. BookReaderPage.tsx
- **Path:** `FRONTEND-RTX/src/pages/library/BookReaderPage.tsx`
- **Issue:** No permission check at all
- **Fix:** Add permission check before loading book
- **Required:** `canView('library')` for reading access

### 15. PermissionsPage.tsx
- **Path:** `FRONTEND-RTX/src/pages/admin/PermissionsPage.tsx`
- **Issue:** Uses `useAuth` but doesn't have page-level access control
- **Fix:** Add permission check for who can access role/user permission pages
- **Required:** `canView('roles')` for role permissions, check for admin access for user permissions

---

## Standard Module Codes to Use

| Module Code | Description |
|-------------|-------------|
| `users` | User management |
| `roles` | Role management |
| `books` | Book management |
| `orders` | Order management (admin) |
| `payments` | Payment management (admin) |
| `marketers` | Marketer management |
| `dashboard` | Dashboard access |
| `library` | Library access |
| `cart` | Shopping cart |
| `user_orders` | User order history |
| `user_payments` | User payment history |
| `shop` | Online shop |
| `settings` | System settings |

---

## How to Fix

### 1. Import the hook
```typescript
import { usePermissions } from '@/hooks/usePermissions'
```

### 2. Destructure permission methods
```typescript
const { canView, canAdd, canEdit, canDelete } = usePermissions()
```

### 3. Add page-level access check
```typescript
if (!canView('module_name')) {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold">Access Denied</h2>
      <p className="opacity-70">You don't have permission to view this page.</p>
    </div>
  )
}
```

### 4. Wrap action buttons with permission checks
```typescript
{canAdd('module_name') && (
  <button>Add New</button>
)}

{canEdit('module_name') && (
  <button>Edit</button>
)}

{canDelete('module_name') && (
  <button>Delete</button>
)}
```

---

# Payment Flow Gaps - M-Pesa & PayPal

## M-Pesa Payment Flow Issues

### Frontend Issues (FRONTEND-RTX)

| # | Issue | Location | Current | Required |
|---|-------|---------|---------|----------|
| 1 | Wrong endpoint for initiation | `mpesaProcessor.ts:8` | `POST /payments/add` | `POST /payments/initiate` |
| 2 | Missing phone parameter | `mpesaProcessor.ts` payload | Not sent | Add `phone` to payload |
| 3 | Missing module parameter | `mpesaProcessor.ts` payload | Not sent | Add `module` to payload |
| 4 | Verify doesn't use real M-Pesa check | `mpesaProcessor.ts:52-91` | `POST /payments/check-status` (local DB only) | Use `POST /payments/verify` |
| 5 | No payment completion trigger | After successful verify | Doesn't call confirm | Call `POST /payments/confirm-payment` |

### Backend Issues (API-TS)

| # | Issue | Location | Current | Required |
|---|-------|---------|---------|----------|
| 1 | Check-status doesn't verify with M-Pesa | `paymentsController.ts:185-241` | Only checks local DB | Call `paymentService.verify()` |
| 2 | STK Callback endpoint missing | - | Not implemented | Create `/payments/stk-callback` |
| 3 | Missing module in verify call | `verify` endpoint | Doesn't pass module | Pass module to `paymentService.verify()` |

---

## PayPal Payment Flow Issues

### Frontend Issues (FRONTEND-RTX)

| # | Issue | Location | Current | Required |
|---|-------|---------|---------|----------|
| 1 | Wrong endpoint for initiation | `paypalProcessor.ts:8` | `POST /payments/add` | `POST /payments/create-paypal` |
| 2 | Missing module parameter | `paypalProcessor.ts` payload | Not sent | Add `module` to payload |
| 3 | Wrong verification URL | `paypalProcessor.ts:32` | `/payments/verify-paypal` | Create endpoint |
| 4 | Capture uses wrong endpoint | `paypalProcessor.ts:90` | `/payments/capture-paypal` | Create endpoint |

### Backend Issues (API-TS)

| # | Issue | Status | Required |
|---|-------|---------|
| 1 | No `/payments/create-paypal` endpoint | Create to create PayPal order |
| 2 | No `/payments/verify-paypal` endpoint | Create to check order status |
| 3 | No `/payments/capture-paypal` endpoint | Create to capture payment |
| 4 | No PayPal service integration | Integrate PayPal REST API |
| 5 | No PayPal credentials/config | Add to environment |

---

## Shared Issues (Both Methods)

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | Module not passed to payment | Processors | Add `module` to all payloads |
| 2 | Payment completion not triggered | Frontend | Call confirm after success |
| 3 | Order creation happens twice | `handlePaymentCompletion` | Fix duplicate calls |

---

## Current Flow (Broken)

```
User → mpesaProcessor.initiate() → /payments/add (WRONG)
     → polling /payments/check-status (NO M-PESA CHECK)
     → success → NO ORDER CREATED
```

## Required Flow (Fixed)

```
User → mpesaProcessor.initiate() → /payments/initiate + module + phone
     → polling /payments/verify + module (CALLS MPESA STK QUERY)
     → success → /payments/confirm-payment + module
     → order created
```

---

## Implementation Priority

### Phase 1: Fix M-Pesa (Critical)

1. Update `mpesaProcessor.ts` to use `/payments/initiate` with `module` + `phone`
2. Update `/payments/check-status` to call `paymentService.verify()`
3. Add `/payments/stk-callback` endpoint (optional - M-Pesa calls this)
4. Frontend calls `/payments/confirm-payment` after success

### Phase 2: Implement PayPal ✅ (COMPLETED)

1. ✅ PayPal service created - `API-TS/src/services/paypal.service.ts`
2. ✅ Create PayPal endpoint - `POST /payments/create-paypal`
3. ✅ Verify PayPal endpoint - `GET /payments/verify-paypal/:orderId`
4. ✅ Capture PayPal endpoint - `POST /payments/capture-paypal`
5. ✅ PayPal hook created - `FRONTEND-RTX/src/hooks/usePayPalPayment.ts`
6. ✅ PayPal button component - `FRONTEND-RTX/src/components/PayPalButton.tsx`

**Environment Variables Required:**
```
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_MODE=sandbox  # or 'live'
```

### Phase 3: Complete Payment Flow

1. Frontend triggers order creation after payment success
2. Handle payment completion for all modules
3. Send confirmation emails

---

## Payment Module Reusability (EXISTING - Good)

### Already Reusable ✅

| Component | File | Purpose |
|-----------|------|---------|
| `usePaymentModule()` | `hooks/usePaymentModule.ts` | Main reusable hook |
| `createPaymentModuleHook(defaultModule)` | `hooks/usePaymentModule.ts` | Factory for pre-configured hooks |
| `paymentModuleApi` | `lib/api.ts` | Direct API calls to `/payments/initiate` + `/payments/verify` |
| `PaymentModule` type | `hooks/usePaymentModule.ts` | Union type for modules |

### Supported Modules

```typescript
type PaymentModule = 
  | 'library_subscription' 
  | 'book_purchase' 
  | 'donation' 
  | 'membership'
  | 'ebook'
  | 'custom'
```

### Usage Pattern

```typescript
const payment = usePaymentModule()

await payment.initiate({
  module: 'library_subscription',
  amount: 1500,
  phone: '254768374497',
  metadata: { access_id: '5' },
  onSuccess: (result) => { /* handle success */ },
  onFailed: (error) => { /* handle error */ },
})
```

### Current Usage Inconsistency

| Place | Hook Used | Should Use |
|-------|----------|------------|
| CartPage | `usePayment` (old) | `usePaymentModule` |
| EbookUploadPage | `usePaymentModal` | `usePaymentModule` |
| usePaymentModule | Direct | ✅ Already correct |
| usePaymentFlow | paymentStore | `usePaymentModule` |

### Phase 3b: Standardize on usePaymentModule

1. ✅ **Keep** `usePaymentModule` hook - working correctly
2. ✅ **Keep** `paymentModuleApi` - uses correct endpoints
3. **Migrate** CartPage to use `usePaymentModule`
4. **Migrate** other payment hooks to use `paymentModuleApi`
5. **Remove** duplicate payment attempts when standardized

---

## Pages That Already Follow the Rules

- **UsersPage.tsx** - ✅ Uses `canView`, `canAdd`, `canEdit`, `canDelete` from `usePermissions`