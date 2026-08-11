# New Admin Management Modules - Implementation Plan

## Overview
Add 5 new admin management modules to the DBS Bookshelves system:
1. **Carousel Management** - Homepage carousel images/slides
2. **Book of the Day Management** - Daily featured book selection
3. **DBS Story & News Management** - Blog/news articles
4. **Newsletter Management** - Email newsletter campaigns
5. **Finance Management** - Financial reports and overview

---

## Phase 1: Backend (API-PY)

### 1.1 Database Models (Prisma)

Create new tables in `API-TS/prisma/schema.prisma`:

```prisma
model Carousel {
  carousel_id    Int       @id @default(autoincrement())
  title          String    @db.VarChar(255)
  description    String?   @db.Text
  image_url      String    @db.VarChar(500)
  link_url       String?   @db.VarChar(500)
  button_text    String?   @db.VarChar(100)
  order_index    Int       @default(0)
  is_active      Boolean   @default(true)
  start_date     DateTime? @db.DateTime(0)
  end_date       DateTime? @db.DateTime(0)
  created_by     Int?
  created_at     DateTime  @default(now()) @db.DateTime(0)
  updated_at     DateTime  @updatedAt @db.DateTime(0)

  @@map("carousel")
}

model BookOfDay {
  book_of_day_id Int       @id @default(autoincrement())
  book_id        Int
  featured_date  DateTime  @db.Date
  reason         String?   @db.Text
  is_active      Boolean   @default(true)
  created_at     DateTime  @default(now()) @db.DateTime(0)
  updated_at     DateTime  @updatedAt @db.DateTime(0)

  @@map("book_of_day")
}

model DbStory {
  story_id       Int       @id @default(autoincrement())
  title          String    @db.VarChar(255)
  slug           String    @unique @db.VarChar(255)
  excerpt        String?   @db.Text
  content        String    @db.LongText
  cover_image    String?   @db.VarChar(500)
  author         String?   @db.VarChar(255)
  status         String    @default('draft') @db.VarChar(20) // draft, published, archived
  published_at   DateTime? @db.DateTime(0)
  meta_title     String?   @db.VarChar(255)
  meta_description String? @db.Text
  created_at     DateTime  @default(now()) @db.DateTime(0)
  updated_at     DateTime  @updatedAt @db.DateTime(0)

  @@map("db_story")
}

model Newsletter {
  newsletter_id  Int       @id @default(autoincrement())
  title          String    @db.VarChar(255)
  subject        String    @db.VarChar(255)
  content        String    @db.LongText
  html_content   String?   @db.LongText
  status         String    @default('draft') @db.VarChar(20) // draft, scheduled, sent, failed
  recipients     Int       @default(0)
  sent_at        DateTime? @db.DateTime(0)
  scheduled_at   DateTime? @db.DateTime(0)
  created_by     Int?
  created_at     DateTime  @default(now()) @db.DateTime(0)
  updated_at     DateTime  @updatedAt @db.DateTime(0)

  @@map("newsletter")
}

model FinanceTransaction {
  transaction_id Int       @id @default(autoincrement())
  type           String    @db.VarChar(50) // payment, refund, commission, payout, withdrawal
  user_id        Int?
  amount         Float
  currency       String    @default('KES') @db.VarChar(3)
  description    String?   @db.Text
  reference_id   String?   @db.VarChar(100) // order_id, payment_id, etc.
  status         String    @default('pending') @db.VarChar(20)
  metadata       Json?     // Additional data
  created_at     DateTime  @default(now()) @db.DateTime(0)
  updated_at     DateTime  @updatedAt @db.DateTime(0)

  @@map("finance_transaction")
}
```

Run: `npx prisma db push` or create migration.

### 1.2 Permission Modules & Actions

**Modules to create in `permissions.py`:**
- `carousel` — Manage homepage carousel
- `book_of_day` — Manage daily featured books
- `db_story` — Manage DBS news/stories
- `newsletter` — Manage email newsletters
- `finance` — View financial reports

**Actions:** Each module gets standard actions: `view`, `add`, `edit`, `delete`

Add to `PermissionModules` seed data (or via admin UI).

### 1.3 API Endpoints

Create new route files in `API-PY/src/routes/`:

#### `carousel.py`
```python
carousel_bp = Blueprint('carousel', __name__)

@carousel_bp.route('', methods=['GET'])
def index():
    # List all carousel items (paginated, filter by active)
    pass

@carousel_bp.route('/<int:carousel_id>', methods=['GET'])
def view(carousel_id):
    pass

@carousel_bp.route('', methods=['POST'])
@require_auth
def create():
    pass

@carousel_bp.route('/<int:carousel_id>', methods=['PUT'])
@require_auth
def edit(carousel_id):
    pass

@carousel_bp.route('/<int:carousel_id>', methods=['DELETE'])
@require_auth
def delete(carousel_id):
    pass

@carousel_bp.route('/reorder', methods=['POST'])
@require_auth
def reorder():
    # Update order_index of multiple items
    pass
```

#### `book_of_day.py`
```python
book_of_day_bp = Blueprint('book_of_day', __name__)

@book_of_day_bp.route('', methods=['GET'])
def index():
    # List upcoming/active book of day entries
    pass

@book_of_day_bp.route('/by-date/<string:date>', methods=['GET'])
def by_date(date):
    # Get book of day for specific date
    pass

@book_of_day_bp.route('', methods=['POST'])
@require_auth
def create():
    pass

@book_of_day_bp.route('/<int:book_of_day_id>', methods=['PUT'])
@require_auth
def edit(book_of_day_id):
    pass

@book_of_day_bp.route('/<int:book_of_day_id>', methods=['DELETE'])
@require_auth
def delete(book_of_day_id):
    pass
```

#### `db_story.py`
```python
db_story_bp = Blueprint('db_story', __name__)

@db_story_bp.route('', methods=['GET'])
def index():
    # List published stories (frontend), all for admin
    pass

@db_story_bp.route('/<int:story_id>', methods=['GET'])
def view(story_id):
    pass

@db_story_bp.route('', methods=['POST'])
@require_auth
def create():
    pass

@db_story_bp.route('/<int:story_id>', methods=['PUT'])
@require_auth
def edit(story_id):
    pass

@db_story_bp.route('/<int:story_id>', methods=['DELETE'])
@require_auth
def delete(story_id):
    pass

@db_story_bp.route('/<int:story_id>/publish', methods=['POST'])
@require_auth
def publish(story_id):
    pass
```

#### `newsletter.py`
```python
newsletter_bp = Blueprint('newsletter', __name__)

@newsletter_bp.route('', methods=['GET'])
@require_auth
def index():
    pass

@newsletter_bp.route('/<int:newsletter_id>', methods=['GET'])
@require_auth
def view(newsletter_id):
    pass

@newsletter_bp.route('', methods=['POST'])
@require_auth
def create():
    pass

@newsletter_bp.route('/<int:newsletter_id>', methods=['PUT'])
@require_auth
def edit(newsletter_id):
    pass

@newsletter_bp.route('/<int:newsletter_id>', methods=['DELETE'])
@require_auth
def delete(newsletter_id):
    pass

@newsletter_bp.route('/<int:newsletter_id>/send', methods=['POST'])
@require_auth
def send(newsletter_id):
    # Queue/send newsletter to subscribers
    pass

@newsletter_bp.route('/preview/<int:newsletter_id>', methods=['GET'])
@require_auth
def preview(newsletter_id):
    pass
```

#### `finance.py`
```python
finance_bp = Blueprint('finance', __name__)

@finance_bp.route('/summary', methods=['GET'])
@require_auth
def summary():
    # Overview: total revenue, expenses, pending payouts, etc.
    pass

@finance_bp.route('/transactions', methods=['GET'])
@require_auth
def transactions():
    # List transactions with filters (date, type, status)
    pass

@finance_bp.route('/commissions', methods=['GET'])
@require_auth
def commissions():
    # Commission earnings/payouts
    pass

@finance_bp.route('/reports/monthly', methods=['GET'])
@require_auth
def monthly_report():
    pass

@finance_bp.route('/reports/annual', methods=['GET'])
@require_auth
def annual_report():
    pass
```

**Register routes** in `API-PY/src/index.py` or appropriate blueprint aggregator.

### 1.4 Middleware Permissions

All admin endpoints must use `@require_auth` and check permissions via:
```python
from src.middleware.permissions import require_permission

@carousel_bp.route('', methods=['POST'])
@require_auth
@require_permission('carousel', 'add')
def create():
    pass
```

---

## Phase 2: Frontend (FRONTEND-RTX)

### 2.1 Permission Modules Registration

Ensure the new modules exist in the frontend permission definitions (`src/hooks/usePermissions` or similar). The backend permission system should already sync them.

### 2.2 Dashboard Menu Cards

Update `src/pages/dashboard/DashboardPage.tsx`:

Add new `MenuCard` entries in the "System Management" section:
```tsx
{canView('carousel') && (
  <MenuCard icon={Images} label="Carousel" description="Manage homepage slider" link="/admin/carousel" color="bg-pink-100 text-pink-600" />
)}
{canView('book_of_day') && (
  <MenuCard icon={BookOpen} label="Book of the Day" description="Featured daily books" link="/admin/book-of-day" color="bg-orange-100 text-orange-600" />
)}
{canView('db_story') && (
  <MenuCard icon={FileText} label="DBS Stories" description="News & articles" link="/admin/stories" color="bg-teal-100 text-teal-600" />
)}
{canView('newsletter') && (
  <MenuCard icon={Mail} label="Newsletters" description="Email campaigns" link="/admin/newsletters" color="bg-cyan-100 text-cyan-600" />
)}
{canView('finance') && (
  <MenuCard icon={DollarSign} label="Finance" description="Financial reports" link="/admin/finance" color="bg-emerald-100 text-emerald-600" />
)}
```

**Note:** Remove `/admin/orders` card if it doesn't exist yet (commented out in current code).

### 2.3 Page Structure Pattern

Follow the **Quasar list page pattern** from project rules (adapted for React):

Each module gets:
- `src/pages/admin/[module]/list.tsx` — Table with CRUD actions
- `src/pages/admin/[module]/add.tsx` — Create form
- `src/pages/admin/[module]/edit.tsx` — Update form

Use shared components:
- `src/components/Table/DataTable.tsx` (if exists) or standard HTML table
- `src/components/Form/` inputs with validation
- `src/lib/api` for requests

**List Page Pattern:**
```tsx
export default function CarouselListPage() {
  const { canView, canAdd, canEdit, canDelete } = usePermissions()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['carousel'],
    queryFn: () => api.get('/carousel')
  })

  if (!canView('carousel')) return <AccessDenied />

  return (
    <div>
      <PageHeader title="Carousel Management" addLink="/admin/carousel/add" />
      <Table
        columns={columns}
        rows={data?.records || []}
        actions={(row) => (
          <>
            {canEdit('carousel') && <EditButton to={`/admin/carousel/edit/${row.carousel_id}`} />}
            {canDelete('carousel') && <DeleteButton onClick={() => handleDelete(row.carousel_id)} />}
          </>
        )}
      />
    </div>
  )
}
```

### 2.4 Form Handling

Use React Hook Form + Zod validation if available, otherwise standard form state.

Example form fields:

**Carousel Add/Edit:**
- Title (text)
- Description (textarea)
- Image URL / Upload (file input or URL)
- Link URL (optional)
- Button text (optional)
- Order index (number)
- Start date / End date (datetime)
- Is active (checkbox)

**Book of Day Add/Edit:**
- Book (search/select from books table)
- Featured date (date picker)
- Reason (textarea)
- Is active (checkbox)

**DBS Story Add/Edit:**
- Title (text)
- Slug (auto-generate from title)
- Excerpt (textarea)
- Content (rich text editor)
- Cover image (URL/upload)
- Author (text)
- Status (select: draft, published, archived)
- Published at (datetime)
- SEO fields (meta title, meta description)

**Newsletter Add/Edit:**
- Title (text)
- Subject (text)
- Content (rich text editor)
- HTML content (optional, for advanced editing)
- Status (select: draft, scheduled, sent)
- Scheduled at (datetime, if status=scheduled)
- Recipients count (readonly, calculated)

**Finance:**
- No CRUD — read-only reports only
- Filter by date range, transaction type, status
- Export CSV/PDF buttons

### 2.5 API Client Methods

Add to `src/lib/api.ts` or create service files:

```typescript
// carouselApi.ts
export const carouselApi = {
  list: (params?) => api.get('/carousel', { params }),
  view: (id) => api.get(`/carousel/${id}`),
  create: (data) => api.post('/carousel', data),
  update: (id, data) => api.put(`/carousel/${id}`, data),
  delete: (id) => api.delete(`/carousel/${id}`),
  reorder: (order) => api.post('/carousel/reorder', { order }),
}

// Similar for book_of_day, db_story, newsletter, finance
```

### 2.6 Rich Text Editor

For `db_story.content` and `newsletter.content`, use a rich text editor:
- Tiptap
- Quill
- Or simple textarea if budget constraints

### 2.7 Image Upload

If carousel/stories need image uploads:
- Use existing file upload infrastructure
- Store in `assets/uploads/carousel/` or similar
- Return URL to save in DB

### 2.8 Newsletter Sending

Newsletter send workflow:
1. Admin creates newsletter (status: `draft`)
2. Click "Send" → backend changes status to `sent` (or `scheduled` → background job)
3. Backend uses SMTP/Email service (SendGrid, Mailgun, etc.) to send to all subscribers
4. Update `recipients` count and `sent_at` timestamp

**Consider async task queue** (Celery/RQ) for large recipient lists.

### 2.9 Notification on Publish

For DBS Stories, when `status = 'published'`, optionally:
- Push to homepage "Latest News" section
- Send notification to subscribers
- Update sitemap

---

## Phase 3: Testing

### 3.1 Backend Tests
- Unit tests for each endpoint
- Permission checks ensure unauthorized access blocked
- CRUD operations on models
- Edge cases: delete with dependencies, invalid IDs, date overlaps

### 3.2 Frontend Tests
- Permission-based UI: buttons hidden/visible per canView/canAdd/etc.
- Form validation
- API error handling
- Loading states

---

## Phase 4: Styling & UX

Follow existing design:
- Tailwind CSS utility classes
- DaisyUI components (if used)
- Consistent spacing, colors, badges
- Responsive tables

---

## Implementation Order (Recommended)

1. **Database + Permissions** (foundation)
2. **Carousel API** (simple CRUD)
3. **Carousel Frontend** (simple list + forms)
4. **Book of Day** (slightly more complex — date logic)
5. **DBS Stories** (needs rich text + image upload)
6. **Newsletter** (needs email template + send logic)
7. **Finance** (read-only, aggregations)
8. **Dashboard menu cards** (final touch)

---

## Notes

- All admin pages should be in `/admin/*` routes
- All CRUD pages use permission checks (`canView`, `canAdd`, `canEdit`, `canDelete`)
- Dashboard menu cards use `canView('module')`
- Reuse components where possible (generic `ResourceListPage`, `ResourceFormPage`)
- Finance module should **not** duplicate existing `admin/payments` page — focus on reports/dashboard
- Newsletter module needs subscriber list integration (existing `subscribers` table?)
- Book of Day: ensure only 1 entry per date, prevent duplicates

---

## Estimated Effort

| Module | DB | API | Frontend | Total |
|--------|----|-----|----------|-------|
| Carousel | 1h | 2h | 3h | 6h |
| Book of Day | 1h | 2h | 3h | 6h |
| DBS Stories | 1h | 3h | 5h | 9h |
| Newsletter | 1h | 4h (email) | 5h | 10h |
| Finance | 1h | 4h (reports) | 4h | 9h |
| **Total** | **5h** | **15h** | **20h** | **40h** |

*Does not include testing, review, or styling polish.*
