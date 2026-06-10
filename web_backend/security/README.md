# Web Backend: Security Module

## Overview
- **Component Name:** `web_backend/security`
- **Purpose:** Centralized repository for isolated, highly critical security functions.
- **Responsibilities:** Password validation, hashing, cryptographic verifications, and enforcing enterprise-grade security policies.
- **Why it exists:** Security primitives like password complexity logic must be strictly decoupled from the web routers (`auth.py`) so they can be unit-tested in absolute isolation and reused reliably across any service requiring them.

---

## File Structure

### `password.py`
- **Purpose:** Validates raw string inputs against the Enterprise Password Policy.
- **Exports:** 
  - `validate_password(password: str) -> bool`
- **Business Logic & Regex Constraints:**
  - Minimum 8 characters in length.
  - Requires at least one uppercase letter `[A-Z]`.
  - Requires at least one lowercase letter `[a-z]`.
  - Requires at least one numerical digit `[0-9]`.
  - Requires at least one special character `[@$!%*?&]`.
- **Dependencies:** Standard Python `re` (regex) library.
- **Usage:** This function is invoked during `POST /change-password` and inside user-creation endpoints. If it returns `False`, the API explicitly throws a `400 Bad Request` before attempting to hash the invalid password.

---

## Maintenance Guide
- **Modifying Password Policies:** If your organization dictates a new security standard (e.g., NIST guidelines suggesting 12+ characters), update the regex pattern inside `password.py`.
- **Warning:** Do not place database calls (like checking for previous password re-use) inside `password.py`. This file must remain mathematically deterministic and free of external side effects.
