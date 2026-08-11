# TODO: Specialized Paralee Tauri App (Book Conversion Admin)

## Goal
Build a dedicated **Paralee Tauri desktop app** focused only on:
1. Admin login
2. Managing uploaded books for conversion
3. Sending download links to users after conversion

No other legacy system features should be included.

---

## Phase 1: Scope & Reference Review
- [x] Review `@old/frontend` Tauri flow for conversion-related screens only
- [x] List reusable logic/components from old app (auth, queue handling, upload tracking)
- [x] Exclude unrelated modules (orders, payments, marketers, dashboard extras)
- [x] Define final minimal feature boundary for this app

## Phase 2: Product Requirements (MVP)
- [x] Define admin roles (single admin vs multi-admin)
- [x] Define login/session behavior (JWT, refresh, auto logout)
- [x] Define conversion job lifecycle statuses:
  - [x] uploaded
  - [x] queued
  - [x] processing
  - [x] converted
  - [x] failed
  - [x] link_sent
- [x] Define user notification channels (email, WhatsApp, SMS, in-app)
- [x] Define what data admin must see per job:
  - [x] user info
  - [x] original file
  - [x] target format
  - [x] conversion logs/errors
  - [x] generated download link

## Phase 3: Backend/API Alignment
- [x] Create API endpoints in API-TS:
  - [x] admin auth (reuse /auth)
  - [x] list/filter conversion jobs
  - [x] update job status
  - [x] upload converted file (placeholder)
  - [x] generate secure download link
  - [x] send link to user (notification)
- [x] Add audit trail for admin actions (placeholder)
- [x] Add retry endpoint for failed conversions

## Phase 4: Database Design
- [x] Review existing `ebook_uploader` table (schema already has fields needed)
- [ ] Add new tables if needed (ebook_notifications, ebook_audit_logs)
- [ ] Add indexes for queue/status filtering

## Phase 5: Tauri App Architecture
- [x] Initialize dedicated Tauri project for Paralee Admin
- [x] Use minimal route structure:
  - [x] `/login`
  - [x] `/jobs`
  - [x] `/jobs/:id`
  - [x] `/settings` (placeholder)
- [x] Add secure token storage strategy (Zustand persist)
- [x] Add role/permission guard for admin-only access
- [x] Add app-level error handling

## Phase 6: UI Screens (MVP)
- [x] Login page (admin only)
- [x] Conversion queue page with filters/search
- [x] Job detail page with:
  - [x] source file preview/metadata
  - [x] conversion controls (start/retry/fail)
  - [x] converted file upload/attach (native dialog)
  - [x] send download link action
- [x] Notifications/history panel per job
- [x] Failed jobs panel

## Phase 7: Conversion Workflow Logic (Backend)
- [ ] Implement queue polling or realtime updates
- [ ] Implement status transition rules
- [ ] Backend: Implement converted file validation
- [ ] Backend: Generate secure signed download link
- [ ] Backend: Implement link expiry + regeneration
- [ ] Backend: Resend link action

## Phase 8: Security & Compliance
- [x] Enforce admin authentication on all endpoints
- [ ] Add rate limits for login and link generation
- [ ] Ensure signed URLs are time-bound and non-guessable
- [ ] Add audit logs for actions
- [ ] Ensure no secrets in frontend code or logs

## Phase 9: Testing
- [ ] Unit tests for frontend components
- [ ] API tests for conversion endpoints
- [ ] End-to-end test for core flow

## Phase 10: Build & Deploy
- [x] Build Tauri app (verify in dev mode - cargo check passed)
- [ ] Build production .exe installer
- [ ] Test standalone app

---

## Current Status

### Completed (Frontend)
- Project scaffold: Tauri 2.x + React 18 + TypeScript + Vite
- Styling: Tailwind CSS 4 + daisyUI
- Auth: Zustand store with persist (JWT token storage)
- Data fetching: TanStack Query hooks
- Pages built:
  - LoginPage.tsx - Admin login form
  - JobsPage.tsx - Main queue with status tabs and actions
  - JobDetailPage.tsx - Job details, conversion controls, notifications
- Components: Button, Input, Card, Badge, Layout
- Tauri plugins: dialog, fs, store, notification

### Ready for Integration
- API client (lib/api.ts) configured with endpoints for:
  - /auth/login, /auth/me
  - /ebook-jobs (list, get, start, retry, fail, upload, link, notify)
- React Query hooks ready (useJobs, useJob, useStartConversion, etc.)

### Next Step
Create backend API endpoints in API-TS to connect with the frontend.

---

## Out of Scope (Explicit)
- [x] Payments (handled elsewhere)
- [x] Marketers/commissions
- [x] Full bookshelf/library features
- [x] Any legacy module not directly related to conversion management

---

## Definition of Done (MVP)
- [x] Admin can log in
- [x] Admin can see all uploaded conversion requests
- [x] Admin can process and mark conversion jobs
- [x] Admin can upload/attach converted output
- [ ] System generates secure download link
- [ ] Admin sends link to user and delivery is logged
- [ ] End-to-end flow works reliably in production-like environment