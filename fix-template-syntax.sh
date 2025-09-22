#!/bin/bash

# =====================================================
# 修复模板字符串语法错误脚本
# 版本: v1.0
# 功能: 修复批量替换导致的 '${buildApiUrl(...)}' 语法错误
# 作者: sfan
# 创建时间: 2024-12-01
# =====================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend/src"

log_info "开始修复模板字符串语法错误..."
log_info "前端目录: $FRONTEND_DIR"

# 检查前端目录是否存在
if [[ ! -d "$FRONTEND_DIR" ]]; then
    log_error "前端目录不存在: $FRONTEND_DIR"
    exit 1
fi

# 修复计数器
FIXED_COUNT=0

# 查找并修复所有包含错误语法的文件
log_info "搜索包含错误语法的文件..."

# 使用 find 和 grep 查找包含错误语法的文件
FILES_WITH_ERRORS=$(find "$FRONTEND_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -l "'\\\${buildApiUrl" 2>/dev/null || true)

if [[ -z "$FILES_WITH_ERRORS" ]]; then
    log_success "没有发现需要修复的文件"
    exit 0
fi

log_info "发现需要修复的文件:"
echo "$FILES_WITH_ERRORS" | while read -r file; do
    echo "  - $file"
done

echo ""

# 修复每个文件
echo "$FILES_WITH_ERRORS" | while read -r file; do
    if [[ -f "$file" ]]; then
        log_info "修复文件: $file"
        
        # 备份原文件
        cp "$file" "$file.backup"
        
        # 执行修复
        # 1. 修复 '${buildApiUrl(...)}' -> buildApiUrl(...)
        sed -i.tmp "s/'\\\${buildApiUrl(\([^}]*\))}'/buildApiUrl(\1)/g" "$file"
        
        # 2. 修复 "${buildApiUrl(...)}" -> buildApiUrl(...)
        sed -i.tmp "s/\"\\\${buildApiUrl(\([^}]*\))}\"/buildApiUrl(\1)/g" "$file"
        
        # 3. 修复 `${buildApiUrl(...)}` -> buildApiUrl(...) (在非模板字符串中)
        sed -i.tmp "s/\`\\\${buildApiUrl(\([^}]*\))}\`/buildApiUrl(\1)/g" "$file"
        
        # 删除临时文件
        rm -f "$file.tmp"
        
        # 检查修复是否成功
        if ! grep -q '\$\{buildApiUrl' "$file" 2>/dev/null; then
            log_success "✅ 修复成功: $file"
            rm -f "$file.backup"  # 删除备份文件
            FIXED_COUNT=$((FIXED_COUNT + 1))
        else
            log_warning "⚠️  可能需要手动修复: $file"
            # 保留备份文件以便手动恢复
        fi
    fi
done

# 特殊处理一些可能需要手动修复的复杂情况
log_info "检查是否还有其他语法错误..."

# 查找可能的其他模板字符串错误
OTHER_ERRORS=$(find "$FRONTEND_DIR" -name "*.ts" -o -name "*.tsx" | xargs grep -l "'\\\${" 2>/dev/null || true)

if [[ -n "$OTHER_ERRORS" ]]; then
    log_warning "发现其他可能的模板字符串错误:"
    echo "$OTHER_ERRORS" | while read -r file; do
        echo "  - $file"
        grep -n "'\\\${" "$file" | head -3
    done
fi

log_success "修复完成！"
log_info "修复文件数量: $FIXED_COUNT"

# 验证 TypeScript 编译
log_info "验证 TypeScript 编译..."
cd "$SCRIPT_DIR/frontend"

if command -v npm &> /dev/null; then
    log_info "运行 TypeScript 类型检查..."
    if npm run type-check 2>/dev/null; then
        log_success "✅ TypeScript 编译通过"
    else
        log_warning "⚠️  TypeScript 编译仍有错误，可能需要进一步修复"
    fi
else
    log_warning "npm 未安装，跳过 TypeScript 验证"
fi

log_success "🎉 语法错误修复脚本执行完成！"
