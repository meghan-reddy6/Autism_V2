# Frontend: Super Admin Portal

## Overview
- **Component:** `frontend/app/admin`
- **Purpose:** A heavily restricted workspace exclusively for users with the `SUPER_ADMIN` role.
- **Responsibilities:** Managing Multi-Tenant organizations, global user oversight, system health monitoring, and restoring soft-deleted data.

---

## Architecture & Layout
All routes inside `admin` share the `layout.tsx` file.
- **Layout:** Replaces the bright blue clinical navigation sidebar with a dark, distinct "System Control" sidebar. This prevents Super Admins from confusing the admin panel with the clinical EMR views.
- **Authorization:** Wrapped entirely in `<AdminGuard>`, which verifies `user.role === 'SUPER_ADMIN'`. Any other role is immediately redirected away.

---

## Directory Structure & Business Logic

### `/` (Root Dashboard)
- **Purpose:** High-level platform statistics.
- **Features:** Displays metrics like Total Organizations, Global Users, and System Health status.

### `/organizations`
- **Purpose:** Multi-Tenant management.
- **Features:** Allows admins to view and manage `Tenant` entities (e.g., adding a new hospital system to the platform).

### `/users`
- **Purpose:** Global user management.
- **Features:** Admins can view all accounts across all tenants. This is crucial for overriding lockouts, resetting MFA (`mfaEnabled = false`), or suspending compromised accounts.

### `/system`
- **Purpose:** Infrastructure monitoring.
- **Features:** Polls `/api/v1/admin/system/health` to verify that PostgreSQL, Redis, and the ML Service are online and responding within acceptable latencies.

### `/recycle-bin`
- **Purpose:** Data Compliance & Recovery.
- **Business Logic:** Because clinical software rarely allows hard SQL deletes, this view queries the backend explicitly for records where `isDeleted == true`. Admins can review who deleted the record, when they deleted it, and click "Restore" to reverse the soft-delete flag seamlessly.

### `/settings`
- **Purpose:** Admin Security Preferences.
- **Features:** Like the clinical `/settings` page, this imports the monolithic `<SecuritySettings />` component to allow Super Admins to change their passwords and enforce TOTP Multi-Factor Authentication.
