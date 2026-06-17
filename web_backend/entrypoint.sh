#!/bin/bash
set -e

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Generating Prisma Client..."
prisma generate

echo "Applying database migrations..."
python -m prisma migrate deploy

echo "Seeding database..."
python seed.py

echo "Starting Arq background worker..."
arq src.infrastructure.jobs.worker.WorkerSettings &

echo "Starting server..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
