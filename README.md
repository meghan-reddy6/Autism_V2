# Enterprise Clinical Assessment Platform

A robust, microservices-based clinical assessment and Electronic Medical Record (EMR) platform designed for administering, scoring, and analyzing neurodevelopmental scales (CARS, GARS-2, M-CHAT-R). The architecture enforces strict separation of concerns, decoupling deterministic clinical scoring (ground truth) from predictive Machine Learning inference to ensure high availability and data governance.

## 🏗 Enterprise Architecture & Tech Stack

- **Frontend (Port 3000):** Next.js (App Router), React, Tailwind CSS. Features role-based access control, dynamic age calculation formatting, and explicit scale maximums.
- **Web Backend (Port 8000):** FastAPI (Python). Handles API routing, clinical scoring logic, and database interactions using `prisma-client-py`.
- **ML Service (Port 8001):** FastAPI (Python). A strictly isolated Explainable AI (XAI) service running a Scikit-Learn `RandomForestClassifier`. Calculates probabilistic ML confidence bounds and uses SHAP to calculate driving factor importance.
- **Database (Port 5432):** PostgreSQL, managed via Prisma ORM for Python.
- **Orchestration:** Docker Compose for unified, reproducible deployments.

## 🔒 Security & Authentication (Phase B)

The platform implements stringent enterprise security measures:
- **Rate Limiting:** API login endpoints are protected against brute-force attacks via `slowapi` (Max 5 attempts/min).
- **Session Revocation:** Secure HTTP sessions utilizing Refresh Tokens alongside short-lived Access Tokens, allowing Super Admins to revoke sessions on compromised devices.
- **Multi-Factor Authentication (MFA):** Supports TOTP-based Multi-Factor Authentication (Google Authenticator) using `pyotp` and `qrcode` backend generators.
- **Password Policies:** Enforces strict regex patterns for all user accounts (min 8 characters, uppercase, lowercase, numbers, and special characters).
- **Data Integrity:** Soft-delete mechanisms enforce `isDeleted` filters globally across repositories, powering a Super Admin Recycle Bin without permanently losing clinical data.

---

## 🚀 Quick Start (Docker - Automated)

The Docker setup is fully automated. When the containers start, a custom `entrypoint.sh` automatically generates the Prisma client, pushes the latest schema to PostgreSQL, and seeds the default clinic and users.

**Prerequisites:** Docker Desktop installed and running.

### 🪟 Windows Users:
Simply double-click or run from command prompt:
```cmd
start.bat
```

### 🍏 Mac / 🐧 Linux Users:
Run the shell script:
```bash
chmod +x start.sh
./start.sh
```

### 🔑 Default Seeded Credentials:
- **Clinical Admin (Doctor):** `doctor@clinic.com` / `Admin@123`
- **Super Admin:** `superadmin@system.com` / `Admin@123`
- **Viewer (Parent):** `parent@portal.com` / `Admin@123`

---

### 🌐 Access the Applications:
- **Frontend UI:** http://localhost:3000
- **Web Backend API Docs:** http://localhost:8000/docs
- **ML Service API Docs:** http://localhost:8001/docs

**To shut down and wipe the database (factory reset):**
```bash
docker-compose down -v
```

## 🧠 Explainable AI (XAI) Engine

The ML Service is decoupled by design to prevent ML latency from impacting core clinical operations.

1. When an assessment is scored, the backend passes the normalized score and demographic data to the ML Service.
2. A `RandomForestClassifier` determines a secondary "Insight" prediction with a bounded **Confidence Interval**.
3. **SHAP (SHapley Additive exPlanations)** mathematically breaks down the decision tree and extracts the **Top Driving Factors**, calculating the specific weight each metric (e.g., Patient Age vs Total Score) had on the final prediction.

*Note: The current model (`rf_model.joblib`) is trained on 15,000 synthetic patient records and is intended for technical demonstration. It must be retrained on real, de-identified clinical datasets prior to true clinical deployment.*
