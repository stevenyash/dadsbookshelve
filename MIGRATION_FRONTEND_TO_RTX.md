# Migration Status: FRONTEND → FRONTEND-RTX

**Date:** 2026-04-12  
**Status:** IN PROGRESS - MAJOR GAPS IDENTIFIED

---

## EXECUTIVE SUMMARY

| Category | FRONTEND | FRONTEND-RTX | Gap |
|----------|----------|--------------|-----|
| Pages | 58 | 9 | **85% missing** |
| Composables/Hooks | 23 | 1 | **96% missing** |
| Services | 9 | 0 | **100% missing** |
| Stores | 16 | 1 | **94% missing** |
| Payment Processors | 3 (Mpesa, Paypal, custom) | 0 | **100% missing** |
| API Controllers | 45+ | 0 services dir | **Business logic not exposed** |

---

## 1. PAGES MIGRATION

### ✅ Migrated (9 pages)
```
FRONTEND-RTX/src/pages/
├── admin/        (AdminBooksPage, MarketersPage, UsersPage)
├── auth/         (login, register - basic)
├── custom/
├── dashboard/
├── ebook/
├── home/
├── library/      (LibraryPage, MainLibraryPage, OfflineLibraryPage, SubscribePage)
├── shop/         (BookShopPage)
└── stories/
```

### ❌ NOT Migrated (49 pages from FRONTEND)

#### Core Business Pages
| Module | Pages | Status |
|--------|-------|--------|
| **orders** | list, view, add, edit, detail-pages | ❌ Missing |
| **payments** | list, view, add, edit, capture_order, create_order, promptstk, propmtstk, stkcallback | ❌ **Payment Flow Missing** |
| **cartitems** | list, view, add, additem, edit, CartCheckout | ❌ **Cart Flow Missing** |
| **ebookpayments** | list, view, add, edit, EbookPaymentsAdd, capture_order, callback, checkstatus | ❌ Missing |
| **publisherpayments** | list, view, add, edit | ❌ Missing |
| **dslibrarypayments** | list, view, add, edit | ❌ Missing |

#### User Management
| Module | Pages | Status |
|--------|-------|--------|
| **account** | all pages | ❌ Missing |
| **clients** | list, view, add, edit | ❌ Missing |
| **users** | list, view, add, edit | ❌ Missing |
| **marketers** | list, view, add, edit, profile, wallet, admin-withdrawals | ❌ Missing |
| **membership** | list, view, add, edit, subscription | ❌ Missing |

#### Content & Catalog
| Module | Pages | Status |
|--------|-------|--------|
| **books** | list, view, add, edit | ❌ Missing |
| **authors** | list, view, add, edit | ❌ Missing |
| **publishers** | list, view, add, edit | ❌ Missing |
| **genres** | list, view, add, edit | ❌ Missing |
| **featuredbooks** | list, view, add, edit | ❌ Missing |
| **salesbooks** | list, view, add, edit | ❌ Missing |
| **publishingbooks** | list, view, add, edit | ❌ Missing |

#### Library System
| Module | Pages | Status |
|--------|-------|--------|
| **librarybooks** | list, view, add, edit | ❌ Missing |
| **libraryaccess** | list, view, add, edit | ❌ Missing |
| **readinghistory** | list, view, add | ❌ Missing |

#### Admin & Settings
| Module | Pages | Status |
|--------|-------|--------|
| **settings** | all pages | ❌ Missing |
| **inventory** | list, view, add, edit | ❌ Missing |
| **permissions** | list, view, add, edit | ❌ Missing |
| **roles** | list, view, add, edit | ❌ Missing |
| **pricelist** | list, view, add, edit | ❌ Missing |
| **feesetting** | list, view, add, edit | ❌ Missing |
| **publishingfee** | list, view, add, edit | ❌ Missing |
| **ebookpricing** | list, view, add, edit | ❌ Missing |

#### Marketing & Referrals
| Module | Pages | Status |
|--------|-------|--------|
| **affiliatelinks** | list, view, add, edit | ❌ Missing |
| **referrals** | list, view, add, edit | ❌ Missing |
| **newsletter** | list, view, add | ❌ Missing |
| **sliders** | list, view, add, edit | ❌ Missing |
| **currentsliders** | list, view, add, edit | ❌ Missing |
| **campaigns** | list, view, add, edit | ❌ Missing |

#### Financial & Reports
| Module | Pages | Status |
|--------|-------|--------|
| **incomereports** | list, view | ❌ Missing |
| **salesreports** | list, view | ❌ Missing |
| **ebookuploader** | all pages | ❌ Missing |

---

## 2. BUSINESS LOGIC & SERVICES (CRITICAL GAPS)

### ❌ FRONTEND Services (9) - NOT Migrated
```
FRONTEND/src/services/
├── api.js                      ❌
├── countries.js                ❌
├── epubDecryptionService.js   ❌
├── i18n.js                     ❌
├── libraryService.js           ❌
├── onlineSecurityService.js    ❌
├── onlinelibraryService.js     ❌
├── storage.js                  ❌
└── validators.js               ❌
```

### ❌ FRONTEND Composables (23) - NOT Migrated
```
FRONTEND/src/composables/
├── addpage.js                  ❌
├── app.js                      ❌ (critical - navigation, dialogs, notifications)
├── auth.js                     ❌ (critical - authentication)
├── editpage.js                 ❌
├── fileProcessing.js           ❌
├── formpage.js                 ❌
├── listpage.js                 ❌
├── navigation.js               ❌
├── readingMode.js              ❌
├── security.js                 ❌
├── theme.js                    ❌
├── useEbookReader.js           ❌ (ebook reader logic)
├── useEpubDecryption.js        ❌
├── useEpubParser.js            ❌
├── useEpubProcessor.js         ❌
├── useEpubReader.js            ❌
├── useEpubRenderer.js           ❌
├── useFileProcessing.js        ❌
└── viewpage.js                 ❌
```

### ❌ FRONTEND Stores (16) - NOT Migrated
```
FRONTEND/src/stores/
├── app.js                      ❌ (critical - app state)
├── auth.js                     ❌ (critical - auth state)
├── bookCart.js                 ❌ (cart management)
├── bookLoaderStore.js          ❌
├── connectionStore.js          ❌
├── contentStore.js            ❌
├── epubReaderStore.js         ❌ (ebook reader state)
├── libraryStore.js            ❌
├── offlineLibraryStore.js     ❌
├── page.js                    ❌
├── paymentStore.js            ❌ (CRITICAL - payment flow)
├── platformModeStore.js       ❌
├── reader.js                  ❌
├── readerUIStore.js           ❌
└── subscription.js           ❌
```

---

## 3. PAYMENT FLOW (CRITICAL - 100% MISSING)

### FRONTEND Payment Implementation

**Payment Processors:**
```
FRONTEND/src/stores/paymentProcessors/
├── index.js
├── mpesaProcessor.js    ❌ (M-Pesa integration)
└── paypalProcessor.js   ❌ (PayPal integration)
```

**Payment Pages:**
```
FRONTEND/src/pages/payments/
├── capture_order.vue    ❌
├── create_order.vue     ❌
├── promptstk.vue        ❌
├── propmtstk.vue        ❌
└── stkcallback.vue      ❌

FRONTEND/src/pages/ebookpayments/
├── capture_order.vue    ❌
├── callback.vue         ❌
├── checkstatus.vue      ❌
└── EbookPaymentsAdd.vue ❌
```

**Payment Components:**
```
FRONTEND/src/components/payment/
├── PaymentBase.vue      ❌
├── MpesaPayment.vue     ❌
└── PaypalPayment.vue    ❌
```

### Payment Store (bookCart + paymentStore)

The FRONTEND has a complete payment ecosystem:
- `bookCart.js` - Cart management with format (digital/physical) handling
- `paymentStore.js` - Full payment state machine (idle → processing → pending → completed/failed)
- Payment processors with verification loops, window management, status mapping

**FRONTEND-RTX: No payment implementation exists**

---

## 4. API BACKEND (45+ CONTROLLERS)

### ✅ API-TS Controllers (All Implemented)
```
API-TS/src/controllers/
├── affiliatelinksController.ts
├── authController.ts
├── authorsController.ts
├── authortransactionsController.ts
├── authorwalletController.ts
├── bookPurchaseController.ts
├── booksController.ts
├── campaignsController.ts
├── cartItemsController.ts
├── clientsController.ts
├── componentsDataController.ts
├── consentsController.ts
├── currentslidersController.ts
├── donationsController.ts
├── dslibrarypaymentsController.ts
├── ebookpaymentsController.ts
├── ebookpricingController.ts
├── exchangeratesController.ts
├── featuredBooksController.ts
├── fileuploader.ts
├── genresController.ts
├── homeController.ts
├── inventoryController.ts
├── libraryaccessController.ts
├── librarybooksController.ts
├── limitlessController.ts
├── marketersController.ts
├── marketertransactionsController.ts
├── membershipController.ts
├── newsletterSubscriptionsController.ts
├── orderItemsController.ts
├── ordersController.ts
├── paymentTypesController.ts
├── paymentsController.ts
├── permissionActionsController.ts
├── permissionModulesController.ts
├── pricelistController.ts
├── publisherpaymentsController.ts
├── publishersController.ts
├── publishingbooksController.ts
├── publishingfeeController.ts
├── readinghistoryController.ts
├── referralsController.ts
├── rolePermissionsController.ts
├── rolesController.ts
├── salesbooksController.ts
├── settingsController.ts
├── slidersController.ts
├── storiesController.ts
├── userCustomPermissionsController.ts
└── usersController.ts
```

### ❌ API-TS Services Directory EMPTY
```
API-TS/src/services/  ← EMPTY - No service layer
```

---

## 5. CRITICAL MIGRATION PRIORITIES

### Phase 1: Core Shopping Flow (CRITICAL)
1. **Cart System** - `bookCart.js` store → React/Zustand
2. **Payment Flow** - `paymentStore.js` + processors → React hooks
3. **Orders Pages** - list, view, checkout
4. **Payments Pages** - M-Pesa STK push, PayPal integration
5. **Checkout Components** - Payment forms, order summary

### Phase 2: User Account
1. **Auth Composable** - `auth.js` → React hooks
2. **Account Pages** - profile, settings
3. **Client/Marketer Pages** - wallet, withdrawals

### Phase 3: Content Management
1. **Books CRUD** - add, edit, view pages
2. **Authors/Publishers/Genres** - reference data
3. **Featured Books/Sliders** - marketing content

### Phase 4: Library System
1. **Library Store** - `libraryStore.js`, `offlineLibraryStore.js`
2. **Ebook Reader** - `epubReaderStore.js`, reader composables
3. **Reading History** - tracking

---

## 6. SPECIFIC TECHNICAL DEBT

### React/TypeScript Equivalents Needed

| FRONTEND (Vue/Pinia) | FRONTEND-RTX (React/Zustand) |
|---------------------|------------------------------|
| `composables/app.js` | Need `hooks/useApp.ts` |
| `composables/auth.js` | Need `hooks/useAuth.ts` |
| `composables/listpage.js` | Need `hooks/useListPage.ts` |
| `composables/addpage.js` | Need `hooks/useAddPage.ts` |
| `composables/editpage.js` | Need `hooks/useEditPage.ts` |
| `composables/viewpage.js` | Need `hooks/useViewPage.ts` |
| `stores/bookCart.js` | Need `store/cartStore.ts` |
| `stores/paymentStore.js` | Need `store/paymentStore.ts` + processors |
| `stores/libraryStore.js` | Need `store/libraryStore.ts` |
| `services/libraryService.js` | Need `lib/libraryService.ts` |
| `services/epubDecryptionService.js` | Need `lib/epubService.ts` |

### Payment Processor Interface Needed
```typescript
interface PaymentProcessor {
  initiate(payload: PaymentPayload, state: PaymentState): Promise<PaymentResult>;
  verify(verificationUrl: string): Promise<VerificationResult>;
  captureOrder(token: string, payerId: string): Promise<CaptureResult>;
  mapStatus(status: string): PaymentStatus;
  getStatusMessage(status: PaymentStatus): string;
}
```

---

## 7. ESTIMATED COMPLETION

| Phase | Items | Complexity |
|-------|-------|------------|
| Phase 1 | Cart, Payments, Orders | **HIGH** - Complex state, external integrations |
| Phase 2 | Auth, Account | **MEDIUM** - Standard flows |
| Phase 3 | Content CRUD | **MEDIUM** - Forms, lists |
| Phase 4 | Library/Ebook | **HIGH** - Complex reader logic |
| Phase 5 | Admin/Settings | **LOW** - CRUD pages |
| Phase 6 | Reports/Marketing | **MEDIUM** - Data aggregation |

**Current Progress: ~15% complete**
