@echo off
echo Starting Clinical Assessment Portal...
docker-compose up -d --build

echo Waiting for database to initialize...
timeout /t 5 /nobreak

echo Pushing database schema...
docker-compose exec web-backend prisma db push

echo Restarting web-backend to apply schema and seed data...
docker-compose restart web-backend

echo All services are running!
echo Frontend: http://localhost:3000
echo Web Backend API: http://localhost:8000/docs
echo ML Service API: http://localhost:8001/docs
pause
