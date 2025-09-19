#!/bin/bash

echo "🚀 执行数据库迁移修复..."

# 使用 Docker 执行 SQL 脚本
docker exec -i multisig-postgres psql -U multisig_user -d multisig_db < fix_migrations.sql

if [ $? -eq 0 ]; then
    echo "✅ 迁移修复成功！"
    echo "🔄 现在可以重启后端服务并测试'添加成员'功能"
else
    echo "❌ 迁移修复失败！请检查错误信息"
fi
