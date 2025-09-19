#!/bin/bash

# 应用缺失的数据库迁移脚本
# 修复 safe_role_templates 表不存在的问题

echo "🚀 开始应用Safe角色模板表迁移..."

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL 环境变量未设置，使用默认连接"
    DATABASE_URL="postgresql://postgres:password@localhost:5432/web3_multisig?sslmode=disable"
fi

echo "📊 连接数据库: $DATABASE_URL"

# 执行迁移脚本
psql "$DATABASE_URL" -f run_missing_migrations.sql

if [ $? -eq 0 ]; then
    echo "✅ 迁移执行成功！"
    echo "🔄 请重启后端服务以应用更改"
else
    echo "❌ 迁移执行失败！"
    echo "💡 请检查数据库连接和权限"
    exit 1
fi

echo "📋 迁移完成，可以测试'添加成员'功能了"
