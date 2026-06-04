#!/bin/bash
set -e

echo "Generating Prisma Client..."
prisma generate

echo "Pushing database schema..."
python -m prisma db push

echo "Seeding database..."
python seed.py

echo "Starting server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
