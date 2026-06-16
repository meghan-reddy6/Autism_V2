# Frontend: React Components

## Overview
- **Component:** `frontend/components`
- **Purpose:** A centralized directory for all reusable React components utilized across the Next.js App Router views.
- **Responsibilities:** Provide UI primitives, implement Higher-Order-Component style Route Guards, and isolate complex sub-page functionality (like ML Modals and MFA Settings) from page-level routing.

---

## Architecture & Directory Structure

### 1. Route Guards (`AuthGuard.tsx` & `AdminGuard.tsx`)
- **Purpose:** Next.js Server Components cannot easily access browser LocalStorage or Zustand state. These components act as client-side wrapper boundaries that enforce authorization before rendering protected children.
- **Business Logic:**
  - `AuthGuard.tsx`: Intercepts unauthenticated users. If the Zustand `user` object is missing, or the JWT is absent, it forces an immediate redirect (`router.replace('/login')`). It checks the `token_exp` (JWT Expiration) to prevent rendering if the session has timed out.
  - `AdminGuard.tsx`: Extends `AuthGuard`. Explicitly verifies that `user.role === 'SUPER_ADMIN'`. If a clinic doctor attempts to navigate to `/admin`, this guard intercepts the request and routes them back to the clinic dashboard.

### 2. `clinical/` (Clinical Sub-Components)
Contains components specific to the medical/assessment domain.
- **`CDSSModal.tsx`**: The Clinical Decision Support System pop-up.
  - **Responsibilities:** Renders the "Explainable AI" results after an assessment is scored. It parses the `shap_breakdown` JSON from the ML service and dynamically renders progress bars indicating which features (e.g., Age vs. Score) drove the prediction.
  - **Inputs:** `isOpen` (boolean), `onClose` (callback), `assessment` (the complete JSON object returned by the backend).

### 3. `ui/` (Design System Primitives)
Contains generic, highly reusable UI building blocks built with Tailwind CSS.
- **`Card.tsx`**: A composable wrapper containing `Card`, `CardHeader`, `CardTitle`, `CardContent`, and `CardDescription`.
- **`Button.tsx`**: A configurable button component utilizing `class-variance-authority` (or similar conditional class merging via `clsx`/`tailwind-merge`) to support `variant="danger"`, `variant="outline"`, etc.
- **`Badge.tsx`**: Small pills used for status indicators (e.g., High Risk vs Low Risk).

### 4. `SecuritySettings.tsx`
- **Purpose:** A monolithic, highly-stateful component encapsulating all Phase B Security requirements for the end-user.
- **Features:**
  - **Password Changes:** Interfaces with `POST /api/v1/auth/change-password`.
  - **MFA Setup:** Calls `POST /api/v1/mfa/setup`, displays the base64 Google Authenticator QR Code, and submits the TOTP verification pin.
  - **MFA Disabling:** Handles the un-enrollment flow.
- **Usage:** This component is embedded into both `app/(clinic)/settings/page.tsx` and `app/admin/settings/page.tsx`, ensuring clinical staff and Super Admins share the exact same battle-tested security UI.

### 5. `LogoutButton.tsx` & `AdminLogoutButton.tsx`
- **Purpose:** Safely destroys the user session.
- **Execution Flow:**
  1. Calls `POST /api/v1/auth/logout` via the API client to ensure the active JWT is pushed to the Redis Blocklist.
  2. Clears the Zustand `useAuthStore`.
  3. Uses Next.js `useRouter` to forcibly navigate to `/login`.
