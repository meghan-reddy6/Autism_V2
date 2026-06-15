# Authentication & Authorization

## Overview
The platform secures access through standard JSON Web Tokens (JWT) coupled with a strict Role-Based Access Control (RBAC) model. 

## Login Flow
1. **Credentials Submission**: The client sends `email` and `password` to `/auth/login`.
2. **Verification**: The backend fetches the user by email. Passwords are hashed using bcrypt. The submitted password is verified against the hash stored in the database.
3. **MFA Check**: If Multi-Factor Authentication (MFA) is enabled for the user, the server issues a temporary session token and requires the client to submit an MFA code (e.g., via a TOTP app).
4. **Token Generation**: Upon successful authentication (and MFA if required), the server generates an access token (JWT) using the `HS256` algorithm.
5. **Client Storage**: The frontend stores the JWT (typically in a secure HttpOnly cookie or secure local storage mechanism, depending on deployment setup) and attaches it as a `Bearer` token to all subsequent API requests via the `api-client.ts`.

## JWT Lifecycle
- **Payload Structure**: The JWT contains claims for `sub` (User ID), `email`, `role`, and `tenantId`.
- **Expiration**: Tokens have a limited lifespan (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`). 
- **Validation**: Every protected endpoint calls the `get_current_user` dependency, which decodes the token, checks expiration, and validates the signature using the `SECRET_KEY`.

## Role Handling & RBAC
Roles are hierarchical and determine which actions a user can perform.
- `SUPER_ADMIN`: Global access. Can provision new organizations (tenants), manage global billing, and has read/write access across the entire system. Bypasses the `TenantAwareRepository` restrictions.
- `ORG_ADMIN`: Clinic-level administrator. Can add/remove team members (`DOCTOR`, `THERAPIST`, `NURSE`) within their specific `tenantId`. Cannot view clinical data by default unless explicitly granted.
- `DOCTOR` / `PSYCHOLOGIST`: Clinical staff. Can create patients, run assessments, generate ML reports, and approve clinical notes.
- `NURSE` / `THERAPIST`: Support staff. Can view patients and initiate intake forms, but cannot finalize or approve diagnostic reports.

**Enforcement**: 
Roles are enforced using the `require_roles` or `require_permission` FastAPI dependencies on individual router endpoints.
```python
@router.get("/assessments")
async def list_assessments(
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "ORG_ADMIN", "DOCTOR"]))
):
```

## Session Validation
Because JWTs are stateless, the system relies on checking the user's `isActive` flag in the database during critical actions to instantly revoke access if a user is deactivated by an administrator.

## Multi-Factor Authentication (MFA)
- Users can enable MFA via the `/auth/mfa/setup` endpoint, generating a QR code for authenticator apps.
- When logging in, if `mfa_enabled` is true, the initial `/login` request returns `requires_mfa: true`.
- The client then calls `/auth/mfa/verify` with the TOTP code to receive the final JWT.
