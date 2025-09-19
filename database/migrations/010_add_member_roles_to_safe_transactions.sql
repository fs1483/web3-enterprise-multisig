-- =====================================================
-- 添加成员角色信息到Safe交易表
-- 版本: v1.0
-- 功能: 支持Safe创建时的成员角色分配信息存储
-- 作者: Cascade AI
-- 创建时间: 2025-09-18
-- =====================================================

-- 为safe_transactions表添加member_roles字段
ALTER TABLE safe_transactions 
ADD COLUMN IF NOT EXISTS member_roles JSONB DEFAULT '[]'::jsonb;

-- 添加字段注释
COMMENT ON COLUMN safe_transactions.member_roles IS '成员角色分配信息，JSON格式存储地址和角色ID的映射关系';

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_safe_transactions_member_roles 
ON safe_transactions USING GIN (member_roles);

-- 添加示例数据说明
-- member_roles字段格式示例：
-- [
--   {"address": "0x1234...", "role_id": "founder_ceo"},
--   {"address": "0x5678...", "role_id": "finance_director"}
-- ]
