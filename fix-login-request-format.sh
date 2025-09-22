#!/bin/bash

echo "🔧 修复登录请求格式问题..."

# 1. 检查前端修复是否正确应用
echo "📋 检查前端 apiClient.ts 修复..."
if grep -q "Content-Type.*application/json" frontend/src/services/apiClient.ts; then
    echo "✅ 前端 Content-Type 头已修复"
else
    echo "❌ 前端 Content-Type 头修复失败"
    exit 1
fi

# 2. 检查后端调试日志是否添加
echo "📋 检查后端调试日志..."
if grep -q "Login请求调试" backend/internal/handlers/auth.go; then
    echo "✅ 后端调试日志已添加"
else
    echo "❌ 后端调试日志添加失败"
    exit 1
fi

# 3. 编译检查
echo "📋 检查 Go 代码编译..."
cd backend
if go build ./...; then
    echo "✅ 后端代码编译成功"
else
    echo "❌ 后端代码编译失败"
    exit 1
fi
cd ..

# 4. 检查前端编译
echo "📋 检查前端编译..."
cd frontend
if npm run build --silent; then
    echo "✅ 前端代码编译成功"
else
    echo "❌ 前端代码编译失败"
    exit 1
fi
cd ..

echo "🎉 登录请求格式修复完成！"

echo "📋 接下来的测试步骤："
echo "1. 重新构建并部署应用"
echo "2. 测试登录功能"
echo "3. 查看后端日志中的调试信息"

echo ""
echo "🔍 主要修复内容："
echo "- ✅ 修复了 apiClient.ts 中 POST/PUT 请求缺少 Content-Type 头的问题"
echo "- ✅ 添加了后端详细的登录请求调试日志"
echo "- ✅ 统一了前后端的请求格式处理"
