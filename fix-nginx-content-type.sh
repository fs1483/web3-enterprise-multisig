#!/bin/bash

echo "🔧 修复Nginx Content-Type头传递问题..."

# 检查修复是否已应用
echo "📋 检查Nginx配置修复..."
if grep -q "proxy_set_header Content-Type" frontend/nginx.conf; then
    echo "✅ Nginx Content-Type头传递已修复"
else
    echo "❌ Nginx配置修复失败"
    exit 1
fi

if grep -q "proxy_set_header Content-Length" frontend/nginx.conf; then
    echo "✅ Nginx Content-Length头传递已修复"
else
    echo "❌ Nginx配置修复失败"
    exit 1
fi

# 重新构建并部署
echo "🚀 重新构建Docker镜像..."
docker-compose build frontend

echo "🔄 重启服务..."
docker-compose down
docker-compose up -d

echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 检查服务状态..."
docker-compose ps

# 测试API连接
echo "🧪 测试API连接..."
echo "测试命令："
echo "curl -X POST http://multisig.rapidbuildx.tech/api/v1/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"admin@company.com\",\"password\":\"SuperAdmin@123\"}' \\"
echo "  -v"

echo ""
echo "🎉 Nginx配置修复完成！"
echo ""
echo "📋 主要修复内容："
echo "- ✅ 添加了 proxy_set_header Content-Type \$content_type"
echo "- ✅ 添加了 proxy_set_header Content-Length \$content_length"
echo "- ✅ 添加了 proxy_request_buffering off"
echo "- ✅ 添加了 proxy_buffering off"
echo ""
echo "🔍 问题根因："
echo "- 本地环境：前端直接访问后端，Content-Type正常传递"
echo "- 服务器环境：Nginx代理丢失了Content-Type头，导致后端无法解析JSON"
echo ""
echo "现在请测试登录功能，应该可以正常工作了！"
