#!/bin/bash

echo "🛑 Stopping Web3 Enterprise Multisig Development Environment..."

# 停止所有 Node.js 和 Go 进程
pkill -f "npm run dev"
pkill -f "air"

# 停止 Docker 服务
docker-compose down

echo "✅ All services stopped!"
