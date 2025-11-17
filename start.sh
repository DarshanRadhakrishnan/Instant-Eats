#!/bin/bash

# Quick Start Script for Instant Eats Platform

set -e

echo "🚀 Starting Instant Eats Platform Setup..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
fi

# Create .env file for frontend if it doesn't exist
if [ ! -f frontend/.env ]; then
    echo "📝 Creating frontend/.env file from template..."
    cp frontend/.env.example frontend/.env
fi

echo "✅ Starting Docker services..."
docker-compose up -d

echo ""
echo "🎉 Instant Eats Platform is starting!"
echo ""
echo "📍 Services will be available at:"
echo "   • API Gateway:         http://localhost:3000"
echo "   • Auth Service:        http://localhost:3001"
echo "   • Order Service:       http://localhost:3002"
echo "   • Restaurant Service:  http://localhost:3003"
echo "   • Delivery Service:    http://localhost:3004"
echo "   • Tracking Service:    http://localhost:3005 (WebSocket)"
echo "   • Nginx:               http://localhost"
echo "   • RabbitMQ Dashboard:  http://localhost:15672 (guest:guest)"
echo "   • MongoDB:             mongodb://root:mongodb@localhost:27017"
echo ""
echo "📋 Check service logs:"
echo "   docker-compose logs -f <service-name>"
echo ""
echo "🛑 To stop services:"
echo "   docker-compose down"
echo ""
echo "✨ Happy coding!"
