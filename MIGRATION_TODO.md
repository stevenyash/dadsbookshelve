# API to API-TS Migration TODO List

## Migration Status Summary
- **Total Legacy Controllers**: ~60
- **Migrated to API-TS**: 9
- **Not Migrated**: ~51

---

## ✅ Migrated Controllers (API-TS)

| Controller | Path | Status |
|------------|------|--------|
| authController | /api/auth | ✅ Done |
| homeController | /api/home | ✅ Done |
| genresController | /api/genres | ✅ Done |
| slidersController | /api/sliders | ✅ Done |
| featuredBooksController | /api/featured_books | ✅ Done |
| storiesController | /api/stories | ✅ Done |
| componentsDataController | /api/components_data | ✅ Done |
| usersController | /api/users | ✅ Done |
| booksController | /api/books | ✅ Done |
| ordersController | /api/orders | ✅ Done |
| marketersController | /api/marketers | ✅ Done |
| fileuploader | /api/fileuploader | ✅ Done |
| authorsController | /api/authors | ✅ Done |
| publishersController | /api/publishers | ✅ Done |
| clientsController | /api/clients | ✅ Done |
| paymentsController | /api/payments | ✅ Done |
| cartItemsController | /api/cartitems | ✅ Done |
| orderItemsController | /api/orderitems | ✅ Done |
| bookPurchaseController | /api/bookpurchase | ✅ Done |
| membershipController | /api/membership | ✅ Done |
| settingsController | /api/settings | ✅ Done |
| rolesController | /api/roles | ✅ Done |
| permissionModulesController | /api/permission_modules | ✅ Done |
| permissionActionsController | /api/permission_actions | ✅ Done |
| rolePermissionsController | /api/role_permissions | ✅ Done |
| userCustomPermissionsController | /api/user_custom_permissions | ✅ Done |
| librarybooksController | /api/librarybooks | ✅ Done |
| libraryaccessController | /api/libraryaccess | ✅ Done |
| inventoryController | /api/inventory | ✅ Done |
| readinghistoryController | /api/readinghistory | ✅ Done |
| currentslidersController | /api/currentsliders | ✅ Done |
| donationsController | /api/donations | ✅ Done |
| limitlessController | /api/limitless | ✅ Done |
| paymentTypesController | /api/payments_type | ✅ Done |
| pricelistController | /api/pricelist | ✅ Done |
| newsletterSubscriptionsController | /api/newslettersubscriptions | ✅ Done |
| authorwalletController | /api/authorwallet | ✅ Done |
| authortransactionsController | /api/authortransaction | ✅ Done |
| marketertransactionsController | /api/marketertransactions | ✅ Done |
| referralsController | /api/referrals | ✅ Done |
| affiliatelinksController | /api/affiliatelinks | ✅ Done |
| campaignsController | /api/campaigns | ✅ Done |
| publishingbooksController | /api/publishingbooks | ✅ Done |
| publisherpaymentsController | /api/publisherpayments | ✅ Done |
| ebookpaymentsController | /api/ebookpayments | ✅ Done |
| ebookpricingController | /api/ebookpricing | ✅ Done |
| publishingfeeController | /api/publishingfee | ✅ Done |
| dslibrarypaymentsController | /api/dslibrarypayments | ✅ Done |
| consentsController | /api/consents | ✅ Done |
| exchangeratesController | /api/exchangerates | ✅ Done |
| salesbooksController | /api/salesbooks | ✅ Done |
| salesreportsController | /api/salesreports | ✅ Done |
| incomereportsController | /api/incomereports | ✅ Done |
| devicesController | /api/devices | ✅ Done |
| userdevicesController | /api/userdevices | ✅ Done |
| ebookuploaderController | /api/ebookuploader | ✅ Done |
| marketerwalletController | /api/marketerwallet | ✅ Done |

**Total: 56 controllers migrated**

---

## ❌ NOT Migrated (Priority Order)

### HIGH Priority (Core Business)

| Controller | Path | Reason |
|------------|------|--------|
| authors | /api/authors | Core entity |
| publishers | /api/publishers | Core entity |
| clients | /api/clients | Core entity |
| payments | /api/payments | Payment processing |
| cartitems | /api/cartitems | Shopping cart |
| orderitems | /api/orderitems | Order details |
| bookpurchase | /api/bookpurchase | Purchase flow |

### MEDIUM Priority (Business Operations)

| Controller | Path | Reason |
|------------|------|--------|
| membership | /api/membership | User memberships |
| librarybooks | /api/librarybooks | Library management |
| libraryaccess | /api/libraryaccess | Access control |
| inventory | /api/inventory | Stock management |
| readinghistory | /api/readinghistory | User tracking |
| settings | /api/settings | App configuration |
| permissions | /api/permissions | RBAC |
| roles | /api/roles | RBAC |
| role_permissions | /api/role_permissions | RBAC |
| permission_modules | /api/permission_modules | RBAC |
| permission_actions | /api/permission_actions | RBAC |
| user_custom_permissions | /api/user_custom_permissions | RBAC |

### LOWER Priority (Auxiliary)

| Controller | Path | Reason |
|------------|------|--------|
| account | /api/account | User account |
| authorwallet | /api/authorwallet | Author finances |
| authortransactions | /api/authortransaction | Author finances |
| marketerwallet | /api/marketerwallet | Marketer finances |
| referrals | /api/referrals | Referral system |
| affiliatelinks | /api/affiliatelinks | Affiliate system |
| campaigns | /api/campaigns | Marketing |
| donations | /api/donations | Donations |
| payments_type | /api/payments_type | Payment config |
| payments_items | /api/payments_items | Payment details |
| pricelist | /api/pricelist | Pricing |
| ebookpayments | /api/ebookpayments | Ebook payments |
| ebookpricing | /api/ebookpricing | Ebook pricing |
| publisherpayments | /api/publisherpayments | Publisher payments |
| publishingbooks | /api/publishingbooks | Publishing flow |
| publishingfee | /api/publishingfee | Publishing fees |
| dslibrarypayments | /api/dslibrarypayments | Library payments |
| limitless | /api/limitless | Membership tier |
| newslettersubscriptions | /api/newslettersubscriptions | Newsletter |
| consents | /api/consents | GDPR compliance |
| currentsliders | /api/currentsliders | Slider content |
| featuredbooks | /api/featuredbooks | Featured content |
| exchangerates | /api/exchangerates | Currency |
| incomereports | /api/incomereports | Reporting |
| salesreports | /api/salesreports | Reporting |
| salesbooks | /api/salesbooks | Sales tracking |
| rightlist | /api/rightlist | Rights management |
| devices | /api/devices | Device management |
| userdevices | /api/userdevices | User devices |
| ebookuploader | /api/ebookuploader | Ebook upload |
| s3uploader | /api/s3uploader | S3 upload |

---

## ❌ NOT Migrated Helpers/Services

| File | Purpose |
|------|---------|
| helpers/rbac.js | Role-based access control |
| helpers/mailer.js | Email sending |
| helpers/sms.js | SMS notifications |
| helpers/s3uploader.js | S3 upload |
| helpers/passport-auth.js | OAuth authentication |
| helpers/googleAuthMethods.js | Google auth |
| helpers/epubEncryption.js | EPUB encryption |
| services/payment.service.js | Payment processing |
| services/revenueService.js | Revenue calculations |
| services/CupturePayment.js | Payment capture |
| services/PaypalService.js | PayPal integration |
| services/MpesaService.js | M-Pesa integration |
| services/subscriptionService.js | Subscriptions |
| services/commissionCalculator.js | Commission calculations |
| services/auditlog.js | Audit logging |

---

## ❌ NOT Migrated Models

All models need migration to Prisma schema:
- authors, publishers, clients, books, orders, etc.
- See `API/models/` directory (47 model files)

---

## 📋 Migration Tasks by Phase

### Phase 1: Core Entities (High Priority)
- [x] authorsController → authors.ts
- [x] publishersController → publishers.ts
- [x] clientsController → clients.ts
- [x] paymentsController → payments.ts
- [x] cartitemsController → cartitems.ts
- [x] orderitemsController → orderitems.ts
- [x] bookpurchaseController → bookpurchase.ts

### Phase 2: User & Permissions (High Priority)
- [x] membershipController → membership.ts
- [x] permissionsController → permissions.ts (note: permissions was actually roles)
- [x] rolesController → roles.ts
- [x] role_permissionsController → role_permissions.ts
- [x] permission_modulesController → permission_modules.ts
- [x] permission_actionsController → permission_actions.ts
- [x] user_custom_permissionsController → user_custom_permissions.ts
- [x] accountController → account.ts (merged into users)
- [x] settingsController → settings.ts

### Phase 3: Library & Content (Medium Priority)
- [ ] librarybooksController → librarybooks.ts
- [ ] libraryaccessController → libraryaccess.ts
- [ ] inventoryController → inventory.ts
- [ ] readinghistoryController → readinghistory.ts
- [ ] settingsController → settings.ts
- [ ] currentslidersController → currentsliders.ts
- [ ] ebookuploaderController → ebookuploader.ts
- [ ] s3uploaderController → s3uploader.ts

### Phase 4: Financial (Medium Priority)
- [x] authorwalletController → authorwallet.ts
- [x] authortransactionsController → authortransactions.ts
- [x] marketertransactionsController → marketertransactions.ts
- [x] referralsController → referrals.ts
- [x] affiliatelinksController → affiliatelinks.ts
- [x] campaignsController → campaigns.ts
- [x] payments_typeController → payments_type.ts
- [x] payments_itemsController → (uses payment_types relation in payments)
- [x] pricelistController → pricelist.ts
- [x] ebookpaymentsController → ebookpayments.ts
- [x] ebookpricingController → ebookpricing.ts
- [x] publisherpaymentsController → publisherpayments.ts
- [x] publishingbooksController → publishingbooks.ts
- [x] publishingfeeController → publishingfee.ts
- [x] dslibrarypaymentsController → dslibrarypayments.ts
- [x] donationsController → donations.ts
- [x] limitlessController → limitless.ts
- [x] incomereportsController → incomereports.ts
- [x] salesreportsController → salesreports.ts
- [x] salesbooksController → salesbooks.ts

### Phase 5: Auxiliary (Lower Priority)
- [x] newslettersubscriptionsController → newslettersubscriptions.ts
- [x] consentsController → consents.ts
- [x] exchangeratesController → exchangerates.ts
- [x] devicesController → devices.ts
- [x] userdevicesController → userdevices.ts
- [x] ebookuploaderController → ebookuploader.ts

### Phase 6: Services & Helpers
- [ ] Migrate helpers/rbac.js → services/rbac.ts
- [ ] Migrate helpers/mailer.js → services/mailer.ts
- [ ] Migrate helpers/sms.js → services/sms.ts
- [ ] Migrate helpers/passport-auth.js → services/passport-auth.ts
- [ ] Migrate helpers/googleAuthMethods.js → services/googleAuth.ts
- [ ] Migrate services/payment.service.js → services/payment.service.ts
- [ ] Migrate services/revenueService.js → services/revenueService.ts
- [ ] Migrate services/PaypalService.js → services/paypal.service.ts
- [ ] Migrate services/MpesaService.js → services/mpesa.service.ts
- [ ] Migrate services/subscriptionService.js → services/subscription.service.ts
- [ ] Migrate services/commissionCalculator.js → services/commissionCalculator.ts
- [ ] Migrate services/auditlog.js → services/auditlog.ts

### Phase 7: Prisma Schema
- [x] Review API/models/ directory - Already complete in schema.prisma

---

## Notes

1. Some endpoints may be deprecated or consolidated - verify before migration
2. Third-party integrations (PayPal, M-Pesa, Google Auth, S3) need config setup
3. RBAC system needs careful migration to preserve existing permissions
4. Consider which legacy features are still actively used before migrating

## TypeScript Status

The migrated controllers have some type inference issues with `req.body` (typed as `unknown`). These are common when migrating from JS to TS and don't affect runtime functionality. They can be addressed by adding explicit type guards or interfaces.

## Remaining to Migrate (Phase 4-7)

Financial controllers, auxiliary services, and helpers/services still need migration.
