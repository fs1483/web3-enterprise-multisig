#!/bin/bash

# =====================================================
# 修复前端硬编码 URL 脚本
# 版本: v1.0
# 功能: 批量替换硬编码的 localhost:8080 为统一的 API 配置
# 作者: sfan
# 创建时间: 2024-12-21
# =====================================================

set -e

echo "🔧 开始修复前端硬编码 URL..."

FRONTEND_DIR="/Users/shuangfan/blockchain-project/multisig/web3-enterprise-multisig/frontend/src"

# 1. 在所有需要的文件顶部添加 import
echo "📦 添加 API 配置导入..."

# 查找所有包含 localhost:8080 的文件
FILES_WITH_LOCALHOST=$(grep -r "localhost:8080" "$FRONTEND_DIR" --include="*.ts" --include="*.tsx" -l | grep -v "authStore.ts" | grep -v "api.ts")

for file in $FILES_WITH_LOCALHOST; do
    echo "处理文件: $file"
    
    # 检查是否已经有 import
    if ! grep -q "buildApiUrl" "$file"; then
        # 在第一个 import 后添加我们的 import
        sed -i '' '1a\
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '"'"'../config/api'"'"';
' "$file"
    fi
done

echo "✅ API 配置导入完成"

# 2. 替换常见的 API 调用模式
echo "🔄 替换硬编码 URL..."

# 替换基本的 fetch 调用
find "$FRONTEND_DIR" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e 's|http://localhost:8080/api/v1/auth/login|buildApiUrl(API_ENDPOINTS.AUTH.LOGIN)|g' \
    -e 's|http://localhost:8080/api/v1/auth/register|buildApiUrl(API_ENDPOINTS.AUTH.REGISTER)|g' \
    -e 's|http://localhost:8080/api/v1/auth/wallet-register|buildApiUrl(API_ENDPOINTS.AUTH.WALLET_REGISTER)|g' \
    -e 's|http://localhost:8080/api/v1/auth/wallet-login|buildApiUrl(API_ENDPOINTS.AUTH.WALLET_LOGIN)|g' \
    -e 's|http://localhost:8080/api/v1/dashboard/stats|buildApiUrl(API_ENDPOINTS.DASHBOARD.STATS)|g' \
    -e 's|http://localhost:8080/api/v1/dashboard/activity|buildApiUrl(API_ENDPOINTS.DASHBOARD.ACTIVITY)|g' \
    -e 's|http://localhost:8080/api/v1/permissions/definitions|buildApiUrl(API_ENDPOINTS.PERMISSIONS.DEFINITIONS)|g' \
    -e 's|http://localhost:8080/api/v1/users/selection|buildApiUrl(API_ENDPOINTS.USERS.SELECTION)|g'

echo "✅ 基本 URL 替换完成"

# 3. 替换动态 URL（需要参数的）
echo "🎯 处理动态 URL..."

# 这些需要手动处理，因为涉及到参数
find "$FRONTEND_DIR" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e 's|`http://localhost:8080/api/v1/safes/\${safeId}/members`|buildApiUrl(API_ENDPOINTS.SAFES.MEMBERS(safeId))|g' \
    -e 's|`http://localhost:8080/api/v1/safes/\${safeId}/proposals`|buildApiUrl(API_ENDPOINTS.PROPOSALS.LIST(safeId))|g' \
    -e 's|`http://localhost:8080/api/v1/users/\${userId}/permissions`|buildApiUrl(API_ENDPOINTS.USERS.PERMISSIONS(userId))|g'

echo "✅ 动态 URL 替换完成"

# 4. 替换 headers
echo "🔧 替换请求头..."

find "$FRONTEND_DIR" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|'Content-Type': 'application/json'|...getAuthHeaders()|g" \
    -e 's|headers: {\s*"Content-Type": "application/json"\s*}|headers: getAuthHeaders()|g'

echo "✅ 请求头替换完成"

echo "🎉 硬编码 URL 修复完成！"
echo ""
echo "📋 接下来需要："
echo "1. 重新构建前端镜像: ./build.sh --frontend-only"
echo "2. 部署到服务器: ssh aliyun 'cd /opt/multisig && ./load-frontend.sh -d'"
echo "3. 测试登录功能"
