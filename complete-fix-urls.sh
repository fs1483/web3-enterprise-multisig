#!/bin/bash

# =====================================================
# 完整修复前端硬编码 URL 脚本
# 版本: v2.0
# 功能: 彻底替换所有硬编码的 localhost:8080
# 作者: sfan
# 创建时间: 2024-12-22
# =====================================================

set -e

echo "🔧 开始彻底修复前端硬编码 URL..."

FRONTEND_DIR="/Users/shuangfan/blockchain-project/multisig/web3-enterprise-multisig/frontend/src"

# 1. 替换所有 ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'} 模式
echo "🎯 修复环境变量模式的 URL..."

find "$FRONTEND_DIR" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e 's|\${import\.meta\.env\.VITE_API_BASE_URL || '\''http://localhost:8080'\''}/api/v1/|buildApiUrl('\''/api/v1/'\'')|g' \
    -e 's|\${import\.meta\.env\.VITE_API_BASE_URL || '\''http://localhost:8080'\''}/api/|buildApiUrl('\''/api/'\'')|g' \
    -e 's|\`\${import\.meta\.env\.VITE_API_BASE_URL || '\''http://localhost:8080'\''}/api/v1/safes/\${|\`\${buildApiUrl('\''/api/v1/safes/'\'')}/${|g' \
    -e 's|\`\${import\.meta\.env\.VITE_API_BASE_URL || '\''http://localhost:8080'\''}/api/v1/|\`\${buildApiUrl('\''/api/v1/'\'')}|g'

echo "✅ 环境变量模式修复完成"

# 2. 替换剩余的直接 localhost:8080 引用
echo "🔄 修复直接引用的 URL..."

find "$FRONTEND_DIR" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e 's|http://localhost:8080/api/v1/|buildApiUrl('\''/api/v1/'\'')|g' \
    -e 's|http://localhost:8080/api/|buildApiUrl('\''/api/'\'')|g' \
    -e 's|'\''http://localhost:8080'\''|buildApiUrl('\'''\'')|g'

echo "✅ 直接引用修复完成"

# 3. 修复模板字符串中的 URL
echo "🎯 修复模板字符串中的 URL..."

find "$FRONTEND_DIR" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e 's|\`http://localhost:8080/api/v1/\${|\`\${buildApiUrl('\''/api/v1/'\'')}${|g' \
    -e 's|\`http://localhost:8080/api/v1/|\`\${buildApiUrl('\''/api/v1/'\'')}|g'

echo "✅ 模板字符串修复完成"

# 4. 确保所有需要的文件都有 import
echo "📦 确保所有文件都有必要的 import..."

FILES_NEEDING_IMPORT=$(grep -r "buildApiUrl" "$FRONTEND_DIR" --include="*.ts" --include="*.tsx" -l)

for file in $FILES_NEEDING_IMPORT; do
    if ! grep -q "import.*buildApiUrl.*from.*config/api" "$file"; then
        echo "添加 import 到: $file"
        # 在第一个 import 后添加我们的 import
        sed -i '' '1a\
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '"'"'../config/api'"'"';
' "$file" 2>/dev/null || sed -i '' '1i\
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '"'"'../config/api'"'"';
' "$file"
    fi
done

echo "✅ Import 添加完成"

# 5. 验证修复结果
echo "🔍 验证修复结果..."

REMAINING_COUNT=$(grep -r "localhost:8080" "$FRONTEND_DIR" --include="*.ts" --include="*.tsx" | grep -v "config/api.ts" | wc -l)

echo "剩余硬编码 URL 数量: $REMAINING_COUNT"

if [ "$REMAINING_COUNT" -eq 0 ]; then
    echo "🎉 所有硬编码 URL 已修复完成！"
else
    echo "⚠️  仍有 $REMAINING_COUNT 个硬编码 URL 需要手动处理"
    echo "剩余文件："
    grep -r "localhost:8080" "$FRONTEND_DIR" --include="*.ts" --include="*.tsx" | grep -v "config/api.ts" | cut -d: -f1 | sort | uniq
fi

echo ""
echo "📋 接下来需要："
echo "1. 重新构建前端镜像: ./build.sh --frontend-only"
echo "2. 部署到服务器: ssh aliyun 'cd /opt/multisig && ./load-frontend.sh -d'"
echo "3. 测试登录功能"
