# Paralee Admin - Book Conversion Manager

## 1. Project Overview

**Project Name:** Paralee Admin (Paralee Tauri App)
**Type:** Desktop Application (Tauri + React)
**Core Function:** Specialized admin tool for managing ebook conversions - view uploaded books, convert them, generate download links, and notify users.

**Target Users:** System administrators managing the ebook conversion queue.

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Tauri 2.x |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS 4 + daisyUI |
| State | Zustand |
| Data Fetching | TanStack Query |
| HTTP Client | Axios |
| Desktop Features | Tauri APIs (dialog, fs, shell, window) |

---

## 3. Feature Scope

### 3.1 Authentication
- Admin login screen (email + password)
- JWT token storage in OS secure storage
- Auto-logout on token expiry
- Session persistence across app restarts

### 3.2 Conversion Queue Management
- **Pending Tab:** List of unpaid/awaiting payment uploads
- **Processing Tab:** Jobs currently being converted
- **Completed Tab:** Successfully converted jobs
- **Failed Tab:** Failed conversions requiring retry

### 3.3 Job Actions
- View job details (user info, original file, target format)
- Start conversion / Retry failed conversion
- Mark as failed with error notes
- Upload converted file manually
- Generate time-limited download link
- Send download link to user (email/SMS/WhatsApp)

### 3.4 Job Status Flow
```
pending → paid → queued → processing → converted → link_sent → completed
                                          ↓
                                        failed (can retry)
```

### 3.5 User Notifications
- Email notification with download link
- SMS notification (via existing backend)
- WhatsApp notification (via existing backend)
- In-app notification log per job

---

## 4. Database Schema (Prisma - Existing)

The app will use existing `ebook_uploader` and related tables:

```prisma
model ebook_uploader {
  id               Int     @id @default(autoincrement())
  book             String? @db.VarChar(500)      // Original file path
  user_id          Int?
  final_copy       String? @db.VarChar(500)     // Converted file path
  readium_manifest String? @db.VarChar(255)
  date_uploaded    String? @db.VarChar(50)
  payment_status   String? @db.VarChar(50)     // pending, paid
  payment_id       String? @db.VarChar(50)
  status           String? @db.VarChar(50)     // pending, processing, converted, failed
  book_title       String? @db.VarChar(500)
  isbn             String? @db.VarChar(50)
  author           String? @db.VarChar(50)
  cover_image      String? @db.VarChar(500)

  users users? @relation(fields: [user_id], references: [user_id])

  @@map("ebook_uploader")
}

model ebook_payments {
  id                Int     @id @default(autoincrement())
  user_id           Int
  ebook_upload_id   String? @db.VarChar(50)
  amount            String? @db.VarChar(50)
  reference         String? @db.VarChar(50)
  payment_date      String? @db.VarChar(50)
  CheckoutRequestID String? @db.VarChar(50)
  currency          String? @db.VarChar(50)
  details           String? @db.VarChar(50)
  payment_type      String? @db.VarChar(50)
  status            String? @default("pending") @db.VarChar(50)

  users users @relation(fields: [user_id], references: [user_id])

  @@map("ebook_payments")
}
```

### New Tables Required

```prisma
model ebook_conversion_jobs {
  id                Int       @id @default(autoincrement())
  ebook_id          Int       @unique
  status            String    @default("pending") @db.VarChar(20) // pending, queued, processing, converted, failed
  converted_file    String?   @db.VarChar(500)
  download_token    String?   @db.VarChar(100)
  download_expires  DateTime? @db.DateTime(0)
  error_message     String?   @db.Text
  started_at        DateTime? @db.DateTime(0)
  completed_at      DateTime? @db.DateTime(0)
  created_at        DateTime  @default(now()) @db.DateTime(0)
  updated_at        DateTime  @updatedAt @db.DateTime(0)

  @@index([status])
  @@map("ebook_conversion_jobs")
}

model ebook_notifications {
  id            Int       @id @default(autoincrement())
  ebook_id      Int
  channel       String    @db.VarChar(20) // email, sms, whatsapp
  status        String    @default("pending") @db.VarChar(20)
  message       String?   @db.Text
  sent_at       DateTime? @db.DateTime(0)
  error_message String?   @db.Text
  created_at    DateTime  @default(now()) @db.DateTime(0)

  @@index([ebook_id])
  @@index([status])
  @@map("ebook_notifications")
}

model ebook_audit_logs {
  id          Int      @id @default(autoincrement())
  ebook_id    Int
  admin_id    Int
  action      String   @db.VarChar(50) // started, completed, failed, link_sent, retried
  details     String?  @db.Text
  created_at  DateTime @default(now()) @db.DateTime(0)

  @@index([ebook_id])
  @@map("ebook_audit_logs")
}
```

---

## 5. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Admin login |
| `/api/auth/me` | GET | Get current admin |
| `/api/ebook-jobs` | GET | List jobs with filters |
| `/api/ebook-jobs/:id` | GET | Get job details |
| `/api/ebook-jobs/:id/status` | PUT | Update job status |
| `/api/ebook-jobs/:id/start` | POST | Start/queue conversion |
| `/api/ebook-jobs/:id/retry` | POST | Retry failed conversion |
| `/api/ebook-jobs/:id/upload` | POST | Upload converted file |
| `/api/ebook-jobs/:id/link` | POST | Generate download link |
| `/api/ebook-jobs/:id/notify` | POST | Send notification to user |
| `/api/ebook-jobs/:id/audit` | GET | Get audit log for job |
| `/api/notifications/channels` | GET | Get available notification channels |

---

## 6. Application Structure

```
PARALEE-ADMIN/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI (Button, Input, Card, etc.)
│   │   ├── layout/          # AppLayout, Sidebar, Header
│   │   └── jobs/            # Job-specific components
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── JobsPage.tsx     # Main queue with tabs
│   │   ├── JobDetailPage.tsx
│   │   └── SettingsPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useJobs.ts
│   │   └── usePermissions.ts
│   ├── lib/
│   │   ├── api.ts           # Axios instance
│   │   └── store.ts         # Zustand store
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   └── main.rs          # Tauri entry
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## 7. UI/UX Specification

### 7.1 Login Page
- Centered card on branded background
- Email + password fields
- "Sign In" button
- Error message display

### 7.2 Main Layout
- **Sidebar:** Navigation (Jobs, Settings, Logout)
- **Header:** Admin name, notifications badge
- **Content Area:** Dynamic page content

### 7.3 Jobs Page
- **Tabs:** Pending | Processing | Completed | Failed
- **Filters:** Search by title/author/user, date range
- **Table Columns:**
  - ID
  - Book Title
  - Author
  - User Name
  - Payment Status
  - Conversion Status
  - Date Uploaded
  - Actions
- **Actions Menu:** View | Start/Retry | Mark Failed | Upload | Send Link

### 7.4 Job Detail Page
- **Header:** Book title, status badge
- **User Info Card:** Name, email, phone
- **File Info:** Original file, cover image, format
- **Conversion Panel:**
  - Status timeline
  - Start/Retry button
  - Upload converted file (drag & drop)
  - Error message display
- **Notification Panel:**
  - Channel selector (Email/SMS/WhatsApp)
  - Send button
  - Notification history
- **Audit Log:** Timestamped action history

### 7.5 Visual Design
- **Primary Color:** `#2563EB` (Blue 600)
- **Secondary:** `#64748B` (Slate 500)
- **Success:** `#22C55E` (Green 500)
- **Error:** `#EF4444` (Red 500)
- **Warning:** `#F59E0B` (Amber 500)
- **Background:** `#F8FAFC` (Slate 50)
- **Card BG:** `#FFFFFF`
- **Text Primary:** `#1E293B` (Slate 800)
- **Text Secondary:** `#64748B` (Slate 500)

---

## 8. Security Requirements

- All API calls require valid JWT token
- Tokens stored in OS secure storage (Tauri store plugin)
- API rate limiting on login endpoint
- Download links are:
  - Time-limited (24h default)
  - Non-guessable (UUID + timestamp hash)
- All admin actions logged to audit table
- No sensitive data logged to console

---

## 9. Desktop Features

- **Window Controls:** Custom titlebar with minimize/maximize/close
- **File Dialog:** Native file picker for converted file upload
- **Notifications:** Native system notifications for new jobs
- **Auto-Update:** Check for updates on startup
- **System Tray:** Background running with tray icon

---

## 10. Out of Scope

- User registration/login (separate system)
- Payment processing (separate system)
- Book catalog management
- Library management
- Any features not related to ebook conversion

---

## 11. Acceptance Criteria

1. ✅ Admin can log in with valid credentials
2. ✅ Jobs display in correct status tabs
3. ✅ Admin can view job details
4. ✅ Admin can start/retry conversion
5. ✅ Admin can upload converted file
6. ✅ Admin can generate download link
7. ✅ Admin can send notification to user
8. ✅ All actions logged to audit
9. ✅ App builds to executable (.exe)
10. ✅ App runs standalone without browser
