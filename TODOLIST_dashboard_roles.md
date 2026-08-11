# Dashboard & Role Separation TODO

## Objectives
- Separate dashboard files for each role
- Admin dashboard shared by admin, super_admin, developer (permission-based)
- Remove "regular user" role (these are clients)
- Admin can add new admins with special permission

---

## ✅ COMPLETED TASKS

### Phase 1: Database & Backend - DONE
- [x] Created migration file `add_author_role.sql` (role_id = 6)
- [x] Added permission_modules for author_earnings, author_wallet
- [x] Granted VIEW permissions to Author role
- [x] Updated `homeController.ts` with author stats

### Phase 2: Create Separate Dashboard Files - DONE
- [x] Created `ClientDashboard.tsx`
- [x] Created `AuthorDashboard.tsx`
- [x] Created `MarketerDashboard.tsx`
- [x] AdminDashboard.tsx (still in DashboardPage.tsx - needs extraction)

### Phase 3: Route Setup in App.tsx - DONE
- [x] Route `/dashboard` based on userRole
- [x] Client → ClientDashboard
- [x] Author → AuthorDashboard
- [x] Marketer → MarketerDashboard
- [x] Admin/SuperAdmin/Developer → DashboardPage (permission-based)

### Phase 2: Create Separate Dashboard Files

#### 2.1 Extract Client Dashboard
- [ ] Create `pages/dashboard/ClientDashboard.tsx`
- [ ] Move isClient section from DashboardPage.tsx

#### 2.2 Extract Marketer Dashboard
- [ ] Create `pages/dashboard/MarketerDashboard.tsx`  
- [ ] Move isMarketer section from DashboardPage.tsx

#### 2.3 Extract Author Dashboard
- [ ] Create `pages/dashboard/AuthorDashboard.tsx`
- [ ] Move isAuthor section from DashboardPage.tsx

#### 2.4 Refactor Admin Dashboard
- [ ] Create `pages/dashboard/AdminDashboard.tsx`
- [ ] Merge isSuperAdmin + isAdmin + isDeveloper into ONE file
- [ ] Use permission-based rendering (canView checks)
- [ ] Remove role-specific conditionals, use permissions only

### Phase 3: Role Cleanup
- [ ] Identify and handle "user" role - convert to client or remove
- [ ] Ensure only valid roles: client, author, marketer, admin, super_admin

### Phase 4: Admin Permissions Enhancement
- [ ] Add permission to create/super_admin other admins
- [ ] Create module `admin_management` with CREATE permission
- [ ] Add UI for admin with this permission to add new admins

### Phase 5: Route Setup in App.tsx
- [ ] Route `/dashboard` based on userRole
- [ ] Client → ClientDashboard
- [ ] Author → AuthorDashboard
- [ ] Marketer → MarketerDashboard
- [ ] Admin/SuperAdmin/Developer → AdminDashboard (permission-based)

---

## Current Role Structure (Target)
| Role | role_id | Dashboard |
|------|---------|-----------|
| client | 5 | ClientDashboard.tsx |
| author | 6 | AuthorDashboard.tsx |
| marketer | 4 | MarketerDashboard.tsx |
| admin | 2 | AdminDashboard.tsx (permission-based) |
| super_admin | 1 | AdminDashboard.tsx (permission-based) |

---

## Files to Create/Modify
1. `FRONTEND-RTX/src/pages/dashboard/ClientDashboard.tsx` (NEW)
2. `FRONTEND-RTX/src/pages/dashboard/AuthorDashboard.tsx` (NEW - extract from DashboardPage.tsx)
3. `FRONTEND-RTX/src/pages/dashboard/MarketerDashboard.tsx` (NEW - extract from DashboardPage.tsx)
4. `FRONTEND-RTX/src/pages/dashboard/AdminDashboard.tsx` (NEW - merge all admin roles)
5. `FRONTEND-RTX/src/App.tsx` (MODIFY - route based on userRole)
