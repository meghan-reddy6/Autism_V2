# Database Architecture

The CDSS utilizes PostgreSQL as its primary data store, managed exclusively through the Prisma Object-Relational Mapper (ORM).

## 🛠 Technology Choices
- **PostgreSQL 15:** Chosen for its robust ACID compliance, JSONB support (essential for storing dynamic assessment templates and ML SHAP values), and excellent concurrent read/write performance.
- **Prisma Client Python (`prisma-client-py`):** Provides type-safe database queries. Because Python lacks a native equivalent to TypeScript's strict type system for SQL queries, Prisma enforces schema validation before a query ever executes, drastically reducing runtime errors in the FastAPI backend.

## 🗄 Core Entity Groups

The database schema (`web_backend/prisma/schema.prisma`) is organized into several domains:

### 1. Multi-Tenant & RBAC (Role-Based Access Control)
- **Tenant:** The top-level entity. A "Tenant" represents a distinct clinic, hospital, or school system. All clinical data is partitioned by `tenantId`.
- **User:** Staff members associated with a Tenant. Governed by the `Role` enum (e.g., `SUPER_ADMIN`, `CLINICAL_ADMIN`, `THERAPIST`, `VIEWER`).
- **UserSession:** Tracks active and revoked Refresh Tokens for authenticated users.

### 2. Electronic Medical Record (EMR) Models
- **Patient:** The core clinical subject. Contains demographics, medical history, and uniquely identifying MRNs (Medical Record Numbers). Belongs to a Tenant.
- **Appointment:** Workflow scheduling, linking a Patient to a Provider (User) at a specific time.
- **ClinicalNote / TreatmentPlan:** Unstructured or semi-structured textual observations (SOAP notes) authored by clinicians.

### 3. Assessment & Reporting
- **AssessmentTemplate:** JSON schemas defining dynamic clinical forms (e.g., CARS, GARS-2).
- **AssessmentSession:** An instance of an assessment being filled out for a Patient. Contains metadata about status (`IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`).
- **AssessmentResponse:** Individual answers for an AssessmentSession.
- **Assessment:** A legacy, denormalized model that stores raw score arrays, total scores, and the ML Service's predicted risk, confidence bounds, and SHAP values.
- **Report:** Formalized, printable diagnostic outputs approved by a supervising clinician.

### 4. Compliance & Audit
- **AuditLog:** A high-volume append-only table tracking every significant action (`VIEW_PATIENT`, `EDIT_NOTE`, `SCORE_ASSESSMENT`). Stores `beforeState` and `afterState` JSON diffs for HIPAA compliance.

## ♻ Data Integrity & Soft Deletes

In a clinical environment, hard-deleting records (e.g., `DELETE FROM Patient WHERE id=1`) is often a violation of data retention laws. To solve this, the schema implements a global **Soft Delete Architecture**.

Nearly every major entity (`Patient`, `Assessment`, `Tenant`, `User`, `Report`) includes three columns:
- `isDeleted: Boolean @default(false)`
- `deletedAt: DateTime?`
- `deletedBy: String?`

### How it works:
1. **Deletion Requests:** When a clinician clicks "Delete Report", the FastAPI route executes an `update`, setting `isDeleted = True` and recording the timestamp and their User ID.
2. **Filtering:** Every single `find_many` or `find_unique` query in the codebase is wrapped with an active `where={ "isDeleted": False }` clause to ensure deleted records disappear from the UI immediately.
3. **The Recycle Bin:** Super Admins have access to a special view that queries the database specifically for `isDeleted = True`. They can review who deleted the record, when they deleted it, and restore it with a single click, completely reversing the deletion without any data loss.

## 🔄 Migrations
Any changes to the database structure MUST be done via Prisma.
1. Modify `schema.prisma`.
2. Run `prisma migrate dev --name <migration_name>` (usually inside the Docker container).
3. Prisma will generate a `.sql` file in `prisma/migrations` and automatically apply it.
