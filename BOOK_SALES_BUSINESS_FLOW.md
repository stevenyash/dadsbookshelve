# Book Sales Business Flow
## Author Sells Through DADS Bookshelves Platform

---

## Overview

The **Book Sales** feature allows authors to sell their books (softcopy/eBook or hardcopy/physical) through the DADS Bookshelves platform. The system handles:

1. **Submission** - Author submits book for sale with pricing and consent
2. **Listing** - Approved books appear in the shop for customers to purchase
3. **Purchase** - Customer buys book, payment processed
4. **Revenue Split** - Sales revenue distributed between author and platform based on consent agreement

---

## Tables Involved

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `consents` | Author agreement/contract | `consent_id`, `revenue_sharing_percentage`, `e_signature`, `user_id`, `agreement`, `ownership_declaration` |
| `publishing_books` | Book pricing metadata | `id`, `book_title`, `author`, `softcopy_price`, `hardcopy_price`, `isbn`, `consent_id`, `comments` |
| `books` | Main book inventory | `book_id`, `title`, `author`, `price`, `image_url`, `genre_id`, `consent_id`, `soft_copy` |
| `library_books` | eBook file storage | `book_id`, `soft_copy`, `cover_image` |
| `book_purchases` | Sales transactions | `id`, `user_id`, `book_id`, `book_format`, `payment_id`, `status` |
| `sales_reports` | Monthly aggregated sales | `report_id`, `book_id`, `month`, `quantity_sold`, `total_revenue` |
| `payments` | Payment records | `id`, `user_id`, `amount`, `status`, `payment_method`, `checkout_request_id` |
| `settings` | Publishing configuration | `publishing_rate` (default revenue %) |

---

## Data Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW DIAGRAM                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   SUBMISSION PHASE                                                     │
│   ================                                                      │
│                                                                         │
│   ┌──────────┐     ┌───────────────┐     ┌─────────────┐            │
│   │ settings │────▶│ consents      │◀────│ publishing  │            │
│   │(revenue%)│     │(agreement,    │     │ books       │            │
│   └──────────┘     │ e_signature,  │     │(pricing)    │            │
│                   │ revenue_%)     │────▶│             │            │
│                   └───────────────┘     └─────────────┘            │
│                          │                      │                    │
│                          ▼                      ▼                    │
│                   ┌───────────────┐     ┌─────────────┐            │
│                   │    books      │     │library_books│            │
│                   │(main inventory│     │(softcopy    │            │
│                   │ + consent_id) │     │ file)       │            │
│                   └───────────────┘     └─────────────┘            │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   PURCHASE PHASE                                                       │
│   ==============                                                       │
│                                                                         │
│   ┌──────────┐     ┌──────────┐     ┌──────────────┐                │
│   │  users   │────▶│ payments │────▶│book_purchases│                │
│   │(customer)│     │(payment  │     │(sale record) │                │
│   └──────────┘     │ record)  │     └──────────────┘                │
│                    └──────────┘            │                         │
│                         │                   ▼                         │
│                         │            ┌──────────────┐                │
│                         └───────────▶│    books     │                │
│                                      │(book details│                │
│                                      └──────────────┘                │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   REVENUE CALCULATION                                                  │
│   ===================                                                  │
│                                                                         │
│   For each book_purchases record:                                      │
│   ┌─────────────┐     ┌─────────┐     ┌──────────────┐                │
│   │book_purchases│────▶│  books  │────▶│  consents   │                │
│   │(price)      │     │(price)  │     │(revenue_%)   │                │
│   └─────────────┘     └─────────┘     └──────────────┘                │
│         │                                       │                      │
│         ▼                                       ▼                      │
│   ┌─────────────────────────┐    ┌─────────────────────┐              │
│   │   Author Share =        │    │ Platform Share =    │              │
│   │   price × (rev%/100)   │    │ price × (1-rev%/100)│              │
│   └─────────────────────────┘    └─────────────────────┘              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Submission Flow (Author)

### Frontend Flow

**Entry Point:** `/ebook` → Click "Sell Your Book" → `sellbooks.vue`

```
1. Select Format
   ├── eBook (Softcopy) → /consents/add?type=softcopy
   └── Hard Copy → /consents/add?type=hardcopy

2. Step 1: Book Details (BookDetailsStep.vue)
   - book_title (required)
   - author (required)
   - isbn (required)
   - hardcopy_price (if hardcopy)
   - softcopy_price (if softcopy)
   - genre_id (required)
   - image_url (cover image, required)
   - comments (optional)
   - Max 5 books per submission

3. Step 2: File Upload (FileUploadStep.vue) [Softcopy only]
   - Upload eBook file (PDF, EPUB, MOBI)
   - One file per book

4. Step 3: Consent/Agreement (ConsentStep.vue)
   - agreement (loaded from settings.publisher_agreement)
   - revenue_sharing_percentage (loaded from settings.publishing_rate)
   - declaration (loaded from settings.publisher_declaration)
   - agreement_confirmation (checkbox)
   - ownership_declaration (checkbox)
   - user_details_confirmation (checkbox)
   - e_signature (signature pad)
```

### Backend API Endpoints

**Softcopy Submission:**
```
POST /api/components_data/submit-softcopy-publication

Request (multipart/form-data):
{
  consent: {
    user_id, user_name, user_email, user_phone,
    agreement_confirmation: boolean,
    ownership_declaration: boolean,
    user_details_confirmation: boolean,
    e_signature: base64,
    agreement: text,
    declaration: text,
    revenue_sharing_percentage: string (e.g., "70")
  },
  publishingBooks: [
    {
      book_title, author, isbn, genre_id, image_url,
      softcopy_price, comments
    }
  ],
  libraryBooks: [
    { soft_copy: file }
  ]
}
```

**Hardcopy Submission:**
```
POST /api/components_data/submit-hardcopy-publication

Request (multipart/form-data):
{
  consent: { ... same as softcopy ... },
  publishingBooks: [
    {
      book_title, author, isbn, genre_id, image_url,
      hardcopy_price, comments
    }
  ]
  // No libraryBooks for hardcopy
}
```

### Backend Processing (components_data.js)

```javascript
// Pseudo-code for submit-softcopy-publication
async function submitSoftcopyPublication(req, res) {
  const transaction = await DB.sequelize.transaction();
  
  try {
    const { consent, publishingBooks, libraryBooks } = req.getValidFormData();
    
    // 1. Create consent record
    const consentRecord = await createConsentRecord(consent, transaction);
    // Stores: revenue_sharing_percentage (from settings.publishing_rate default 70%)
    
    // 2. Create books records (main inventory)
    const booksRecords = await createBooksRecords(publishingBooks, consentRecord, transaction);
    // Links: books.consent_id = consentRecord.consent_id
    
    // 3. Create publishing_books (pricing metadata)
    const publishingBooksRecords = await createPublishingRecords(
      publishingBooks, booksRecords, consentRecord, transaction
    );
    // Stores: softcopy_price OR hardcopy_price + consent_id
    
    // 4. Create library_books (eBook files) [softcopy only]
    const libraryBooksRecords = await createLibraryRecords(
      libraryBooks, booksRecords, transaction
    );
    // Stores: soft_copy file path
    
    await transaction.commit();
    
    // Send notification email to author
    await sendSubmissionNotifications({ userEmail, bookDetails, type: "softcopy" });
    
    return res.ok({ success: true, data: { consent, books, publishingInfo, libraryRecords } });
  } catch (err) {
    await transaction.rollback();
    return res.serverError(err);
  }
}
```

---

## Purchase Flow (Customer)

### Customer Path

```
1. Browse Shop → Find book
2. Add to Cart → /cart
3. Checkout → Payment
4. Payment Success → Order Created → Download/Delivery
```

### Backend Flow

**1. Cart Addition:**
```
POST /api/cartitems/add
{ user_id, book_id, quantity }
```

**2. Payment Initiation:**
```
POST /api/payments/initiate
{
  user_id, amount, method: 'mpesa'|'paypal',
  reference, module: 'book_purchase',
  metadata: {
    items: [
      { book_id, price, quantity, format: 'digital'|'physical' }
    ]
  }
}
```

**3. Payment Completion:**
- M-Pesa callback OR manual check → payment marked 'completed'
- `paymentService.handlePaymentCompletion('book_purchase', payment, metadata)`
- Creates order and order_items

**4. Book Purchase Record:**
```
POST /api/bookpurchase/add (or created automatically via payment)
{
  user_id,
  book_id,
  book_format: 'digital_book' | 'hard_copy',
  payment_id,
  status: 'pending' | 'delivered'
}
```

---

## Revenue Calculation

### Calculation Logic

When a book is sold, revenue is split based on the author's consent agreement:

```sql
-- Query to get revenue per sale with split
SELECT 
  bp.id as purchase_id,
  b.title,
  b.price,
  c.revenue_sharing_percentage,
  (b.price * (c.revenue_sharing_percentage / 100)) as author_share,
  (b.price * (1 - (c.revenue_sharing_percentage / 100))) as platform_share
FROM book_purchases bp
JOIN books b ON b.book_id = bp.book_id
JOIN consents c ON c.consent_id = b.consent_id
WHERE bp.user_id = :author_user_id;
```

### Example

| Field | Value |
|-------|-------|
| Book Price | KES 1,000 |
| Revenue % (from consents) | 70% |
| **Author Share** | KES 1,000 × 0.70 = **KES 700** |
| **Platform Share** | KES 1,000 × 0.30 = **KES 300** |

### Revenue Reporting Endpoints

**Author Revenue Report:**
```
GET /api/components_data/author/revenue?user_id=123&format=json|csv
```

Returns:
- All sales of author's books
- Calculated author_share per sale
- Total author earnings
- CSV export option

**Admin Revenue Dashboard:**
```
GET /api/components_data/admin/revenue/dashboard?period=month&group_by=month
```

---

## Key Configuration

### Settings (admin configurable)

| Setting | Table Field | Purpose |
|---------|-------------|---------|
| `publishing_rate` | settings.publishing_rate | Default revenue % for authors (e.g., "70") |
| `publisher_agreement` | settings.publisher_agreement | Agreement text shown to authors |
| `publisher_declaration` | settings.publisher_declaration | Declaration text shown to authors |

---

## Status Values

### Book Purchase Status
- `pending` - Payment not yet confirmed
- `delivered` - Book delivered to customer

### Payment Status
- `pending` - Awaiting payment
- `completed` - Payment confirmed
- `failed` - Payment failed
- `cancelled` - Payment cancelled

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/components_data/submit-softcopy-publication` | POST | Submit eBook for sale |
| `/api/components_data/submit-hardcopy-publication` | POST | Submit physical book for sale |
| `/api/consents` | GET/POST | List/Create consents |
| `/api/consents/view/:id` | GET | View consent agreement |
| `/api/publishingbooks` | GET/POST | List/Create publishing books |
| `/api/bookpurchase` | GET/POST | List/Create purchases |
| `/api/bookpurchase/user/:userId` | GET | User's purchased books |
| `/api/components_data/author/revenue` | GET | Author revenue report |
| `/api/components_data/admin/revenue/dashboard` | GET | Admin revenue dashboard |
| `/api/payments/initiate` | POST | Start payment |
| `/api/payments/verify` | POST | Verify payment |
| `/api/payments/confirm-payment` | POST | Confirm manual payment |

---

## Frontend Pages

| Page | Purpose |
|------|---------|
| `FRONTEND/src/pages/custom/sellbooks.vue` | "Sell Your Book" entry point |
| `FRONTEND/src/pages/consents/add.vue` | Multi-step submission form |
| `FRONTEND/src/pages/consents/BookDetailsStep.vue` | Step 1: Book details |
| `FRONTEND/src/pages/consents/FileUploadStep.vue` | Step 2: File upload (softcopy) |
| `FRONTEND/src/pages/consents/ConsentStep.vue` | Step 3: Agreement signing |

---

## Notes

1. **Revenue Percentage**: Retrieved from `settings.publishing_rate` at time of submission, stored in `consents.revenue_sharing_percentage`

2. **Link Chain**: `book_purchases` → `books` → `consents` → `revenue_sharing_percentage`

3. **Formats**: 
   - Softcopy: `publishing_books.softcopy_price` + `library_books.soft_copy`
   - Hardcopy: `publishing_books.hardcopy_price` + physical delivery

4. **Transaction**: All submission steps (consent + books + publishing_books + library_books) are created in a single database transaction

5. **Email Notifications**: Sent to author after successful submission