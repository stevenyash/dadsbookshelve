# Paralee Admin - Book Conversion Manager

## 1. Project Overview

**Project Name:** Paralee Admin (Paralee Tauri App)
**Type:** Desktop Application (Tauri 2.x + React 18)
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

The app uses existing `ebook_uploader` table:

```prisma
model ebook_uploader {
  id               Int     @id @default(autoincrement())
  book             String? @db.VarChar(500)
  user_id          Int?
  final_copy       String? @db.VarChar(500)
  readium_manifest String? @db.VarChar(255)
  date_uploaded    String? @db.VarChar(50)
  payment_status   String? @db.VarChar(50)
  payment_id       String? @db.VarChar(50)
  status           String? @db.VarChar(50)
  book_title       String? @db.VarChar(500)
  isbn             String? @db.VarChar(50)
  author           String? @db.VarChar(50)
  cover_image      String? @db.VarChar(500)

  users users? @relation(fields: [user_id], references: [user_id])

  @@map("ebook_uploader")
}
```

---

## 5. Application Structure

```
PARALEE-ADMIN/
├── src/
│   ├── components/
│   │   ├── ui/              # Button, Input, Card, Badge
│   │   └── layout/          # Layout (sidebar, navbar)
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── JobsPage.tsx     # Main queue with tabs
│   │   └── JobDetailPage.tsx
│   ├── hooks/
│   │   └── useJobs.ts       # React Query hooks
│   ├── lib/
│   │   ├── api.ts           # Axios instance
│   │   └── store.ts         # Zustand auth store
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── vite.config.ts
```

---

## 6. API Endpoints (Expected)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Admin login |
| `/api/auth/me` | GET | Get current admin |
| `/api/ebook-jobs` | GET | List jobs with filters |
| `/api/ebook-jobs/:id` | GET | Get job details |
| `/api/ebook-jobs/:id/start` | POST | Start/queue conversion |
| `/api/ebook-jobs/:id/retry` | POST | Retry failed conversion |
| `/api/ebook-jobs/:id/fail` | POST | Mark as failed |
| `/api/ebook-jobs/:id/link` | POST | Generate download link |
| `/api/ebook-jobs/:id/notify` | POST | Send notification |
| `/api/ebook-jobs/:id/audit` | GET | Get audit logs |

---

## 7. UI Screens

### Login Page
- Centered card with email/password fields
- "Sign In" button
- Error message display

### Jobs Page (Main)
- Tabs: All | Pending | Paid | Processing | Converted | Failed
- Search bar for filtering
- Table with columns: ID, Book Title, Author, User, Payment, Status, Date, Actions
- Action buttons: View, Start, Retry, Mark Failed

### Job Detail Page
- Header with job title and status badges
- Left column: File info, conversion actions, notification panel, audit log
- Right column: User info, status timeline

---

## 8. Acceptance Criteria

1. Admin can log in with valid credentials
2. Jobs display in correct status tabs
3. Admin can view job details
4. Admin can start/retry conversion
5. Admin can mark job as failed
6. Admin can upload converted file (via native dialog)
7. Admin can generate download link
8. Admin can send notification to user
9. All actions logged
10. App builds to .exe successfully

---

## 9. Deployment

### Production CORS Configuration

The CORS is secure by default:

- **Development**: Allows `localhost` on any port
- **Production**: Only allows origins in `ALLOWED_ORIGINS` env variable

```env
# API server (.env)
NODE_ENV=production
ALLOWED_ORIGINS=https://admin.yourdomain.com,https://yourdomain.com
```

### Tauri App Configuration

For production, the API URL should be configured at build time:

```env
# PARALEE-ADMIN/.env.production
VITE_API_URL=https://api.yourdomain.com/api
```

The app will make requests to this fixed production API - no CORS issues since it's the same origin or properly configured.

### Security Notes

- JWT tokens expire (default 60 minutes)
- Admin endpoints require `admin` or `super_admin` role
- Download links are time-limited (24h default) with unique tokens
- All admin actions are logged
- Rate limiting on auth endpoints