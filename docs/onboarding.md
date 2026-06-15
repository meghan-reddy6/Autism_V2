# Developer Onboarding Guide

Welcome to the Autism Assessment Platform! This guide will take you from zero to fully productive in under 30 minutes.

## 1. Running the Application Locally

**Prerequisites:**
- Python 3.10+
- Node.js 18+
- PostgreSQL
- Redis

**Backend Setup:**
```bash
cd web_backend
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Setup Database
# Ensure DATABASE_URL is set in .env
prisma generate
prisma db push

# Run the server
uvicorn main:app --reload
```

**Frontend Setup:**
```bash
cd frontend
npm install
# Ensure NEXT_PUBLIC_API_URL is set in .env.local
npm run dev
```

## 2. Understanding the Architecture

Think of this app in three distinct slices:
1. **Frontend (`frontend/`)**: A Next.js App Router application. We use Tailwind CSS for styling and Zustand for state. Feature logic lives in `features/`, while global UI components are in `shared/ui/`.
2. **Backend (`web_backend/`)**: A FastAPI application. Core business logic is strictly domain-driven (`domains/`).
3. **Database Security (`tenantAwareRepository.py`)**: Our data is multi-tenant. The backend ensures that no user can see another clinic's data by forcibly injecting `WHERE tenantId = ?` into every single database query automatically. **Never bypass this repository** unless you are writing a `SUPER_ADMIN` tool.

## 3. How to Add a New Assessment Scale

Adding a new clinical scale (like the ADOS-2 or SRS-2) is mostly a frontend exercise.

1. **Define the Form**: Open `frontend/lib/assessment-forms.ts` and add a new template object. This dictates exactly how the questions are rendered.
2. **Add to Results UI**: Open `frontend/features/assessments/logic/assessmentScales.ts` and export the scale so it renders properly on the completed assessment page.
3. **Calculate Scores**: Open `frontend/features/assessments/logic/assessmentScoreCalculator.ts` and write the mapping logic to convert the text responses into numerical inputs.
4. **Backend Integration**: Ensure the ML Service model is trained to accept the new `scale_type` payload. The backend `reports.py` router simply acts as a passthrough.

## 4. Debugging Authentication Issues

Authentication relies on JWTs stored securely on the frontend and validated by FastAPI dependencies.

**Issue: User keeps getting logged out**
- **Cause**: The JWT is likely expiring, or the user's `isActive` flag is `False`.
- **Fix**: Check `ACCESS_TOKEN_EXPIRE_MINUTES` in the backend `.env`. Inspect the `User` table to ensure `isActive = true`.

**Issue: `401 Unauthorized` on API calls**
- **Cause**: The frontend is not attaching the token.
- **Fix**: Open `frontend/lib/api-client.ts` and ensure `useAuthStore.getState().token` is successfully grabbing the token from local storage.

**Issue: "Tenant context missing" `500` error**
- **Cause**: An unprotected route is trying to query the database.
- **Fix**: You must wrap the FastAPI router with `Depends(get_current_user)` or `Depends(require_roles(["..."]))`. This dependency extracts the `tenantId` from the JWT and injects it into the Thread Context so the database knows which clinic to query.
