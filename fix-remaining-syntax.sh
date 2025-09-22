#!/bin/bash

echo "🔧 修复剩余的语法错误..."

# 修复所有包含 '${buildApiUrl(...)}' 错误语法的文件
find frontend/src -name "*.ts" -o -name "*.tsx" | while read -r file; do
    if grep -q "buildApiUrl('')'" "$file"; then
        echo "修复文件: $file"
        # 修复 buildApiUrl('')' -> buildApiUrl('')
        sed -i.bak "s/buildApiUrl('')'/buildApiUrl('')/g" "$file"
        rm -f "$file.bak"
    fi
done

echo "✅ 语法错误修复完成！"

# 检查剩余错误
echo "🔍 检查剩余错误..."
REMAINING=$(find frontend/src -name "*.ts" -o -name "*.tsx" | xargs grep -l "buildApiUrl('')'" 2>/dev/null | wc -l)
echo "剩余错误文件数: $REMAINING"

if [ "$REMAINING" -eq 0 ]; then
    echo "🎉 所有语法错误已修复！"
else
    echo "⚠️  仍有文件需要手动修复"
    find frontend/src -name "*.ts" -o -name "*.tsx" | xargs grep -l "buildApiUrl('')'" 2>/dev/null
fi
