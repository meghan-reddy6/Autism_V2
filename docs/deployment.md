# Deployment & Configuration

## Environment Variables
The application requires the following environment variables to function correctly.

### Backend (`web_backend/.env`)
```env
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/autism_v2"

# Authentication
SECRET_KEY="your-super-secret-key-change-in-production"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES="1440"

# Caching
REDIS_URL="redis://localhost:6379"

# External Services
ML_SERVICE_URL="http://ml-service:8001/analyze"
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1"
```

## Local Development Setup
1. **Database**: Ensure PostgreSQL and Redis are running locally.
2. **Backend**:
   ```bash
   cd web_backend
   pip install -r requirements.txt
   prisma generate
   prisma db push
   uvicorn main:app --reload
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Production Deployment Process
The application is designed to be deployed using Docker containers.

1. **Build Images**:
   - Backend: Dockerfile running `uvicorn` with multiple workers.
   - Frontend: Dockerfile running `next start` after a `next build`.
2. **Database Migrations**:
   - During the CI/CD pipeline, run `prisma migrate deploy` to safely apply schema changes. Do NOT run `prisma db push` in production.
3. **Secrets Management**:
   - Pass environment variables securely via Kubernetes Secrets or AWS Secrets Manager. Ensure `SECRET_KEY` is cryptographically strong.
4. **Scaling**:
   - The FastAPI backend is stateless and can be horizontally scaled behind a load balancer.
   - The Next.js frontend can be deployed to Vercel or hosted natively via Docker.
