# Permission Grouping & Role Architecture

## Overview

This document defines the optimized permission structure for the Dads Bookshelves system. Instead of storing 5,428 individual permission records, we organize permissions into **modules** and **actions**.

## Current Problem

- **5,428 permission rows** in database
- Massive duplication (same permissions repeated 100+ times)
- Hard to maintain and audit
- Slow queries

## Proposed Solution

### 1. Permission Modules (Grouping)

Organize all features into **15 logical modules**:

| Module ID | Module Name | Description | Routes Count |
|-----------|-------------|-------------|--------------|
| 1 | **User Management** | Users, roles, permissions, account | ~15 |
| 2 | **Content** | Books, genres, featuredbooks, stories, sliders | ~25 |
| 3 | **Ebook Publishing** | Ebookuploader, conversion, pricing | ~15 |
| 4 | **Library** | Library access, books, membership | ~20 |
| 5 | **Shopping** | Cart, orders, orderitems | ~20 |
| 6 | **Payments** | All payment processing | ~20 |
| 7 | **Clients** | Client management, consents | ~15 |
| 8 | **Marketing** | Marketers, affiliates, referrals | ~15 |
| 9 | **Reports** | Sales, income, inventory reports | ~15 |
| 10 | **Publishing** | Publishers, publishing books/fees | ~15 |
| 11 | **Settings** | App settings, pricelist | ~10 |
| 12 | **Donations** | Donation management | ~5 |
| 13 | **Devices** | Device management | ~5 |
| 14 | **Limitless** | Limitless initiative | ~10 |
| 15 | **Public** | Public pages (no auth needed) | ~20 |

### 2. Permission Actions

Standard CRUD actions across all modules:

| Action Code | Action Name | Description |
|-------------|-------------|-------------|
| VIEW | View/List | View list and details |
| CREATE | Add | Create new records |
| EDIT | Edit | Update existing records |
| DELETE | Delete | Remove records |
| IMPORT | Import | Import data |
| EXPORT | Export | Export data |

### 3. New Database Schema

```sql
-- Modules table (15 rows instead of 5000+)
CREATE TABLE `permission_modules` (
  `module_id` INT PRIMARY KEY AUTO_INCREMENT,
  `module_name` VARCHAR(50) NOT NULL UNIQUE,
  `module_code` VARCHAR(30) NOT NULL UNIQUE,
  `description` VARCHAR(255),
  `category` VARCHAR(50),  -- 'management', 'commerce', 'content', 'public'
  `sort_order` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Actions table (7 rows)
CREATE TABLE `permission_actions` (
  `action_id` INT PRIMARY KEY AUTO_INCREMENT,
  `action_name` VARCHAR(50) NOT NULL,
  `action_code` VARCHAR(20) NOT NULL UNIQUE,
  `description` VARCHAR(255),
  `sort_order` INT DEFAULT 0
);

-- Role hierarchy (supports inheritance)
CREATE TABLE `roles` (
  `role_id` INT PRIMARY KEY AUTO_INCREMENT,
  `role_name` VARCHAR(50) NOT NULL UNIQUE,
  `role_code` VARCHAR(30) NOT NULL UNIQUE,
  `parent_role_id` INT DEFAULT NULL,  -- For permission inheritance
  `description` VARCHAR(255),
  `is_system` BOOLEAN DEFAULT FALSE,  -- System roles cannot be deleted
  `is_active` BOOLEAN DEFAULT TRUE,
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`parent_role_id`) REFERENCES `roles`(`role_id`)
);

-- Role permissions (compact - ~100 rows total)
CREATE TABLE `role_permissions` (
  `role_id` INT NOT NULL,
  `module_id` INT NOT NULL,
  `action_id` INT NOT NULL,
  `is_granted` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`, `module_id`, `action_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE CASCADE,
  FOREIGN KEY (`module_id`) REFERENCES `permission_modules`(`module_id`) ON DELETE CASCADE,
  FOREIGN KEY (`action_id`) REFERENCES `permission_actions`(`action_id`) ON DELETE CASCADE
);

-- User custom permissions (for special grants)
CREATE TABLE `user_custom_permissions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `module_id` INT NOT NULL,
  `action_id` INT NOT NULL,
  `is_granted` BOOLEAN DEFAULT TRUE,
  `granted_by` INT DEFAULT NULL,  -- Superadmin who granted
  `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME DEFAULT NULL,  -- Optional expiration
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`module_id`) REFERENCES `permission_modules`(`module_id`) ON DELETE CASCADE,
  FOREIGN KEY (`action_id`) REFERENCES `permission_actions`(`action_id`) ON DELETE CASCADE
);
```

---

## Detailed Module Definitions

### Module 1: User Management
```
Routes:
- /users (list, view, add, edit)
- /account (view, edit)
- /roles (list, view, add, edit, delete)
- /permissions (list, view, add, edit, delete)
- /assignrights
- /rightlist
```

### Module 2: Content Management
```
Routes:
- /books (list, view, add, edit, delete, shop, import)
- /genres (list, view, add, edit, delete)
- /featuredbooks (list, view, add, edit, delete)
- /stories (list, view, add, edit, delete, clientblog)
- /sliders (list, view, add, edit, delete)
- /currentsliders
- /archive
```

### Module 3: Ebook Publishing
```
Routes:
- /ebookuploader (list, view, add, edit, delete, paymentcheck, convert, pending, converted)
- /ebookpricing (list, view, add, edit, delete)
- /ebookpayments (list, view, add, edit, delete, capture_order)
- /ebook (public page)
- /ebook-conversion
```

### Module 4: Library System
```
Routes:
- /librarybooks (list, view, add, edit)
- /libraryaccess (list, view, add, edit, delete, adminlibraryaccess)
- /mainlibrary
- /offlinelibrary
- /membership (list, view, add, edit, delete)
- /library
```

### Module 5: Shopping/Cart
```
Routes:
- /cartitems (list, view, add, edit, delete, additem)
- /orders (list, view, add, edit, delete)
- /orderitems (list, view, add, edit, delete)
- /cartcheckout
```

### Module 6: Payments
```
Routes:
- /payments (list, view, add, edit, propmtstk, stkcallback, create_order, capture_order)
- /dslibrarypayments (list, view, add, edit, callback)
- /publisherpayments (list, view, add, edit)
- /donations (list, view, add, edit)
```

### Module 7: Clients
```
Routes:
- /clients (list, view, add, edit, delete, importdata)
- /consents (list, view, add, edit, delete)
- /newslettersubscriptions (list, view, add, edit)
```

### Module 8: Marketing/Affiliates
```
Routes:
- /marketers (list, view, add, edit, wallet)
- /affiliatelinks (list, view, add, edit)
- /referrals (list, view)
- /campaigns
```

### Module 9: Reports
```
Routes:
- /salesreports (list, view, add, edit, delete)
- /salesbooks (list, view, add, edit, delete)
- /incomereports (list, view, add, edit, delete)
- /inventory (list, view, add, edit, delete)
- /readinghistory
```

### Module 10: Publishing
```
Routes:
- /publishers (list, view, add, edit, delete)
- /publishingbooks (list, view, add, edit, delete)
- /publishingfee (list, view, add, edit, delete)
- /sellbooks
- /publish
```

### Module 11: Settings
```
Routes:
- /settings (list, view, add, edit, delete)
- /pricelist (list, view, add, edit)
- /feesetting
```

### Module 12: Donations
```
Routes:
- /donation (public)
- /donations (admin)
```

### Module 13: Devices
```
Routes:
- /devices (register, management)
- /userdevices
```

### Module 14: Limitless Initiative
```
Routes:
- /limitlessintiative
- /limitless (list, view, add, edit)
- /about_limitless
- /dbspricelist
```

### Module 15: Public Pages
```
Routes:
- /login, /signin
- /forgotpassword, /resetpassword
- /googlecallback
- /privacy, /terms
- /getinvolved
- /support/contact
- /aboutus, /help
```

---

## Default Role Permissions

### Role 1: Super Admin
```javascript
{
  role_name: "Super Admin",
  role_code: "super_admin",
  parent_role_id: null,
  is_system: true,
  permissions: {
    // ALL modules, ALL actions
    all: true
  }
}
```

### Role 2: Admin
```javascript
{
  role_name: "Admin",
  role_code: "admin",
  parent_role_id: 1,  // Inherits from Super Admin
  is_system: true,
  permissions: {
    user_management: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"],
    content: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT", "EXPORT"],
    ebook: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT", "EXPORT"],
    library: ["VIEW", "CREATE", "EDIT", "DELETE"],
    shopping: ["VIEW", "CREATE", "EDIT", "DELETE"],
    payments: ["VIEW", "CREATE", "EDIT", "DELETE"],
    clients: ["VIEW", "CREATE", "EDIT", "DELETE"],
    marketing: ["VIEW", "CREATE", "EDIT", "DELETE"],
    reports: ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"],
    publishing: ["VIEW", "CREATE", "EDIT", "DELETE"],
    settings: ["VIEW", "CREATE", "EDIT", "DELETE"],
    donations: ["VIEW", "CREATE", "EDIT", "DELETE"],
    devices: ["VIEW", "CREATE", "EDIT", "DELETE"],
    limitless: ["VIEW", "CREATE", "EDIT", "DELETE"]
  }
}
```

### Role 3: Developer
```javascript
{
  role_name: "Developer",
  role_code: "developer",
  parent_role_id: 2,  // Inherits from Admin
  is_system: true,
  permissions: {
    // Same as admin + settings management
    settings: ["VIEW", "CREATE", "EDIT", "DELETE"],
    feesetting: ["VIEW", "CREATE", "EDIT", "DELETE"]
  }
}
```

### Role 4: Publisher
```javascript
{
  role_name: "Publisher",
  role_code: "publisher",
  parent_role_id: null,
  is_system: false,
  permissions: {
    content: ["VIEW", "CREATE", "EDIT"],  // Own content only
    ebook: ["VIEW", "CREATE"],
    publishing: ["VIEW", "CREATE", "EDIT"],  // Own only
    reports: ["VIEW"]  // Own reports only
  }
}
```

### Role 5: Client (Customer)
```javascript
{
  role_name: "Client",
  role_code: "client",
  parent_role_id: null,
  is_system: true,
  permissions: {
    library: ["VIEW"],  // View only based on membership
    shopping: ["VIEW", "CREATE", "EDIT"],  // Own cart/orders
    payments: ["VIEW", "CREATE"],
    content: ["VIEW"],  // View books
    ebook: ["VIEW"],
    donations: ["CREATE"]
  }
}
```

### Role 6: Marketer
```javascript
{
  role_name: "Marketer",
  role_code: "marketer",
  parent_role_id: null,
  is_system: false,
  permissions: {
    marketing: ["VIEW", "CREATE", "EDIT"],
    affiliates: ["VIEW", "CREATE", "EDIT"],
    referrals: ["VIEW"],
    reports: ["VIEW"],  // Own performance only
    wallet: ["VIEW"]
  }
}
```

### Role 7: User (Basic)
```javascript
{
  role_name: "User",
  role_code: "user",
  parent_role_id: null,
  is_system: true,
  permissions: {
    content: ["VIEW"],
    library: ["VIEW"],  // Based on membership
    shopping: ["VIEW", "CREATE"],  // Cart only
    account: ["VIEW", "EDIT"]
  }
}
```

---

## Special Permission Feature: Custom User Permissions

Super Admins can grant **additional permissions** to any user without changing their role:

```sql
-- Example: Grant user ID 5 the ability to edit settings
INSERT INTO user_custom_permissions 
  (user_id, module_id, action_id, is_granted, granted_by, expires_at)
VALUES 
  (5, 11, 3, TRUE, 1, NULL);  -- module 11 = settings, action 3 = EDIT

-- Example: Temporary promotion - grant admin permissions for 7 days
INSERT INTO user_custom_permissions 
  (user_id, module_id, action_id, is_granted, granted_by, expires_at)
VALUES 
  (8, 1, 4, TRUE, 1, DATE_ADD(NOW(), INTERVAL 7 DAY));  -- Delete permission for 7 days
```

---

## Migration Strategy

### Phase 1: Backup (DO NOT SKIP)
```sql
-- Create backup tables
CREATE TABLE permissions_backup AS SELECT * FROM permissions;
CREATE TABLE roles_backup AS SELECT * FROM roles;
CREATE TABLE users_backup AS SELECT * FROM users;
```

### Phase 2: Create New Tables
```sql
-- Run CREATE TABLE statements (see above)
```

### Phase 3: Seed Data
```sql
-- Insert 15 modules
-- Insert 7 actions  
-- Insert roles with hierarchy
-- Insert role_permissions (~100 rows)
```

### Phase 4: Update Application Code
- Update RBAC helper to use new schema
- Update permission checks
- Update admin UI

### Phase 5: Test & Deploy
- Test in staging
- Monitor logs
- Rollback if needed

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Permission rows | 5,428 | ~100 | **98% reduction** |
| Database size | ~284KB | ~10KB | **96% smaller** |
| Query time | O(n) | O(1) | **Much faster** |
| Maintenance | Difficult | Easy | **Clean** |

---

## Files to Update

1. **Database**: `API/ebookdbs.sql` - Add new tables
2. **Models**: 
   - `API/models/permissions.js` - Update
   - `API/models/roles.js` - Update
3. **Helpers**:
   - `API/helpers/rbac.js` - Update logic
   - `API/helpers/auth_middleware.js` - May need updates
4. **Frontend**:
   - `FRONTEND/src/composables/auth.js` - Update role checks

---

*Document Version: 1.0*
*Created: 2026-03-18*
