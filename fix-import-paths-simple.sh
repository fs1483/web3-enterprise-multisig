#!/bin/bash

echo "🔧 修复导入路径错误..."

# 修复 pages/safes/ 目录下的导入路径 (从 ../config/api 改为 ../../config/api)
find frontend/src/pages -name "*.ts" -o -name "*.tsx" | while read -r file; do
    if grep -q "from '../config/api'" "$file"; then
        echo "修复文件: $file"
        sed -i.bak "s|from '../config/api'|from '../../config/api'|g" "$file"
        rm -f "$file.bak"
    fi
done

echo "✅ 导入路径修复完成！"

# 验证修复结果
echo "🔍 检查剩余错误..."
REMAINING=$(find frontend/src/pages -name "*.ts" -o -name "*.tsx" | xargs grep -l "from '../config/api'" 2>/dev/null | wc -l)
echo "剩余错误文件数: $REMAINING"

if [ "$REMAINING" -eq 0 ]; then
    echo "🎉 所有导入路径已修复！"
else
    echo "⚠️  仍有文件需要修复"
fi
