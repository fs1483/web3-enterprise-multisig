#!/bin/bash

echo "🔧 基于用户提供的配置修复Nginx CORS和代理问题..."

# 检查修复是否已应用
echo "📋 检查Nginx配置修复..."
if grep -q "Access-Control-Allow-Origin" frontend/nginx.conf; then
    echo "✅ CORS配置已添加"
else
    echo "❌ CORS配置添加失败"
    exit 1
fi

if grep -q "OPTIONS" frontend/nginx.conf; then
    echo "✅ OPTIONS预检请求处理已添加"
else
    echo "❌ OPTIONS预检请求处理添加失败"
    exit 1
fi

# 验证配置语法
echo "📋 验证Nginx配置语法..."
docker run --rm -v "$(pwd)/frontend/nginx.conf:/etc/nginx/conf.d/default.conf" nginx:alpine nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx配置语法正确"
else
    echo "❌ Nginx配置语法错误"
    exit 1
fi

echo ""
echo "🎉 Nginx配置修复完成！"
echo ""
echo "📋 主要修复内容（基于用户提供的配置）："
echo "- ✅ 添加了完整的CORS头配置"
echo "- ✅ 添加了OPTIONS预检请求处理"
echo "- ✅ 简化了代理配置，移除了可能有问题的Content-Type传递"
echo "- ✅ 使用直接的proxy_pass而不是变量"
echo ""
echo "🔍 关键改进："
echo "1. CORS配置：解决跨域问题"
echo "2. OPTIONS处理：解决预检请求问题"
echo "3. 简化代理：避免复杂的头部传递问题"
echo ""
echo "现在请重新部署并测试登录功能！"
echo ""
echo "部署命令："
echo "docker-compose build frontend"
echo "docker-compose up -d"
