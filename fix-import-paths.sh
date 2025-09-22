#!/bin/bash

# =====================================================
# 修复 import 路径脚本
# 版本: v1.0
# 功能: 修复错误的 config/api import 路径
# 作者: sfan
# 创建时间: 2024-12-22
# =====================================================

set -e

echo "🔧 开始修复 import 路径..."

FRONTEND_DIR="/Users/shuangfan/blockchain-project/multisig/web3-enterprise-multisig/frontend/src"

# 修复不同目录层级的 import 路径
echo "📦 修复 components/ 目录下的 import 路径..."

# components/ 目录 (需要 ../config/api)
find "$FRONTEND_DIR/components" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '../config/api'|from '../config/api'|g" \
    -e "s|from '../../config/api'|from '../../config/api'|g" \
    -e "s|from '../../../config/api'|from '../../config/api'|g"

# components/auth/ 目录 (需要 ../../config/api)
find "$FRONTEND_DIR/components/auth" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '../config/api'|from '../../config/api'|g"

# components/permissions/ 目录 (需要 ../../config/api)
find "$FRONTEND_DIR/components/permissions" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '../config/api'|from '../../config/api'|g"

# components/safes/ 目录 (需要 ../../config/api)
find "$FRONTEND_DIR/components/safes" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '../config/api'|from '../../config/api'|g"

# components/debug/ 目录 (需要 ../../config/api)
find "$FRONTEND_DIR/components/debug" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '../config/api'|from '../../config/api'|g"

echo "📦 修复 pages/ 目录下的 import 路径..."

# pages/ 目录 (需要 ../config/api)
find "$FRONTEND_DIR/pages" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '../config/api'|from '../config/api'|g" \
    -e "s|from '../../config/api'|from '../config/api'|g"

# pages/safes/ 目录 (需要 ../../config/api)
find "$FRONTEND_DIR/pages/safes" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '../config/api'|from '../../config/api'|g"

echo "📦 修复 stores/ 目录下的 import 路径..."

# stores/ 目录 (需要 ../config/api)
find "$FRONTEND_DIR/stores" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '../config/api'|from '../config/api'|g" \
    -e "s|from '../../config/api'|from '../config/api'|g"

echo "📦 修复 services/ 目录下的 import 路径..."

# services/ 目录 (需要 ../config/api)
find "$FRONTEND_DIR/services" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '../config/api'|from '../config/api'|g" \
    -e "s|from '../../config/api'|from '../config/api'|g"

echo "📦 修复 hooks/ 目录下的 import 路径..."

# hooks/ 目录 (需要 ../config/api)
find "$FRONTEND_DIR/hooks" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '../config/api'|from '../config/api'|g" \
    -e "s|from '../../config/api'|from '../config/api'|g"

echo "📦 修复 contexts/ 目录下的 import 路径..."

# contexts/ 目录 (需要 ../config/api)
find "$FRONTEND_DIR/contexts" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '../config/api'|from '../config/api'|g" \
    -e "s|from '../../config/api'|from '../config/api'|g"

echo "📦 修复 utils/ 目录下的 import 路径..."

# utils/ 目录 (需要 ../config/api)
find "$FRONTEND_DIR/utils" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '../config/api'|from '../config/api'|g" \
    -e "s|from '../../config/api'|from '../config/api'|g"

echo "✅ Import 路径修复完成"

# 验证修复结果
echo "🔍 验证修复结果..."

IMPORT_ERRORS=$(find "$FRONTEND_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -l "buildApiUrl" | xargs grep "from.*config/api" | grep -v "from '\.\./config/api'" | grep -v "from '\.\./\.\./config/api'" | wc -l)

echo "剩余错误 import 数量: $IMPORT_ERRORS"

if [ "$IMPORT_ERRORS" -eq 0 ]; then
    echo "🎉 所有 import 路径已修复完成！"
else
    echo "⚠️  仍有 $IMPORT_ERRORS 个错误 import 路径需要手动处理"
fi

echo ""
echo "📋 接下来需要："
echo "1. 检查 TypeScript 编译错误"
echo "2. 重新构建前端镜像"
echo "3. 部署并测试"
