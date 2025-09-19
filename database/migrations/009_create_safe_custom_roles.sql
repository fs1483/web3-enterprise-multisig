-- =====================================================
-- Safe自定义角色表迁移脚本
-- 版本: v1.0
-- 功能: 支持Safe级自定义角色创建和管理
-- 作者: sfan
-- 创建时间: 2024-11-07
-- =====================================================

-- 创建Safe自定义角色表
CREATE TABLE IF NOT EXISTS safe_custom_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    safe_id UUID NOT NULL REFERENCES safes(id) ON DELETE CASCADE,
    role_id VARCHAR(100) NOT NULL, -- 角色标识符，如 "custom_reviewer", "finance_approver"
    role_name VARCHAR(100) NOT NULL, -- 角色显示名称
    role_description TEXT, -- 角色描述
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb, -- 角色包含的权限列表
    restrictions JSONB DEFAULT '{}'::jsonb, -- 角色限制条件
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id), -- 创建者
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 确保同一个Safe内角色ID唯一
    UNIQUE(safe_id, role_id)
);

-- 创建索引优化查询性能
CREATE INDEX idx_safe_custom_roles_safe_id ON safe_custom_roles(safe_id);
CREATE INDEX idx_safe_custom_roles_role_id ON safe_custom_roles(role_id);
CREATE INDEX idx_safe_custom_roles_active ON safe_custom_roles(is_active);
CREATE INDEX idx_safe_custom_roles_created_by ON safe_custom_roles(created_by);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_safe_custom_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_safe_custom_roles_updated_at
    BEFORE UPDATE ON safe_custom_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_safe_custom_roles_updated_at();

-- 添加注释
COMMENT ON TABLE safe_custom_roles IS 'Safe自定义角色表，存储针对特定Safe创建的自定义角色';
COMMENT ON COLUMN safe_custom_roles.safe_id IS '关联的Safe ID';
COMMENT ON COLUMN safe_custom_roles.role_id IS '角色标识符，在同一Safe内唯一';
COMMENT ON COLUMN safe_custom_roles.role_name IS '角色显示名称';
COMMENT ON COLUMN safe_custom_roles.role_description IS '角色功能描述';
COMMENT ON COLUMN safe_custom_roles.permissions IS '角色包含的权限代码列表';
COMMENT ON COLUMN safe_custom_roles.restrictions IS '角色的限制条件（如金额限制、时间限制等）';
COMMENT ON COLUMN safe_custom_roles.is_active IS '角色是否激活';
COMMENT ON COLUMN safe_custom_roles.created_by IS '角色创建者用户ID';

-- 插入一些示例自定义角色（可选）
INSERT INTO safe_custom_roles (safe_id, role_id, role_name, role_description, permissions, created_by)
SELECT 
    s.id as safe_id,
    'custom_finance_approver' as role_id,
    '财务审批员' as role_name,
    '负责审批财务相关的提案，具有金额限制' as role_description,
    '["proposal.approve", "proposal.view", "safe.transaction.view"]'::jsonb as permissions,
    u.id as created_by
FROM safes s
CROSS JOIN users u
WHERE u.role = 'admin'
AND s.status = 'active'
LIMIT 1; -- 只为第一个Safe和第一个管理员创建示例角色

-- 创建角色使用情况统计视图
CREATE OR REPLACE VIEW safe_role_usage_stats AS
SELECT 
    scr.safe_id,
    scr.role_id,
    scr.role_name,
    COUNT(smr.id) as member_count,
    scr.is_active,
    scr.created_at
FROM safe_custom_roles scr
LEFT JOIN safe_member_roles smr ON smr.safe_id = scr.safe_id AND smr.role = scr.role_id AND smr.is_active = true
GROUP BY scr.safe_id, scr.role_id, scr.role_name, scr.is_active, scr.created_at;

COMMENT ON VIEW safe_role_usage_stats IS 'Safe自定义角色使用情况统计视图';
