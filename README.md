# Clinical Assessment Portal & ML Inference Engine

A robust, microservices-based clinical assessment platform designed for administering, scoring, and analyzing neurodevelopmental scales (CARS, GARS-2, M-CHAT-R). The architecture enforces strict separation of concerns, decoupling deterministic clinical scoring (ground truth) from predictive Machine Learning inference to ensure high availability and data governance.

## 🏗 Architecture & Tech Stack

- **Frontend (Port 3000):** Next.js (App Router), React, Tailwind CSS. Features dynamic age calculation formatting, explicit scale maximums (e.g. 42 / 60), probabilistic ML confidence badges, and comprehensive PDF report generation.
- **Web Backend (Port 8000):** FastAPI (Python). Handles API routing, deterministic clinical scoring logic, PII-stripping, and database interactions using `prisma-client-py`.
- **ML Service (Port 8001):** FastAPI (Python). A strictly isolated service dedicated to running a Scikit-Learn `RandomForestClassifier` trained on synthetic behavioral data. It provides classification risk ("Standard" vs "Elevated") and a calculated `predict_proba()` confidence interval percentage.
- **Database (Port 5432):** PostgreSQL, managed via Prisma ORM for Python.
- **Orchestration:** Docker Compose for unified, reproducible deployments.

## 🚀 Quick Start (Docker - Recommended)

We have created automated startup scripts to ensure the Docker containers spin up, the PostgreSQL database is properly initialized, the Prisma schema is pushed, and the default clinic user is seeded. **This resolves the common "failed to fetch" or "TableNotFoundError" on cold boots.**

**Prerequisites:** Docker Desktop installed and running.

### 🪟 Windows Users:
Simply double-click or run:
```cmd
start.bat
```

### 🍏 Mac / 🐧 Linux Users:
Run the shell script:
```bash
chmod +x start.sh
./start.sh
```

**Default Credentials:**
- **Email:** `doctor@defaultclinic.com`
- **Password:** `password123`

---

### Access the applications:
- **Frontend UI:** http://localhost:3000
- **Web Backend API Docs:** http://localhost:8000/docs
- **ML Service API Docs:** http://localhost:8001/docs

**To shut down and wipe the database (factory reset):**
```bash
docker-compose down -v
```

## 💻 Local IDE Setup (For VS Code / IntelliSense)

While the app runs in Docker, your local IDE requires the dependencies installed locally to provide code completion and prevent "missing module" errors.

**1. Frontend Setup**
```bash
cd frontend
npm install
```

**2. Python Services Setup (Using `uv` or `pip`)**
To set up virtual environments for Pylance/VS Code:

```bash
# Setup Web Backend
cd web_backend
python -m venv .venv
.venv\Scripts\activate  # On Windows
pip install -r requirements.txt
cd ..

# Setup ML Service
cd ml_service
python -m venv .venv
.venv\Scripts\activate  # On Windows
pip install -r requirements.txt
cd ..
```

*Note: After creating these environments, open a `.py` file in VS Code, click the Python version in the bottom-right corner, and select the corresponding `.venv/Scripts/python.exe` interpreter.*

## 🧹 Hard Resetting the Database
If you need to wipe all `ClinicalReport` and `Patient` records while preserving the database schema and the default doctor login:
```bash
docker-compose exec web-backend python clear_db.py
```

## 🧠 Integrating a Custom ML Model

The ML Service is decoupled by design. You can swap the underlying model without touching the frontend or the main web backend.

1. Navigate to `ml_service/`.
2. Place your serialized model weights (e.g., `.pt`, `.onnx`, `.joblib`) inside the `ml_service/` directory.
3. Update `ml_service/main.py` to load your weights on startup and process the incoming request (`scale_type`, `normalized_score`, `age_months`) through your model pipeline.
4. Rebuild just the ML service container:
```bash
docker-compose up -d --build ml-service
```
