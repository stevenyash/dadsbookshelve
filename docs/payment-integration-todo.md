# Payment Module Integration Todo List

## Created Files

### Backend (API-TS)
- `src/services/payment.service.ts` - Unified payment service with modular support

### Frontend (FRONTEND-RTX)
- `src/hooks/usePaymentModule.ts` - Core reusable payment hook
- `src/hooks/useLibraryPayment.ts` - Library subscription payment hooks
- `src/lib/paymentPlugin.ts` - Plugin system for payment providers

---

## Integration Todo List

### Priority 1: Critical Pages (Need Payment)

| # | Page | Module | File Path | Status |
|---|------|--------|-----------|--------|
| 1 | SubscribePage | library_subscription | `pages/library/SubscribePage.tsx` | Not started |
| 2 | CartPage | book_purchase | `pages/shop/CartPage.tsx` | Not started |
| 3 | BookDetailPage | book_purchase | `pages/shop/BookDetailPage.tsx` | Not started |

### Priority 2: Payment History Pages

| # | Page | Description | Status |
|----|------|-------------|--------|
| 4 | PaymentsPage | User payment history | Not started |
| 5 | admin/PaymentsPage | Admin payment management | Not started |

### Priority 3: Reusable Components

| # | Component | Purpose | Status |
|---|-----------|---------|--------|
| 6 | PaymentModal | Reusable payment dialog | Not started |
| 7 | usePaymentProcessor | Advanced payment composable | Not started |

---

## Usage Examples

### Library Subscription
```typescript
import { useLibraryPayment } from '@/hooks/useLibraryPayment'

function SubscribePage() {
  const { plans, selectedPlan, selectPlan, initiatePayment, status } = useLibraryPayment()
  
  const handlePay = () => initiatePayment({
    phone: '+254...',
    onSuccess: () => router.push('/library'),
    onFailed: (err) => showError(err)
  })
}
```

### Book Purchase
```typescript
import { usePaymentModule, createPaymentModuleHook } from '@/hooks/usePaymentModule'

const useBookPayment = createPaymentModuleHook('book_purchase')

function BookDetailPage() {
  const { initiate, status } = useBookPayment()
  
  const handleBuy = () => initiate({
    amount: book.price,
    metadata: { book_id: book.id }
  })
}
```

### Any Module
```typescript
import { usePaymentModule } from '@/hooks/usePaymentModule'

function CustomPage() {
  const payment = usePaymentModule()
  
  payment.initiate({
    module: 'donation',
    amount: 1000,
    phone: '+254...',
    autoVerify: true,
    onSuccess: () => console.log('Donated!')
  })
}
```

---

## Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/initiate` | Initiate modular payment |
| POST | `/api/payments/verify` | Verify payment status |
| GET | `/api/payments/modules` | Get available modules |

---

## Supported Modules

| Module | Description |
|--------|-------------|
| `library_subscription` | DBS Library subscription |
| `book_purchase` | Individual book purchase |
| `donation` | Donations |
| `membership` | Membership plans |
| `ebook` | E-book purchases |
| `custom` | Custom payments |