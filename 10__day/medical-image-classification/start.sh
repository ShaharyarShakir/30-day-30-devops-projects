#!/bin/bash

# Medical Image Classification - Production Setup Script
# This script starts all services and displays access URLs

set -e

echo "======================================"
echo "Medical Image Classification Setup"
echo "======================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    exit 1
fi

# Start services
echo "🚀 Starting services..."
docker compose up -d --build

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service status
echo ""
echo "📊 Service Status:"
echo "======================================"

services=("postgres" "garage" "garage-ui" "mlflow" "backend" "frontend")
for service in "${services[@]}"; do
    if docker compose ps "$service" 2>/dev/null | grep -q "Up"; then
        echo "✅ $service is running"
    else
        echo "❌ $service is not running"
    fi
done

echo ""
echo "======================================"
echo "🎉 Setup Complete!"
echo "======================================"
echo ""
echo "Access URLs:"
echo "---"
echo "React Frontend:      http://localhost:5173"
echo "FastAPI Docs:        http://localhost:8000/docs"
echo "MLflow UI:           http://localhost:5000"
echo "Garage Console:      http://localhost:3000"
echo "PostgreSQL:          localhost:5432"
echo ""
echo "Quick Tests:"
echo "---"
echo "Backend Health: curl http://localhost:8000/api/v1/health"
echo "MLflow Status:  curl http://localhost:5000/"
echo ""
echo "View Logs:"
echo "---"
echo "All logs:    docker compose logs -f"
echo "Backend:     docker compose logs -f backend"
echo "MLflow:      docker compose logs -f mlflow"
echo ""
echo "Stop Services:"
echo "---"
echo "Stop:        docker compose down"
echo "Stop & wipe: docker compose down -v"
echo ""
