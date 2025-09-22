-- =====================================================
-- 权限管理系统数据插入脚本
-- 版本: v6.0 (正确合并版本)
-- 功能: 合并006和002文件的权限数据，一次性插入完整权限
-- 作者: sfan
-- 创建时间: 2024-08-14
-- =====================================================

-- =====================================================
-- 插入基础权限定义（来自006_add_permission_management.sql 244-274行）
-- 这些权限需要根据业务逻辑补全映射字段
-- =====================================================


-- 删除旧的约束
ALTER TABLE permission_definitions DROP CONSTRAINT permission_definitions_category_check;

-- 添加新的约束（与本地一致）
ALTER TABLE permission_definitions ADD CONSTRAINT permission_definitions_category_check 
CHECK (category::text = ANY (ARRAY['system'::character varying, 'safe'::character varying, 'proposal'::character varying, 'member'::character varying, 'policy'::character varying, 'transaction'::character varying, 'PATCH'::character varying]::text[]));


-- Safe基础权限（补全API映射字段）
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) VALUES
-- Safe信息权限 (API类型)
('safe.info.view', '查看Safe信息', '查看Safe基本信息、余额、成员列表等', 'safe', 'safe', true, 'api', '/api/v1/safes/:safeId', 'GET', 100),
('safe.info.manage', '管理Safe设置', '修改Safe名称、描述等基本设置', 'safe', 'safe', true, 'api', '/api/v1/safes/:safeId', 'PUT', 101),
('safe.info.delete', '删除Safe', '删除Safe钱包（危险操作）', 'safe', 'safe', true, 'api', '/api/v1/safes/:safeId', 'DELETE', 102),

-- 提案相关权限 (API类型)
('safe.proposal.view', '查看提案', '查看Safe中的所有提案', 'proposal', 'safe', true, 'api', '/api/v1/proposals', 'GET', 200),
('safe.proposal.create', '创建提案', '创建新的提案', 'proposal', 'operation', true, 'api', '/api/v1/proposals', 'POST', 201),
('safe.proposal.edit', '编辑提案', '编辑未执行的提案', 'proposal', 'operation', true, 'api', '/api/v1/proposals/:id', 'PUT', 202),
('safe.proposal.delete', '删除提案', '删除未执行的提案', 'proposal', 'operation', true, 'api', '/api/v1/proposals/:id', 'DELETE', 203),
('safe.proposal.sign', '签名提案', '对提案进行签名确认', 'proposal', 'operation', true, 'api', '/api/v1/proposals/:id/sign', 'POST', 204),
('safe.proposal.execute', '执行提案', '执行已获得足够签名的提案', 'proposal', 'operation', true, 'api', '/api/v1/proposals/:id/execute', 'POST', 205),

-- 按提案类型细分的创建权限 (功能类型)
('safe.proposal.create.transfer', '创建转账提案', '创建ETH或代币转账提案', 'proposal', 'operation', true, 'feature', '/proposals/create/transfer', NULL, 210),
('safe.proposal.create.contract', '创建合约调用提案', '创建智能合约交互提案', 'proposal', 'operation', true, 'feature', '/proposals/create/contract', NULL, 211),
('safe.proposal.create.governance', '创建治理提案', '创建Safe治理相关提案（如添加/移除成员、修改阈值）', 'proposal', 'operation', true, 'feature', '/proposals/create/governance', NULL, 212),

-- 成员管理权限 (API类型)
('safe.member.view', '查看成员', '查看Safe成员列表和角色信息', 'member', 'safe', true, 'api', '/api/v1/safes/:safeId/members', 'GET', 300),
('safe.member.invite', '邀请成员', '邀请新成员加入Safe', 'member', 'operation', true, 'api', '/api/v1/safes/:safeId/members', 'POST', 301),
('safe.member.remove', '移除成员', '从Safe中移除成员', 'member', 'operation', true, 'api', '/api/v1/safes/:safeId/members/:user_id', 'DELETE', 302),
('safe.member.assign_role', '分配角色', '为Safe成员分配或修改角色', 'member', 'operation', true, 'api', '/api/v1/safes/:safeId/members/roles', 'POST', 303),

-- 策略管理权限 (API类型)
('safe.policy.view', '查看策略', '查看Safe的治理策略配置', 'policy', 'safe', true, 'api', '/api/v1/safes/:safeId/policies', 'GET', 400),
('safe.policy.create', '创建策略', '创建新的治理策略', 'policy', 'operation', true, 'api', '/api/v1/safes/:safeId/policies', 'POST', 401),
('safe.policy.edit', '编辑策略', '修改现有的治理策略', 'policy', 'operation', true, 'api', '/api/v1/safes/:safeId/policies/:id', 'PUT', 402),
('safe.policy.delete', '删除策略', '删除治理策略', 'policy', 'operation', true, 'api', '/api/v1/safes/:safeId/policies/:id', 'DELETE', 403),
('safe.policy.activate', '激活策略', '激活或停用治理策略', 'policy', 'operation', true, 'api', '/api/v1/safes/:safeId/policies/:id/activate', 'POST', 404)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 插入系统级权限（来自006_add_permission_management.sql 320-324行）
-- 补全功能类型映射字段
-- =====================================================

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, display_order) VALUES
('system.admin.full', '系统管理员', '系统完全管理权限', 'system', 'system', true, 'feature', '/admin', 500),
('system.audit.view', '审计查看', '查看系统审计日志', 'system', 'system', true, 'feature', '/audit', 501),
('system.user.manage', '用户管理', '管理系统用户', 'system', 'system', true, 'feature', '/users', 502)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 插入菜单权限映射（来自002_permission_mappings.sql）
-- 直接迁移，已有完整映射字段
-- =====================================================

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) VALUES
('system.dashboard.view', '仪表板访问', '访问系统仪表板页面', 'system', 'system', true, 'menu', '/', 'nav-dashboard', 1),
('system.menu.proposals', '提案菜单', '访问提案管理页面', 'proposal', 'system', true, 'menu', '/proposals', 'nav-proposals', 2),
('system.menu.safes', 'Safe菜单', '访问Safe钱包管理页面', 'safe', 'system', true, 'menu', '/safes', 'nav-safes', 3),
('system.menu.transactions', '交易菜单', '访问交易记录页面', 'transaction', 'system', true, 'menu', '/transactions', 'nav-transactions', 4),
('system.menu.permissions', '权限管理菜单', '访问权限管理页面', 'system', 'system', true, 'menu', '/permissions', 'nav-permissions', 5),
('system.menu.policies', '策略管理菜单', '访问策略管理页面', 'policy', 'system', true, 'menu', '/policies', 'nav-policies', 6),
('system.menu.analytics', '分析菜单', '访问数据分析页面', 'system', 'system', true, 'menu', '/analytics', 'nav-analytics', 7),
('system.menu.team', '团队菜单', '访问团队管理页面', 'system', 'system', true, 'menu', '/team', 'nav-team', 8),
('system.menu.settings', '设置菜单', '访问用户设置页面', 'system', 'system', true, 'menu', '/settings', 'nav-settings', 9)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 插入页面权限映射（来自002_permission_mappings.sql）
-- 直接迁移，已有完整映射字段
-- =====================================================

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, display_order) VALUES
('system.page.dashboard', '仪表板页面', '访问系统仪表板页面', 'system', 'system', true, 'page', '/', 1),
('system.page.proposals', '提案列表页面', '访问提案列表页面', 'proposal', 'system', true, 'page', '/proposals', 2),
('system.page.proposal_create', '创建提案页面', '访问创建提案页面', 'proposal', 'system', true, 'page', '/proposals/create', 3),
('system.page.proposal_detail', '提案详情页面', '访问提案详情页面', 'proposal', 'system', true, 'page', '/proposals/:id', 4),
('system.page.safes', 'Safe列表页面', '访问Safe钱包列表页面', 'safe', 'system', true, 'page', '/safes', 5),
('system.page.safe_create', '创建Safe页面', '访问创建Safe钱包页面', 'safe', 'system', true, 'page', '/safes/create', 6),
('system.page.safe_detail', 'Safe详情页面', '访问Safe钱包详情页面', 'safe', 'system', true, 'page', '/safes/:safeAddress', 7),
('system.page.permissions', '权限管理页面', '访问统一权限管理页面', 'system', 'system', true, 'page', '/permissions', 8),
('system.page.settings', '用户设置页面', '访问用户设置页面', 'system', 'system', true, 'page', '/settings', 9),
('system.page.admin', '管理员页面', '访问管理员控制台', 'system', 'system', true, 'page', '/admin', 10)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 插入按钮权限映射（来自002_permission_mappings.sql）
-- 直接迁移，已有完整映射字段
-- =====================================================

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) VALUES
-- Dashboard快速操作按钮
('dashboard.button.create_proposal', '创建提案按钮', '显示Dashboard中的创建提案按钮', 'proposal', 'operation', true, 'button', '/', 'btn-create-proposal', 1),
('dashboard.button.create_safe', '创建Safe按钮', '显示Dashboard中的创建Safe按钮', 'safe', 'operation', true, 'button', '/', 'btn-create-safe', 2),
('dashboard.button.view_safes', '查看Safe按钮', '显示Dashboard中的查看所有Safe按钮', 'safe', 'operation', true, 'button', '/', 'btn-view-safes', 3),

-- 提案页面按钮
('proposals.button.create', '创建提案按钮', '显示提案页面中的创建提案按钮', 'proposal', 'operation', true, 'button', '/proposals', 'btn-create-proposal-main', 4),
('proposals.button.view_detail', '查看提案详情按钮', '显示提案卡片中的查看详情按钮', 'proposal', 'operation', true, 'button', '/proposals', 'btn-view-proposal', 5),
('proposals.button.sign', '签名提案按钮', '显示提案详情中的签名按钮', 'proposal', 'operation', true, 'button', '/proposals/:id', 'btn-sign-proposal', 6),
('proposals.button.execute', '执行提案按钮', '显示提案详情中的执行按钮', 'proposal', 'operation', true, 'button', '/proposals/:id', 'btn-execute-proposal', 7),
('proposals.button.reject', '拒绝提案按钮', '显示提案详情中的拒绝按钮', 'proposal', 'operation', true, 'button', '/proposals/:id', 'btn-reject-proposal', 8),

-- Safe页面按钮
('safes.button.create', '创建Safe按钮', '显示Safe页面中的创建新Safe按钮', 'safe', 'operation', true, 'button', '/safes', 'btn-create-safe-main', 9),
('safes.button.view_detail', '查看Safe详情按钮', '显示Safe卡片中的查看详情按钮', 'safe', 'operation', true, 'button', '/safes', 'btn-view-safe', 10),
('safes.button.permission_manage', '权限管理按钮', '显示Safe卡片中的权限管理按钮', 'safe', 'operation', true, 'button', '/safes', 'btn-permission-manage', 11),
('safes.button.refresh', '刷新按钮', '显示Safe页面中的刷新按钮', 'safe', 'operation', true, 'button', '/safes', 'btn-refresh-safes', 12),

-- 权限管理页面按钮
('permissions.button.create_permission', '创建权限按钮', '显示权限字典中的创建权限按钮', 'system', 'operation', true, 'button', '/permissions', 'btn-create-permission', 13),
('permissions.button.assign_permission', '分配权限按钮', '显示用户管理中的分配权限按钮', 'system', 'operation', true, 'button', '/permissions', 'btn-assign-permission', 14),
('permissions.button.reset_password', '重置密码按钮', '显示用户管理中的重置密码按钮', 'system', 'operation', true, 'button', '/permissions', 'btn-reset-password', 15)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 插入API权限映射（来自002_permission_mappings.sql）
-- 直接迁移，已有完整映射字段
-- =====================================================

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) VALUES
-- 用户相关API
('api.users.list', '用户列表API', '获取用户列表', 'system', 'system', true, 'api', '/api/v1/users', 'GET', 1),
('api.users.profile', '用户资料API', '获取和更新用户资料', 'system', 'system', true, 'api', '/api/v1/users/profile', 'GET', 2),
('api.users.permissions.get', '获取用户权限API', '获取用户权限列表', 'system', 'system', true, 'api', '/api/v1/users/:id/permissions', 'GET', 3),
('api.users.permissions.assign', '分配用户权限API', '为用户分配权限', 'system', 'system', true, 'api', '/api/v1/users/:id/permissions', 'POST', 4),

-- Safe相关API
('api.safes.list', 'Safe列表API', '获取Safe钱包列表', 'safe', 'system', true, 'api', '/api/v1/safes', 'GET', 5),
('api.safes.create', '创建SafeAPI', '创建新的Safe钱包', 'safe', 'operation', true, 'api', '/api/v1/safes', 'POST', 6),
('api.safes.detail', 'Safe详情API', '获取Safe钱包详情', 'safe', 'safe', true, 'api', '/api/v1/safes/:safeId', 'GET', 7),
('api.safes.update', '更新SafeAPI', '更新Safe钱包信息', 'safe', 'safe', true, 'api', '/api/v1/safes/:safeId', 'PUT', 8),

-- 提案相关API
('api.proposals.list', '提案列表API', '获取提案列表', 'proposal', 'system', true, 'api', '/api/v1/proposals', 'GET', 9),
('api.proposals.create', '创建提案API', '创建新提案', 'proposal', 'operation', true, 'api', '/api/v1/proposals', 'POST', 10),
('api.proposals.detail', '提案详情API', '获取提案详情', 'proposal', 'safe', true, 'api', '/api/v1/proposals/:id', 'GET', 11),
('api.proposals.sign', '签名提案API', '对提案进行签名', 'proposal', 'operation', true, 'api', '/api/v1/proposals/:id/sign', 'POST', 12),
('api.proposals.execute', '执行提案API', '执行已批准的提案', 'proposal', 'operation', true, 'api', '/api/v1/proposals/:id/execute', 'POST', 13),

-- Dashboard相关API
('api.dashboard.cards', 'Dashboard卡片API', '获取Dashboard概览卡片数据', 'system', 'system', true, 'api', '/api/v1/dashboard/cards', 'GET', 14),
('api.dashboard.pending_proposals', '待处理提案API', '获取待处理提案列表', 'proposal', 'system', true, 'api', '/api/v1/dashboard/pending-proposals', 'GET', 15),

-- 权限管理相关API
('api.permissions.definitions', '权限定义API', '获取权限定义列表', 'system', 'system', true, 'api', '/api/v1/permissions/definitions', 'GET', 16),
('api.permissions.create', '创建权限定义API', '创建新的权限定义', 'system', 'system', true, 'api', '/api/v1/permissions/definitions', 'POST', 17)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 添加明确的权限层级关系（parent_permission）
-- 只添加明确可确定的UI层级关系
-- =====================================================

-- 提案详情页面按钮的父权限是提案详情页面
UPDATE permission_definitions SET parent_permission = 'system.page.proposal_detail' 
WHERE code IN ('proposals.button.sign', 'proposals.button.execute', 'proposals.button.reject');

-- 提案列表页面按钮的父权限是提案列表页面
UPDATE permission_definitions SET parent_permission = 'system.page.proposals' 
WHERE code IN ('proposals.button.create', 'proposals.button.view_detail');

-- Safe列表页面按钮的父权限是Safe列表页面
UPDATE permission_definitions SET parent_permission = 'system.page.safes' 
WHERE code IN ('safes.button.create', 'safes.button.view_detail', 'safes.button.permission_manage', 'safes.button.refresh');

-- Dashboard按钮的父权限是Dashboard页面
UPDATE permission_definitions SET parent_permission = 'system.page.dashboard' 
WHERE code IN ('dashboard.button.create_proposal', 'dashboard.button.create_safe', 'dashboard.button.view_safes');

-- 权限管理页面按钮的父权限是权限管理页面
UPDATE permission_definitions SET parent_permission = 'system.page.permissions' 
WHERE code IN ('permissions.button.create_permission', 'permissions.button.assign_permission', 'permissions.button.reset_password');

-- =====================================================
-- 数据插入完成
-- =====================================================


-- =====================================================
-- 创建权限映射查询视图
-- =====================================================

-- 创建权限映射查询视图，便于前端获取权限映射信息
CREATE OR REPLACE VIEW permission_mappings_view AS
SELECT 
    code,
    name,
    description,
    category,
    scope,
    mapping_type,
    mapping_url,
    mapping_method,
    ui_element_id,
    parent_permission,
    display_order,
    is_active
FROM permission_definitions
WHERE mapping_type IS NOT NULL
ORDER BY mapping_type, display_order, code;

-- =====================================================
-- 创建权限映射统计函数
-- =====================================================

CREATE OR REPLACE FUNCTION get_permission_mapping_stats()
RETURNS TABLE(
    mapping_type VARCHAR(20),
    count BIGINT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pd.mapping_type,
        COUNT(*)::BIGINT as count,
        CASE 
            WHEN pd.mapping_type = 'menu' THEN '导航菜单权限'
            WHEN pd.mapping_type = 'button' THEN '按钮操作权限'
            WHEN pd.mapping_type = 'api' THEN 'API接口权限'
            WHEN pd.mapping_type = 'page' THEN '页面访问权限'
            WHEN pd.mapping_type = 'feature' THEN '功能模块权限'
            ELSE '其他权限'
        END as description
    FROM permission_definitions pd
    WHERE pd.mapping_type IS NOT NULL
    GROUP BY pd.mapping_type
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;


-- 输出统计信息
SELECT 'Permission Data Initialization Completed' as status;
SELECT COUNT(*) as total_permissions FROM permission_definitions;
SELECT category, COUNT(*) as count FROM permission_definitions GROUP BY category ORDER BY count DESC;
SELECT mapping_type, COUNT(*) as count FROM permission_definitions WHERE mapping_type IS NOT NULL GROUP BY mapping_type ORDER BY count DESC;
