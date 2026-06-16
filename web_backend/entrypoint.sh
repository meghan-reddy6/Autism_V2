#!/bin/bash
set -e

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Generating Prisma Client..."
prisma generate

echo "Pushing database schema..."
python -m prisma db push

echo "Seeding database..."
python seed.py

echo "Starting server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
