#!/bin/bash

echo "🚀 Starting Web3 Enterprise Multisig Development Environment..."

# 启动数据库服务
echo "📦 Starting database services..."
docker-compose up -d postgres redis

# 等待数据库启动
echo "⏳ Waiting for database to be ready..."
sleep 5

# 启动后端服务
echo "🔧 Starting backend service..."
cd backend && air &

# 启动前端服务
echo "🎨 Starting frontend service..."
cd frontend && npm run dev &

echo "✅ All services started!"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:8080"
echo "🗄️ Database: localhost:5432"

wait
