#!/bin/bash
echo "Starting Clinical Assessment Portal..."
docker compose up --build -d

echo "Waiting for database to initialize and containers to start..."
sleep 10

echo "All services are running!"
echo "Frontend: http://localhost:3000"
echo "Web Backend API: http://localhost:8000/docs"
echo "ML Service API: http://localhost:8001/docs"
