#!/bin/bash

# 修复所有 '${buildApiUrl(...)}' 语法错误
echo "🔧 修复模板字符串语法错误..."

# 在 frontend/src 目录下查找并修复所有 .ts 和 .tsx 文件
find frontend/src -name "*.ts" -o -name "*.tsx" | while read -r file; do
    if grep -q "'\\\${buildApiUrl" "$file"; then
        echo "修复文件: $file"
        # 修复 '${buildApiUrl(...)}' -> buildApiUrl(...)
        sed -i.bak "s/'\\\${buildApiUrl(\([^}]*\))}/buildApiUrl(\1)/g" "$file"
        rm -f "$file.bak"
    fi
done

echo "✅ 语法错误修复完成！"

# 验证修复结果
echo "🔍 检查剩余错误..."
REMAINING=$(find frontend/src -name "*.ts" -o -name "*.tsx" | xargs grep -l "'\\\${buildApiUrl" 2>/dev/null | wc -l)
echo "剩余错误文件数: $REMAINING"

if [ "$REMAINING" -eq 0 ]; then
    echo "🎉 所有语法错误已修复！"
else
    echo "⚠️  仍有文件需要手动修复"
fi
