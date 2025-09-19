-- =====================================================
-- 权限管理系统数据库迁移脚本
-- 版本: v2.0
-- 功能: 为Web3企业级多签系统添加完整的权限管理功能
-- 作者: Cascade AI
-- 创建时间: 2025-09-16
-- =====================================================

-- 权限定义表：定义系统中所有可用的权限
-- 支持系统内置权限和用户自定义权限
CREATE TABLE IF NOT EXISTS permission_definitions (
    -- 主键和基础信息
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,              -- 权限标识符，如 'safe.proposal.create'
    name VARCHAR(255) NOT NULL,                     -- 权限显示名称
    description TEXT,                               -- 权限详细描述
    
    -- 权限分类和作用域
    category VARCHAR(50) NOT NULL CHECK (category IN ('system', 'safe', 'proposal', 'member', 'policy')), -- 权限分类
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('system', 'safe', 'operation')), -- 权限作用域
    
    -- 权限属性
    is_system BOOLEAN DEFAULT false,                -- 是否为系统内置权限（不可删除）
    is_active BOOLEAN DEFAULT true,                 -- 权限是否激活
    
    -- 审计字段
    created_by UUID REFERENCES users(id),           -- 创建者（系统权限为NULL）
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 索引优化
    CONSTRAINT valid_permission_code CHECK (code ~ '^[a-z]+(\.[a-z_]+)*$')
);

-- Safe成员角色表：定义用户在特定Safe中的角色和权限
-- 替代原有的简单owners数组，提供细粒度权限控制
CREATE TABLE IF NOT EXISTS safe_member_roles (
    -- 主键和关联
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    safe_id UUID NOT NULL REFERENCES safes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL,            -- 用户钱包地址（冗余存储，便于查询）
    
    -- 角色信息
    role VARCHAR(50) NOT NULL,                      -- 角色名称：safe_admin, safe_treasurer, safe_operator, safe_viewer
    role_level INTEGER DEFAULT 1,                  -- 角色级别，数字越小权限越高
    
    -- 权限配置
    permissions JSONB DEFAULT '{}',                 -- 自定义权限配置
    restrictions JSONB DEFAULT '{}',                -- 权限限制条件（如金额限制、时间限制）
    
    -- 状态管理
    is_active BOOLEAN DEFAULT true,                 -- 角色是否激活
    assigned_by UUID NOT NULL REFERENCES users(id), -- 角色分配者
    assigned_at TIMESTAMP DEFAULT NOW(),            -- 角色分配时间
    expires_at TIMESTAMP,                           -- 角色过期时间（可选）
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 约束条件
    UNIQUE(safe_id, user_id),                       -- 每个用户在每个Safe中只能有一个角色
    UNIQUE(safe_id, wallet_address),                -- 每个钱包地址在每个Safe中只能有一个角色
    
    -- 检查约束
    CONSTRAINT valid_role CHECK (role IN ('safe_admin', 'safe_treasurer', 'safe_operator', 'safe_viewer')),
    CONSTRAINT valid_role_level CHECK (role_level BETWEEN 1 AND 10),
    CONSTRAINT valid_wallet_address CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$')
);

-- Safe角色权限关联表：定义每个角色具有的具体权限
-- 支持角色权限的灵活配置和自定义扩展
CREATE TABLE IF NOT EXISTS safe_role_permissions (
    -- 主键和关联
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    safe_id UUID NOT NULL REFERENCES safes(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,                      -- 角色名称
    permission_code VARCHAR(100) NOT NULL REFERENCES permission_definitions(code) ON DELETE CASCADE,
    
    -- 权限限制
    restrictions JSONB DEFAULT '{}',                -- 该权限的特定限制条件
    
    -- 状态管理
    is_active BOOLEAN DEFAULT true,                 -- 权限是否激活
    
    -- 审计字段
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 约束条件
    UNIQUE(safe_id, role, permission_code),         -- 同一Safe中同一角色不能重复分配同一权限
    
    -- 检查约束
    CONSTRAINT valid_role_permission CHECK (role IN ('safe_admin', 'safe_treasurer', 'safe_operator', 'safe_viewer'))
);

-- 用户自定义权限表：支持为特定用户分配特殊权限
-- 用于处理临时权限、特殊授权等场景
-- safe_id为NULL表示系统级权限，非NULL表示特定Safe的权限
CREATE TABLE IF NOT EXISTS user_custom_permissions (
    -- 主键和关联
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    safe_id UUID REFERENCES safes(id) ON DELETE CASCADE, -- 允许NULL，表示系统级权限
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_code VARCHAR(100) NOT NULL REFERENCES permission_definitions(code) ON DELETE CASCADE,
    
    -- 权限状态
    granted BOOLEAN DEFAULT true,                   -- true=授予权限, false=撤销权限
    restrictions JSONB DEFAULT '{}',                -- 权限限制条件
    
    -- 时效性
    expires_at TIMESTAMP,                           -- 权限过期时间
    
    -- 审计字段
    granted_by UUID NOT NULL REFERENCES users(id), -- 权限授予者
    granted_reason TEXT,                            -- 授权原因
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 检查约束
    CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- 为系统级权限（safe_id为NULL）创建唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_custom_permissions_system_unique 
ON user_custom_permissions (user_id, permission_code) 
WHERE safe_id IS NULL;

-- 为Safe级权限创建唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_custom_permissions_safe_unique 
ON user_custom_permissions (safe_id, user_id, permission_code) 
WHERE safe_id IS NOT NULL;

-- 创建视图便于查询系统级权限
CREATE OR REPLACE VIEW system_user_permissions AS
SELECT 
    id,
    user_id,
    permission_code,
    granted,
    restrictions,
    expires_at,
    granted_by,
    granted_reason,
    created_at,
    updated_at
FROM user_custom_permissions 
WHERE safe_id IS NULL;

-- 创建视图便于查询Safe级权限
CREATE OR REPLACE VIEW safe_user_permissions AS
SELECT 
    id,
    safe_id,
    user_id,
    permission_code,
    granted,
    restrictions,
    expires_at,
    granted_by,
    granted_reason,
    created_at,
    updated_at
FROM user_custom_permissions 
WHERE safe_id IS NOT NULL;

-- 权限操作审计日志表：记录所有权限相关的操作
-- 用于安全审计和问题排查
CREATE TABLE IF NOT EXISTS permission_audit_logs (
    -- 主键和基础信息
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    safe_id UUID REFERENCES safes(id),              -- Safe ID（可选，系统级操作为NULL）
    user_id UUID NOT NULL REFERENCES users(id),     -- 操作用户
    
    -- 操作信息
    action VARCHAR(100) NOT NULL,                   -- 操作类型：check_permission, assign_role, grant_permission等
    resource_type VARCHAR(50) NOT NULL,             -- 资源类型：proposal, safe, member, permission
    resource_id UUID,                               -- 资源ID
    
    -- 权限验证结果
    permission_granted BOOLEAN NOT NULL,            -- 权限是否被授予
    required_permission VARCHAR(100),               -- 所需权限
    user_role VARCHAR(50),                          -- 用户当前角色
    denial_reason TEXT,                             -- 拒绝原因（如果被拒绝）
    
    -- 上下文信息
    request_context JSONB DEFAULT '{}',             -- 请求上下文（如金额、操作参数等）
    ip_address INET,                                -- 请求IP地址
    user_agent TEXT,                                -- 用户代理
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 创建索引以优化查询性能
-- =====================================================

-- 权限定义表索引
CREATE INDEX IF NOT EXISTS idx_permission_definitions_category ON permission_definitions(category);
CREATE INDEX IF NOT EXISTS idx_permission_definitions_scope ON permission_definitions(scope);
CREATE INDEX IF NOT EXISTS idx_permission_definitions_active ON permission_definitions(is_active);

-- Safe成员角色表索引
CREATE INDEX IF NOT EXISTS idx_safe_member_roles_safe_id ON safe_member_roles(safe_id);
CREATE INDEX IF NOT EXISTS idx_safe_member_roles_user_id ON safe_member_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_safe_member_roles_wallet ON safe_member_roles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_safe_member_roles_role ON safe_member_roles(role);
CREATE INDEX IF NOT EXISTS idx_safe_member_roles_active ON safe_member_roles(is_active);

-- Safe角色权限关联表索引
CREATE INDEX IF NOT EXISTS idx_safe_role_permissions_safe_role ON safe_role_permissions(safe_id, role);
CREATE INDEX IF NOT EXISTS idx_safe_role_permissions_permission ON safe_role_permissions(permission_code);
CREATE INDEX IF NOT EXISTS idx_safe_role_permissions_active ON safe_role_permissions(is_active);

-- 为user_custom_permissions表创建索引
-- 系统级权限索引
CREATE INDEX IF NOT EXISTS idx_user_custom_permissions_system 
ON user_custom_permissions (user_id, granted) 
WHERE safe_id IS NULL;

-- Safe级权限索引
CREATE INDEX IF NOT EXISTS idx_user_custom_permissions_safe 
ON user_custom_permissions (safe_id, user_id, granted) 
WHERE safe_id IS NOT NULL;

-- 通用索引
CREATE INDEX IF NOT EXISTS idx_user_custom_permissions_user_permission ON user_custom_permissions(user_id, permission_code);
CREATE INDEX IF NOT EXISTS idx_user_custom_permissions_expires ON user_custom_permissions(expires_at) WHERE expires_at IS NOT NULL;

-- 权限审计日志表索引
CREATE INDEX IF NOT EXISTS idx_permission_audit_safe_id ON permission_audit_logs(safe_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_user_id ON permission_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_action ON permission_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_permission_audit_created_at ON permission_audit_logs(created_at);

-- =====================================================
-- 插入系统默认权限定义
-- =====================================================

-- Safe基础权限
-- INSERT INTO permission_definitions (code, name, description, category, scope, is_system) VALUES
-- -- Safe信息权限
-- ('safe.info.view', '查看Safe信息', '查看Safe基本信息、余额、成员列表等', 'safe', 'safe', true),
-- ('safe.info.manage', '管理Safe设置', '修改Safe名称、描述等基本设置', 'safe', 'safe', true),
-- ('safe.info.delete', '删除Safe', '删除Safe钱包（危险操作）', 'safe', 'safe', true),

-- -- 提案相关权限
-- ('safe.proposal.view', '查看提案', '查看Safe中的所有提案', 'proposal', 'safe', true),
-- ('safe.proposal.create', '创建提案', '创建新的提案', 'proposal', 'operation', true),
-- ('safe.proposal.edit', '编辑提案', '编辑未执行的提案', 'proposal', 'operation', true),
-- ('safe.proposal.delete', '删除提案', '删除未执行的提案', 'proposal', 'operation', true),
-- ('safe.proposal.sign', '签名提案', '对提案进行签名确认', 'proposal', 'operation', true),
-- ('safe.proposal.execute', '执行提案', '执行已获得足够签名的提案', 'proposal', 'operation', true),

-- -- 按提案类型细分的创建权限
-- ('safe.proposal.create.transfer', '创建转账提案', '创建ETH或代币转账提案', 'proposal', 'operation', true),
-- ('safe.proposal.create.contract', '创建合约调用提案', '创建智能合约交互提案', 'proposal', 'operation', true),
-- ('safe.proposal.create.governance', '创建治理提案', '创建Safe治理相关提案（如添加/移除成员、修改阈值）', 'proposal', 'operation', true),

-- -- 成员管理权限
-- ('safe.member.view', '查看成员', '查看Safe成员列表和角色信息', 'member', 'safe', true),
-- ('safe.member.invite', '邀请成员', '邀请新成员加入Safe', 'member', 'operation', true),
-- ('safe.member.remove', '移除成员', '从Safe中移除成员', 'member', 'operation', true),
-- ('safe.member.assign_role', '分配角色', '为Safe成员分配或修改角色', 'member', 'operation', true),

-- -- 策略管理权限
-- ('safe.policy.view', '查看策略', '查看Safe的治理策略配置', 'policy', 'safe', true),
-- ('safe.policy.create', '创建策略', '创建新的治理策略', 'policy', 'operation', true),
-- ('safe.policy.edit', '编辑策略', '修改现有的治理策略', 'policy', 'operation', true),
-- ('safe.policy.delete', '删除策略', '删除治理策略', 'policy', 'operation', true),
-- ('safe.policy.activate', '激活策略', '激活或停用治理策略', 'policy', 'operation', true);

-- 继续插入系统级权限
-- INSERT INTO permission_definitions (code, name, description, category, scope, is_system) VALUES
-- -- 系统级权限
-- ('system.admin.full', '系统管理员', '系统完全管理权限', 'system', 'system', true),
-- ('system.audit.view', '审计查看', '查看系统审计日志', 'system', 'system', true),
-- ('system.user.manage', '用户管理', '管理系统用户', 'system', 'system', true);



-- =====================================================
-- 扩展权限定义表，添加映射字段
-- =====================================================

-- 添加权限映射相关字段
ALTER TABLE permission_definitions ADD COLUMN IF NOT EXISTS mapping_type VARCHAR(20); -- 映射类型
ALTER TABLE permission_definitions ADD COLUMN IF NOT EXISTS mapping_url VARCHAR(500);  -- 对应的URL或API端点
ALTER TABLE permission_definitions ADD COLUMN IF NOT EXISTS mapping_method VARCHAR(10); -- HTTP方法
ALTER TABLE permission_definitions ADD COLUMN IF NOT EXISTS ui_element_id VARCHAR(100); -- 前端元素ID
ALTER TABLE permission_definitions ADD COLUMN IF NOT EXISTS parent_permission VARCHAR(100); -- 父权限（用于层级关系）
ALTER TABLE permission_definitions ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0; -- 显示顺序

-- 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_permission_mapping_type ON permission_definitions(mapping_type);
CREATE INDEX IF NOT EXISTS idx_permission_mapping_url ON permission_definitions(mapping_url);
CREATE INDEX IF NOT EXISTS idx_permission_ui_element ON permission_definitions(ui_element_id);
CREATE INDEX IF NOT EXISTS idx_permission_parent ON permission_definitions(parent_permission);

-- 添加父权限外键约束（在所有权限插入完成后）
-- ALTER TABLE permission_definitions ADD CONSTRAINT fk_parent_permission 
-- FOREIGN KEY (parent_permission) REFERENCES permission_definitions(code) ON DELETE SET NULL;

-- 添加权限分类约束（确保分类值符合业务需求）
-- 注意：如果表中已有不符合约束的数据，需要先清理数据再启用约束
-- ALTER TABLE permission_definitions 
-- ADD CONSTRAINT IF NOT EXISTS check_category_valid 
-- CHECK (category IN ('system', 'safe', 'proposal', 'member', 'policy'));

-- 添加映射类型约束（暂时注释，等数据完善后再启用）
-- ALTER TABLE permission_definitions 
-- ADD CONSTRAINT IF NOT EXISTS check_mapping_type_valid 
-- CHECK (mapping_type IN ('menu', 'button', 'api', 'page', 'feature'));

-- 添加HTTP方法约束（暂时注释，等数据完善后再启用）
-- ALTER TABLE permission_definitions 
-- ADD CONSTRAINT IF NOT EXISTS check_mapping_method_valid 
-- CHECK (mapping_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH'));

-- 添加显示顺序约束（暂时注释，等数据完善后再启用）
-- ALTER TABLE permission_definitions 
-- ADD CONSTRAINT IF NOT EXISTS check_display_order_valid 
-- CHECK (display_order >= 0);



-- =====================================================
-- 插入默认角色权限配置
-- =====================================================

-- 注意：这里暂时不插入具体的Safe角色权限配置
-- 因为需要等待Safe创建后才能关联具体的safe_id
-- 这部分逻辑将在应用层处理，为新创建的Safe自动配置默认角色权限

-- =====================================================
-- 创建触发器以自动更新时间戳
-- =====================================================

-- 权限定义表更新时间戳触发器
CREATE OR REPLACE FUNCTION update_permission_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_permission_definitions_updated_at
    BEFORE UPDATE ON permission_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_permission_definitions_updated_at();

-- Safe成员角色表更新时间戳触发器
CREATE OR REPLACE FUNCTION update_safe_member_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_safe_member_roles_updated_at
    BEFORE UPDATE ON safe_member_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_safe_member_roles_updated_at();

-- Safe角色权限关联表更新时间戳触发器
CREATE OR REPLACE FUNCTION update_safe_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_safe_role_permissions_updated_at
    BEFORE UPDATE ON safe_role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_safe_role_permissions_updated_at();

-- 用户自定义权限表更新时间戳触发器
CREATE OR REPLACE FUNCTION update_user_custom_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_custom_permissions_updated_at
    BEFORE UPDATE ON user_custom_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_custom_permissions_updated_at();

-- =====================================================
-- 数据完整性检查函数
-- =====================================================

-- 检查用户是否有权限分配角色
CREATE OR REPLACE FUNCTION check_role_assignment_permission(
    assigner_user_id UUID,
    target_safe_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    assigner_role VARCHAR(50);
BEGIN
    -- 获取分配者在该Safe中的角色
    SELECT role INTO assigner_role
    FROM safe_member_roles
    WHERE user_id = assigner_user_id 
      AND safe_id = target_safe_id 
      AND is_active = true;
    
    -- 只有safe_admin可以分配角色
    RETURN (assigner_role = 'safe_admin');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 注释说明
-- =====================================================

-- 表注释
COMMENT ON TABLE permission_definitions IS '权限定义表：定义系统中所有可用的权限，支持系统内置权限和用户自定义权限';
COMMENT ON TABLE safe_member_roles IS 'Safe成员角色表：定义用户在特定Safe中的角色和权限，替代原有的简单owners数组';
COMMENT ON TABLE safe_role_permissions IS 'Safe角色权限关联表：定义每个角色具有的具体权限，支持角色权限的灵活配置';
COMMENT ON TABLE user_custom_permissions IS '用户自定义权限表：支持为特定用户分配特殊权限，用于临时权限和特殊授权';
COMMENT ON TABLE permission_audit_logs IS '权限操作审计日志表：记录所有权限相关的操作，用于安全审计和问题排查';

-- 字段注释示例（关键字段）
COMMENT ON COLUMN permission_definitions.code IS '权限标识符，采用分层级命名如safe.proposal.create，便于权限继承和管理';
COMMENT ON COLUMN safe_member_roles.role_level IS '角色级别，数字越小权限越高，用于权限冲突时的优先级判断';
COMMENT ON COLUMN safe_member_roles.restrictions IS '权限限制条件，JSON格式存储如金额限制、时间限制等';
COMMENT ON COLUMN permission_audit_logs.request_context IS '请求上下文，JSON格式存储操作相关的参数和环境信息';

-- =====================================================
-- 迁移脚本完成
-- 执行此脚本后，系统将具备完整的权限管理功能
-- 下一步需要在应用层实现权限验证逻辑和管理界面
-- =====================================================
