@echo off
echo Starting Clinical Assessment Portal...
docker-compose up -d

echo Waiting for database to initialize and containers to start...
timeout /t 10 /nobreak

echo All services are running!
echo Frontend: http://localhost:3000
echo Web Backend API: http://localhost:8000/docs
echo ML Service API: http://localhost:8001/docs
pause
