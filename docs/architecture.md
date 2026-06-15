# System Architecture

## Overview
The application is a multi-tenant clinical assessment platform consisting of a React/Next.js frontend and a FastAPI (Python) backend. The platform provides tools for clinic administration, patient management, and AI-assisted clinical scoring.

## Frontend Structure
The frontend is built using Next.js 14 and React 18, structured by feature domains rather than technical layers.
- `app/`: Next.js App Router definitions. Separation between `(clinic)` (tenant-specific views) and `admin` (super-admin global views).
- `features/`: Contains domain-specific logic. E.g., `features/assessments/` contains scoring logic, API hooks, and UI components for assessments.
- `shared/ui/`: Reusable, domain-agnostic UI components (buttons, modals, tables).
- `lib/`: Core utilities like the `api-client.ts`, Zustand state management (`store.ts`), and styling helpers.

## Backend Structure
The backend is a FastAPI application interacting with a PostgreSQL database via Prisma Client Python. It strictly separates infrastructure concerns from domain logic.
- `main.py`: Entry point for the FastAPI application.
- `domains/`: Feature-specific modules (e.g., `admin`, `patients`, `dashboard`). Each domain handles its own routing and business logic.
- `infrastructure/`: Core services like `tenantAwareRepository.py` (which enforces data isolation), database connection (`database.py`), state machines, and caching.
- `auth/`: JWT validation, role-based access control (RBAC), and password hashing.
- `schemas/`: Pydantic models for request validation and response serialization.

## Tenant Isolation Strategy
Tenant isolation is enforced strictly at the database repository layer via the `TenantAwareRepository`. 
- Every incoming request goes through the authentication middleware, which extracts the `tenantId` from the JWT and places it in a thread-local ContextVar.
- Every repository call requires the `tenant_id` to be explicitly passed, appending a `WHERE tenantId = ?` clause to every query.
- The `SUPER_ADMIN` role bypasses this restriction to allow global administration.

## Request Flow
1. **Client Request**: The frontend makes a request to the backend via `fetchApi` containing a Bearer JWT.
2. **Authentication Middleware**: FastAPI's dependency injection parses the JWT, validates its signature, and extracts `userId`, `tenantId`, and `role`.
3. **Authorization (RBAC)**: Route-specific dependencies (e.g., `require_roles(["DOCTOR"])`) ensure the user has permission to execute the action.
4. **Domain Logic**: The request hits the specific route handler in the `domains/` folder.
5. **Repository Access**: The handler queries the `TenantAwareRepository`, passing the `tenant_id` to guarantee isolation.
6. **Response**: Data is serialized via Pydantic and returned. All destructive actions generate an Audit Log entry automatically.

## Assessment Flow
1. **Intake**: A patient's demographics are registered.
2. **Evaluation**: An assessment session is created. Responses are submitted based on configured templates (e.g., CARS, GARS-2).
3. **ML Scoring**: Upon submission, the backend calls an external ML Service. The raw features are sent, and the ML Service returns a deterministic score, risk prediction, and SHAP explainability values.
4. **Report Generation**: The AI output is saved into a preliminary report.
5. **Clinical Approval**: The Doctor reviews the report, optionally appends clinical notes, and approves it, locking the record.
