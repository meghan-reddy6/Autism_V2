# Web Backend Documentation

This directory houses the core FastAPI application serving as the central hub for the Autism V2 Clinical Diagnostic Platform. It enforces strict multi-tenancy, processes diagnostic payloads, and manages asynchronous ML workflows.

## 1. Database Access & Inspection

The backend uses a shared-database, shared-schema PostgreSQL instance. You can connect natively or using any GUI client (e.g., DBeaver, pgAdmin) using the following credentials:
- **Host**: `localhost`
- **Port**: `5432`
- **User**: `admin`
- **Database**: `clinical_db`
- **Password**: `securepassword`

### Prisma Studio
To visually inspect, edit, or delete database rows (e.g., verifying `Organization` setup or managing mock `Patient` records), you can launch the native Prisma GUI locally:
```bash
cd web_backend
npx prisma studio --url="postgresql://admin:securepassword@localhost:5432/clinical_db"
```
This will open a web portal (usually on `http://localhost:5555`) connected directly to your active database container.

## 2. Asynchronous Queues & Redis

Heavy operational tasks (like dispatching ML evaluations) are completely decoupled from the primary FastAPI event loop using `arq`.

To monitor active background jobs and worker states, you can connect directly to the Redis container using Docker Compose:
```bash
docker compose exec redis redis-cli
```
This avoids needing a local `redis-cli` installation on your host machine.

## 3. API Architectural Map

The API is structured around a strict Controller-to-Repository flow to guarantee tenant isolation:
- **`src/controllers/`**: Houses the FastAPI endpoints. Controllers parse incoming requests and enforce Role-Based Access Control (RBAC).
- **`src/schemas/`**: Pydantic models define the absolute data contracts for incoming payloads. All float boundaries (like the CARS or ISAA metrics) are hardened here.
- **`src/repositories/`**: Contains the `TenantAwareRepository` logic. This abstraction layer forcibly injects `WHERE tenantId = ?` into every Prisma ORM execution, guaranteeing isolation before saving to PostgreSQL.
