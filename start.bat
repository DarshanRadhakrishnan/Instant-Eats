@echo off
REM Quick Start Script for Instant Eats Platform (Windows)

echo.
echo 🚀 Starting Instant Eats Platform Setup...
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating .env file from template...
    copy .env.example .env
)

REM Create .env file for frontend if it doesn't exist
if not exist "frontend\.env" (
    echo 📝 Creating frontend\.env file from template...
    copy frontend\.env.example frontend\.env
)

echo ✅ Starting Docker services...
docker-compose up -d

echo.
echo 🎉 Instant Eats Platform is starting!
echo.
echo 📍 Services will be available at:
echo    • API Gateway:         http://localhost:3000
echo    • Auth Service:        http://localhost:3001
echo    • Order Service:       http://localhost:3002
echo    • Restaurant Service:  http://localhost:3003
echo    • Delivery Service:    http://localhost:3004
echo    • Tracking Service:    http://localhost:3005 (WebSocket)
echo    • Nginx:               http://localhost
echo    • RabbitMQ Dashboard:  http://localhost:15672 (guest:guest)
echo    • MongoDB:             mongodb://root:mongodb@localhost:27017
echo.
echo 📋 Check service logs:
echo    docker-compose logs -f ^<service-name^>
echo.
echo 🛑 To stop services:
echo    docker-compose down
echo.
echo ✨ Happy coding!
echo.
pause
