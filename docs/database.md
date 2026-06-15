# Database Architecture

## Overview
The platform utilizes PostgreSQL as the primary data store, interacting with it via Prisma Client Python. This allows for type-safe database queries and automated schema migrations.

## Tenant Scoping
The database is designed as a Multi-Tenant architecture using a shared-database, shared-schema approach.
- **Tenant ID**: Almost every core table (`User`, `Patient`, `AssessmentSession`, `Report`) contains a `tenantId` column that links back to the `Organization` table.
- **Enforcement**: Tenant isolation is NOT handled at the database level (e.g., via Row Level Security), but rather at the application layer using the `TenantAwareRepository` pattern. This repository forcibly injects `WHERE tenantId = ?` into all read and write queries based on the authenticated user's context.

## Schema Highlights
- **Organization**: Represents a clinic or hospital. The top-level tenant entity.
- **User**: Clinic staff (`ORG_ADMIN`, `DOCTOR`, `NURSE`). Linked to an Organization.
- **Patient**: Clinical subjects. Contains demographic data and medical history.
- **AssessmentTemplate**: Definitions of the clinical scales (CARS, M-CHAT-R).
- **AssessmentSession**: Represents a specific instance of a patient taking an assessment.
- **AssessmentResponse**: Individual key-value pairs representing answers to questions within a session.
- **Report**: The finalized diagnostic output, containing both the deterministic scores and the AI predictions (stored in JSON format for flexibility).
- **AuditLog**: Immutable ledger of all significant data changes, capturing `userId`, `tenantId`, `action`, and the payload.

## Migrations
- Schema changes are made inside `schema.prisma`.
- To generate a new migration script: `prisma migrate dev --name <description>`
- To apply migrations in production: `prisma migrate deploy`
