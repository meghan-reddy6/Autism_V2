Here is the complete, professional `README.md` for your project. It documents the architecture, the local development setup (including the IDE fixes we applied), and instructions for swapping out the ML model.

Save this directly into the root of your `clinical-portal` (or `Autism_V2`) folder as `README.md`.

---

````markdown
# Clinical Assessment Portal & ML Inference Engine

A robust, microservices-based clinical assessment platform designed for administering, scoring, and analyzing neurodevelopmental scales (CARS, GARS-2, M-CHAT-R). The architecture enforces strict separation of concerns, decoupling deterministic clinical scoring (ground truth) from predictive Machine Learning inference to ensure high availability and data governance.

## 🏗 Architecture & Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS, ShadcnUI. Uses `react-hook-form` and `zod` for strict multi-step validation.
- **Web Backend:** FastAPI (Python). Handles API routing, deterministic clinical scoring logic, PII-stripping, and database interactions.
- **ML Service:** FastAPI (Python). A strictly isolated service dedicated purely to processing normalized scores and returning predictive insights and confidence metrics.
- **Database:** PostgreSQL, managed via Prisma ORM for Python.
- **Orchestration:** Docker Compose for unified, reproducible deployments.

## 📂 Project Structure

```text
├── docker-compose.yml       # Orchestrates DB, Web Backend, ML Service, and Frontend
├── config/
│   └── scoring_thresholds.yaml # Centralized thresholds for deterministic scoring
├── prisma/
│   └── schema.prisma        # Database schema models (User, Assessment, etc.)
├── web_backend/             # Port 8000
│   ├── main.py              # Main API router and scoring logic
│   └── Dockerfile
├── ml_service/              # Port 8001
│   ├── main.py              # Isolated ML inference endpoint
│   └── Dockerfile
└── frontend/                # Port 3000
    ├── app/                 # Next.js App Router UI
    ├── package.json
    └── Dockerfile
```
````

## 🚀 Quick Start (Docker - Recommended)

The easiest way to run the entire stack is via Docker Compose. This ensures all databases, runtimes, and networking are automatically configured.

**Prerequisites:** Docker Desktop installed and running.

1. Clone the repository and navigate to the root directory.
2. Build and spin up all containers:

```bash
docker-compose up --build -d

```

3. Access the applications:

- **Frontend UI:** [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)
- **Web Backend API Docs:** [http://localhost:8000/docs](https://www.google.com/search?q=http://localhost:8000/docs)
- **ML Service API Docs:** [http://localhost:8001/docs](https://www.google.com/search?q=http://localhost:8001/docs)

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

**2. Python Services Setup (Using `uv`)**
To set up lightning-fast virtual environments for Pylance/VS Code:

```bash
# Setup Web Backend
cd web_backend
uv venv
uv pip install -r requirements.txt
cd ..

# Setup ML Service
cd ml_service
uv venv
uv pip install -r requirements.txt
cd ..

```

_Note: After creating these environments, open a `.py` file in VS Code, click the Python version in the bottom-right corner, and select the corresponding `.venv/Scripts/python.exe` interpreter._

## 🧠 Integrating a Custom ML Model

The ML Service is decoupled by design. You can swap the underlying model without touching the frontend or the main web backend.

1. Navigate to `ml_service/`.
2. Place your serialized model weights (e.g., `.pt`, `.onnx`, `.pkl`) inside an `ml_service/models/` directory.
3. Update `ml_service/main.py` to load your weights on startup and process the incoming request (`scale_type`, `normalized_score`, `age_months`) through your model pipeline.
4. Rebuild just the ML service container:

```bash
docker-compose up -d --build ml-service

```

## 🛠 Known Troubleshooting

- **Corporate Network / VPN SSL Errors:** If the Docker build fails during `prisma generate` with a certificate error (`unable to verify the first certificate`), ensure `ENV NODE_TLS_REJECT_UNAUTHORIZED="0"` is temporarily set in the `web_backend/Dockerfile` before the generate command.
- **Prisma C-Library Errors on Slim Images:** The backend image (`python:3.11-slim`) requires the `libatomic1` library for Prisma's underlying engine. This is pre-configured in the Dockerfile via `apt-get install`.

```

```
