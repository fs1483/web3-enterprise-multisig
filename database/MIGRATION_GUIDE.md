# Safe权限管理数据库迁移指南

## 概述
本指南用于执行Safe级权限管理功能的数据库迁移，包括三个新增表的创建。

## 迁移文件列表

### 1. Safe角色模板关联表
**文件**: `008_create_safe_role_templates.sql`
**功能**: 存储应用到Safe的权限模板信息
**表名**: `safe_role_templates`

### 2. Safe自定义角色表  
**文件**: `009_create_safe_custom_roles.sql`
**功能**: 存储Safe级自定义角色定义
**表名**: `safe_custom_roles`

### 3. Safe交易表扩展
**文件**: `010_add_member_roles_to_safe_transactions.sql`
**功能**: 为safe_transactions表添加member_roles字段
**修改**: 添加JSONB字段存储成员角色分配信息

## 执行步骤

### 方法1: 使用psql命令行（推荐）

```bash
# 1. 连接到数据库
psql -h localhost -p 5432 -U postgres -d multisig_dev

# 2. 按顺序执行迁移文件
\i /Users/shuangfan/blockchain-project/multisig/web3-enterprise-multisig/database/migrations/008_create_safe_role_templates.sql
\i /Users/shuangfan/blockchain-project/multisig/web3-enterprise-multisig/database/migrations/009_create_safe_custom_roles.sql
\i /Users/shuangfan/blockchain-project/multisig/web3-enterprise-multisig/database/migrations/010_add_member_roles_to_safe_transactions.sql

# 3. 验证表创建
\dt safe_role_templates
\dt safe_custom_roles
\d safe_transactions
```

### 方法2: 批量执行脚本

```bash
# 创建批量执行脚本
cat > run_migrations.sh << 'EOF'
#!/bin/bash
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="multisig_dev"

echo "开始执行Safe权限管理迁移..."

echo "1. 创建Safe角色模板关联表..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/migrations/008_create_safe_role_templates.sql

echo "2. 创建Safe自定义角色表..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/migrations/009_create_safe_custom_roles.sql

echo "3. 扩展Safe交易表..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/migrations/010_add_member_roles_to_safe_transactions.sql

echo "✅ 所有迁移执行完成！"
EOF

# 执行脚本
chmod +x run_migrations.sh
./run_migrations.sh
```

## 验证迁移结果

### 检查表结构
```sql
-- 检查safe_role_templates表
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'safe_role_templates';

-- 检查safe_custom_roles表
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'safe_custom_roles';

-- 检查safe_transactions表的新字段
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'safe_transactions' AND column_name = 'member_roles';
```

### 检查索引创建
```sql
-- 检查索引
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename IN ('safe_role_templates', 'safe_custom_roles', 'safe_transactions')
AND indexname LIKE '%safe%role%';
```

### 检查触发器
```sql
-- 检查触发器
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table IN ('safe_role_templates', 'safe_custom_roles');
```

## 回滚方案（如需要）

```sql
-- 回滚脚本（谨慎使用）
DROP TABLE IF EXISTS safe_custom_roles CASCADE;
DROP TABLE IF EXISTS safe_role_templates CASCADE;
ALTER TABLE safe_transactions DROP COLUMN IF EXISTS member_roles;

-- 删除相关函数
DROP FUNCTION IF EXISTS update_safe_role_templates_updated_at();
DROP FUNCTION IF EXISTS update_safe_custom_roles_updated_at();
```

## 数据示例

### safe_role_templates表数据示例
```sql
INSERT INTO safe_role_templates (
    safe_id, template_id, template_name, template_display_name, 
    template_category, permissions, applied_by
) VALUES (
    'safe-uuid-here',
    'founder_ceo',
    'founder_ceo',
    '👑 创始人/CEO',
    'system',
    '["safe.info.view", "safe.member.manage", "safe.proposal.create"]'::jsonb,
    'user-uuid-here'
);
```

### safe_custom_roles表数据示例
```sql
INSERT INTO safe_custom_roles (
    safe_id, role_id, role_name, role_description, permissions, created_by
) VALUES (
    'safe-uuid-here',
    'custom_reviewer',
    '财务审核员',
    '负责审核财务相关的提案',
    '["safe.info.view", "safe.proposal.view", "finance.review"]'::jsonb,
    'user-uuid-here'
);
```

## 注意事项

1. **备份数据库**: 执行迁移前请备份数据库
2. **权限检查**: 确保数据库用户有CREATE TABLE权限
3. **外键约束**: 新表依赖safes和users表，确保这些表存在
4. **字符编码**: 确保数据库使用UTF-8编码支持中文
5. **连接参数**: 根据实际环境调整数据库连接参数

## 故障排除

### 常见错误及解决方案

1. **表已存在错误**
   ```
   ERROR: relation "safe_role_templates" already exists
   ```
   解决：使用`CREATE TABLE IF NOT EXISTS`语法（已包含）

2. **外键约束错误**
   ```
   ERROR: relation "safes" does not exist
   ```
   解决：确保先执行基础表的迁移

3. **权限不足错误**
   ```
   ERROR: permission denied for schema public
   ```
   解决：使用具有足够权限的数据库用户

4. **编码问题**
   ```
   ERROR: invalid byte sequence for encoding "UTF8"
   ```
   解决：确保数据库和客户端都使用UTF-8编码

## 联系支持

如遇到迁移问题，请检查：
1. 数据库连接配置
2. 用户权限设置
3. 依赖表是否存在
4. 日志文件中的详细错误信息
