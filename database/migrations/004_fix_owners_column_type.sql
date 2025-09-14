-- 修复safe_transactions表中owners字段的数据类型
-- 从JSONB改为text[]以匹配Go模型中的pq.StringArray

-- 删除现有的owners列（如果有数据，需要先备份）
ALTER TABLE safe_transactions DROP COLUMN IF EXISTS owners;

-- 重新添加owners列，使用text[]类型
ALTER TABLE safe_transactions ADD COLUMN owners text[] NOT NULL;

-- 添加注释
COMMENT ON COLUMN safe_transactions.owners IS 'Safe所有者地址数组，使用PostgreSQL text[]类型';
