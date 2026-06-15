# Troubleshooting Guide

## Common Issues & Resolutions

### 1. User Cannot Log In
- **Symptoms**: `401 Unauthorized` or `Invalid credentials` error on the frontend.
- **Troubleshooting**:
  - Verify the user exists in the database.
  - Check the `isActive` flag. If it is `False`, the user cannot log in.
  - If the user recently changed their password, ensure the `passwordHash` was generated using `bcrypt`.
  - Check if `mfa_enabled` is true. If they lost their authenticator, an `ORG_ADMIN` or `SUPER_ADMIN` may need to reset their MFA seed.

### 2. Missing Tenant Context Error
- **Symptoms**: `500 Internal Server Error` with a message containing `Tenant context missing. Security violation.`
- **Troubleshooting**:
  - This occurs when the `TenantAwareRepository` is queried without a `tenantId` in the ContextVars.
  - Verify that the endpoint is protected by `Depends(get_current_user)` or `Depends(require_roles(...))`. The dependency is responsible for extracting the tenant from the JWT and setting it in the context.

### 3. ML Score Generation Fails
- **Symptoms**: Clicking "Generate ML Score & Report" spins and then returns an error, or the report says "Pending Analysis".
- **Troubleshooting**:
  - The ML Service is likely down or unreachable.
  - Verify the `ML_SERVICE_URL` environment variable is correct in the `.env` file.
  - Check the ML Service container logs for crashes.
  - Note: The system gracefully handles timeouts (5s) and will still save the deterministic score even if the ML service drops the request.

### 4. Blank Screen on Frontend / Hydration Error
- **Symptoms**: React throws a hydration mismatch error in the console.
- **Troubleshooting**:
  - Next.js requires server and client renders to match exactly. Ensure that things like `Date.now()` or `window.innerWidth` are not rendered directly during the initial mount without a `useEffect`.
  - Run `npm run build` locally to see if Next.js surfaces a more specific compilation error.

### 5. Prisma Client Not Synchronized
- **Symptoms**: `Unknown argument X` or `Field does not exist` errors from the backend.
- **Troubleshooting**:
  - The database schema changed, but the Prisma Python client was not regenerated.
  - Run `prisma generate` to update the generated python types to match `schema.prisma`.
