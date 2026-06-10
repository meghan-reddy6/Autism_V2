# Frontend: Authentication Views

## Overview
- **Component:** `frontend/app/(auth)`
- **Purpose:** Next.js Route Group handling unauthenticated entry points.
- **Responsibilities:** Provide the user interface for signing in, capturing initial credentials, routing to role-specific dashboards, and gracefully handling Multi-Factor Authentication prompts.
- **Why it exists:** The `(auth)` folder utilizes Next.js Route Groups. The parentheses mean this directory does not affect the URL path (the URL is just `/login`, not `/auth/login`), but it allows all authentication pages to share a specific `layout.tsx` that strips away the main application sidebar and headers.

---

## Architecture & Communication

### `login/page.tsx`
- **Dependencies:** React Hook Form, Zod (for schema validation), Zustand (`useAuthStore`), `fetch`.
- **Data Flow:**
  1. User enters Email and Password. Zod validates the email format and password presence.
  2. The form submits a standard `application/x-www-form-urlencoded` payload to `/api/v1/auth/login`. (Note: This targets the Next.js API proxy).
  3. If the backend returns `403` with `X-MFA-Required`, the form catches this exception.
  4. State changes: `isMfaStep = true`. The UI immediately hides the email/password fields and displays the 6-digit Authenticator Code input.
  5. User submits the code. The form makes a *second* request to `/api/v1/auth/login`, this time attaching the `X-MFA-Token` header.
  6. Upon receiving a `200 OK`, the JWT is parsed.
  7. **Routing:** 
     - If `user.role === "SUPER_ADMIN"`, redirect to `/admin`.
     - If `user.role === "PARENT_USER"`, redirect to `/my-child`.
     - Otherwise, redirect to `/dashboard` (Clinic UI).

---

## Error Handling
- **Rate Limiting:** If the user exceeds 5 login attempts per minute, the backend returns a `429 Too Many Requests`. The `try/catch` block extracts this `detail` string and displays a red error banner to the user.
- **Invalid Credentials:** A generic "Invalid credentials" error is shown to prevent username enumeration attacks.

---

## Known Limitations
- Password Reset ("Forgot Password") flows are currently not implemented. In an enterprise clinical setting, password resets are often handled manually by an IT administrator, but an automated email-based flow is planned for future phases.
