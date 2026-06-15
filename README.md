# Autism Assessment Platform

Welcome to the Autism Assessment Platform codebase. This repository contains the Next.js frontend and the FastAPI/Prisma backend designed to provide multi-tenant Clinical Decision Support Systems (CDSS) for autism screening.

## 📚 Documentation Hub

This repository maintains a "Single Source of Truth" policy for documentation. All technical, architectural, and operational documentation is located within the `docs/` folder.

Please refer to the following canonical documents:

### Core Architecture & Systems
*   **[System Architecture](docs/architecture.md)**: High-level overview of the frontend, backend, tenant isolation, and request flows.
*   **[Database Architecture](docs/database.md)**: Details on the Prisma schema, multi-tenant isolation, and database models.
*   **[Authentication & Authorization](docs/authentication.md)**: JWT lifecycle, MFA logic, and Role-Based Access Control (RBAC).

### Feature Domains
*   **[Clinical Assessments](docs/assessments.md)**: How the assessment engine works, scoring pipelines, and adding new templates.
*   **[Machine Learning Service](docs/ml-service.md)**: Integration with the external CDSS ML microservice (predictive scoring & SHAP).

### Operations & Onboarding
*   **[Developer Onboarding](docs/onboarding.md)**: A 30-minute guide to local setup, mental models, and quick starts.
*   **[Deployment Guide](docs/deployment.md)**: Environment variables, Docker configurations, and production release protocols.
*   **[Troubleshooting](docs/troubleshooting.md)**: Common failure states, debugging authentication issues, and resolving DB synchronization problems.

---

> [!NOTE]
> Historical documentation and deprecated roadmap notes have been relocated to `docs/archive/` to preserve organizational history without cluttering the active documentation suite.
