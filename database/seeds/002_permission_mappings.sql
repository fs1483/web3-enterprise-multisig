-- =====================================================
-- 权限映射初始化脚本
-- 版本: v1.0
-- 功能: 为现有权限定义添加UI映射信息
-- 作者: Cascade AI
-- 创建时间: 2025-09-18
-- =====================================================

-- =====================================================
-- 菜单权限映射
-- =====================================================

-- 主导航菜单权限
UPDATE permission_definitions SET 
    mapping_type = 'menu',
    mapping_url = '/',
    ui_element_id = 'nav-dashboard',
    display_order = 1
WHERE code = 'system.dashboard.view';

-- 如果不存在dashboard权限，先创建
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('system.dashboard.view', '仪表板访问', '访问系统仪表板页面', 'system', 'system', true, 'menu', '/', 'nav-dashboard', 1)
ON CONFLICT (code) DO NOTHING;

-- 提案菜单
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('system.menu.proposals', '提案菜单', '访问提案管理页面', 'proposal', 'system', true, 'menu', '/proposals', 'nav-proposals', 2)
ON CONFLICT (code) DO NOTHING;

-- Safe菜单  
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('system.menu.safes', 'Safe菜单', '访问Safe钱包管理页面', 'safe', 'system', true, 'menu', '/safes', 'nav-safes', 3)
ON CONFLICT (code) DO NOTHING;

-- 交易菜单
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('system.menu.transactions', '交易菜单', '访问交易记录页面', 'transaction', 'system', true, 'menu', '/transactions', 'nav-transactions', 4)
ON CONFLICT (code) DO NOTHING;

-- 权限管理菜单
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('system.menu.permissions', '权限管理菜单', '访问权限管理页面', 'system', 'system', true, 'menu', '/permissions', 'nav-permissions', 5)
ON CONFLICT (code) DO NOTHING;

-- 策略管理菜单
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('system.menu.policies', '策略管理菜单', '访问策略管理页面', 'policy', 'system', true, 'menu', '/policies', 'nav-policies', 6)
ON CONFLICT (code) DO NOTHING;

-- 分析菜单（暂未实现）
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('system.menu.analytics', '分析菜单', '访问数据分析页面', 'system', 'system', true, 'menu', '/analytics', 'nav-analytics', 7)
ON CONFLICT (code) DO NOTHING;

-- 团队菜单（暂未实现）
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('system.menu.team', '团队菜单', '访问团队管理页面', 'system', 'system', true, 'menu', '/team', 'nav-team', 8)
ON CONFLICT (code) DO NOTHING;

-- 设置菜单
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('system.menu.settings', '设置菜单', '访问用户设置页面', 'system', 'system', true, 'menu', '/settings', 'nav-settings', 9)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 页面权限映射
-- =====================================================

-- Dashboard页面
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, display_order) 
VALUES ('system.page.dashboard', '仪表板页面', '访问系统仪表板页面', 'system', 'system', true, 'page', '/', 1)
ON CONFLICT (code) DO NOTHING;

-- 提案相关页面
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, display_order) 
VALUES ('system.page.proposals', '提案列表页面', '访问提案列表页面', 'proposal', 'system', true, 'page', '/proposals', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, display_order) 
VALUES ('system.page.proposal_create', '创建提案页面', '访问创建提案页面', 'proposal', 'system', true, 'page', '/proposals/create', 3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, display_order) 
VALUES ('system.page.proposal_detail', '提案详情页面', '访问提案详情页面', 'proposal', 'system', true, 'page', '/proposals/:id', 4)
ON CONFLICT (code) DO NOTHING;

-- Safe相关页面
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, display_order) 
VALUES ('system.page.safes', 'Safe列表页面', '访问Safe钱包列表页面', 'safe', 'system', true, 'page', '/safes', 5)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, display_order) 
VALUES ('system.page.safe_create', '创建Safe页面', '访问创建Safe钱包页面', 'safe', 'system', true, 'page', '/safes/create', 6)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, display_order) 
VALUES ('system.page.safe_detail', 'Safe详情页面', '访问Safe钱包详情页面', 'safe', 'system', true, 'page', '/safes/:safeAddress', 7)
ON CONFLICT (code) DO NOTHING;

-- 权限管理页面
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, display_order) 
VALUES ('system.page.permissions', '权限管理页面', '访问统一权限管理页面', 'system', 'system', true, 'page', '/permissions', 8)
ON CONFLICT (code) DO NOTHING;

-- 用户设置页面
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, display_order) 
VALUES ('system.page.settings', '用户设置页面', '访问用户设置页面', 'system', 'system', true, 'page', '/settings', 9)
ON CONFLICT (code) DO NOTHING;

-- 管理员页面
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, display_order) 
VALUES ('system.page.admin', '管理员页面', '访问管理员控制台', 'system', 'system', true, 'page', '/admin', 10)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 按钮权限映射
-- =====================================================

-- Dashboard快速操作按钮
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('dashboard.button.create_proposal', '创建提案按钮', '显示Dashboard中的创建提案按钮', 'proposal', 'operation', true, 'button', '/', 'btn-create-proposal', 1)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('dashboard.button.create_safe', '创建Safe按钮', '显示Dashboard中的创建Safe按钮', 'safe', 'operation', true, 'button', '/', 'btn-create-safe', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('dashboard.button.view_safes', '查看Safe按钮', '显示Dashboard中的查看所有Safe按钮', 'safe', 'operation', true, 'button', '/', 'btn-view-safes', 3)
ON CONFLICT (code) DO NOTHING;

-- 提案页面按钮
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('proposals.button.create', '创建提案按钮', '显示提案页面中的创建提案按钮', 'proposal', 'operation', true, 'button', '/proposals', 'btn-create-proposal-main', 4)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('proposals.button.view_detail', '查看提案详情按钮', '显示提案卡片中的查看详情按钮', 'proposal', 'operation', true, 'button', '/proposals', 'btn-view-proposal', 5)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('proposals.button.sign', '签名提案按钮', '显示提案详情中的签名按钮', 'proposal', 'operation', true, 'button', '/proposals/:id', 'btn-sign-proposal', 6)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('proposals.button.execute', '执行提案按钮', '显示提案详情中的执行按钮', 'proposal', 'operation', true, 'button', '/proposals/:id', 'btn-execute-proposal', 7)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('proposals.button.reject', '拒绝提案按钮', '显示提案详情中的拒绝按钮', 'proposal', 'operation', true, 'button', '/proposals/:id', 'btn-reject-proposal', 8)
ON CONFLICT (code) DO NOTHING;

-- Safe页面按钮
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('safes.button.create', '创建Safe按钮', '显示Safe页面中的创建新Safe按钮', 'safe', 'operation', true, 'button', '/safes', 'btn-create-safe-main', 9)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('safes.button.view_detail', '查看Safe详情按钮', '显示Safe卡片中的查看详情按钮', 'safe', 'operation', true, 'button', '/safes', 'btn-view-safe', 10)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('safes.button.permission_manage', '权限管理按钮', '显示Safe卡片中的权限管理按钮', 'safe', 'operation', true, 'button', '/safes', 'btn-permission-manage', 11)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('safes.button.refresh', '刷新按钮', '显示Safe页面中的刷新按钮', 'safe', 'operation', true, 'button', '/safes', 'btn-refresh-safes', 12)
ON CONFLICT (code) DO NOTHING;

-- 权限管理页面按钮
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('permissions.button.create_permission', '创建权限按钮', '显示权限字典中的创建权限按钮', 'system', 'operation', true, 'button', '/permissions', 'btn-create-permission', 13)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('permissions.button.assign_permission', '分配权限按钮', '显示用户管理中的分配权限按钮', 'system', 'operation', true, 'button', '/permissions', 'btn-assign-permission', 14)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, ui_element_id, display_order) 
VALUES ('permissions.button.reset_password', '重置密码按钮', '显示用户管理中的重置密码按钮', 'system', 'operation', true, 'button', '/permissions', 'btn-reset-password', 15)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- API权限映射
-- =====================================================

-- 用户相关API
UPDATE permission_definitions SET 
    mapping_type = 'api',
    mapping_url = '/api/v1/users',
    mapping_method = 'GET'
WHERE code = 'system.user.manage';

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.users.list', '用户列表API', '获取用户列表', 'system', 'system', true, 'api', '/api/v1/users', 'GET', 1)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.users.profile', '用户资料API', '获取和更新用户资料', 'system', 'system', true, 'api', '/api/v1/users/profile', 'GET', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.users.permissions.get', '获取用户权限API', '获取用户权限列表', 'system', 'system', true, 'api', '/api/v1/users/:id/permissions', 'GET', 3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.users.permissions.assign', '分配用户权限API', '为用户分配权限', 'system', 'system', true, 'api', '/api/v1/users/:id/permissions', 'POST', 4)
ON CONFLICT (code) DO NOTHING;

-- Safe相关API
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.safes.list', 'Safe列表API', '获取Safe钱包列表', 'safe', 'system', true, 'api', '/api/v1/safes', 'GET', 5)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.safes.create', '创建SafeAPI', '创建新的Safe钱包', 'safe', 'operation', true, 'api', '/api/v1/safes', 'POST', 6)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.safes.detail', 'Safe详情API', '获取Safe钱包详情', 'safe', 'safe', true, 'api', '/api/v1/safes/:safeId', 'GET', 7)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.safes.update', '更新SafeAPI', '更新Safe钱包信息', 'safe', 'safe', true, 'api', '/api/v1/safes/:safeId', 'PUT', 8)
ON CONFLICT (code) DO NOTHING;

-- 提案相关API
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.proposals.list', '提案列表API', '获取提案列表', 'proposal', 'system', true, 'api', '/api/v1/proposals', 'GET', 9)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.proposals.create', '创建提案API', '创建新提案', 'proposal', 'operation', true, 'api', '/api/v1/proposals', 'POST', 10)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.proposals.detail', '提案详情API', '获取提案详情', 'proposal', 'safe', true, 'api', '/api/v1/proposals/:id', 'GET', 11)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.proposals.sign', '签名提案API', '对提案进行签名', 'proposal', 'operation', true, 'api', '/api/v1/proposals/:id/sign', 'POST', 12)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.proposals.execute', '执行提案API', '执行已批准的提案', 'proposal', 'operation', true, 'api', '/api/v1/proposals/:id/execute', 'POST', 13)
ON CONFLICT (code) DO NOTHING;

-- Dashboard相关API
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.dashboard.cards', 'Dashboard卡片API', '获取Dashboard概览卡片数据', 'system', 'system', true, 'api', '/api/v1/dashboard/cards', 'GET', 14)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.dashboard.pending_proposals', '待处理提案API', '获取待处理提案列表', 'proposal', 'system', true, 'api', '/api/v1/dashboard/pending-proposals', 'GET', 15)
ON CONFLICT (code) DO NOTHING;

-- 权限管理相关API
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.permissions.definitions', '权限定义API', '获取权限定义列表', 'system', 'system', true, 'api', '/api/v1/permissions/definitions', 'GET', 16)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.permissions.create', '创建权限定义API', '创建新的权限定义', 'system', 'system', true, 'api', '/api/v1/permissions/definitions', 'POST', 17)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 更新现有权限的映射信息
-- =====================================================

-- 更新Safe相关权限的映射信息
UPDATE permission_definitions SET 
    mapping_type = 'api',
    mapping_url = '/api/v1/safes/:safeId/members',
    mapping_method = 'GET'
WHERE code = 'safe.member.view';

UPDATE permission_definitions SET 
    mapping_type = 'api',
    mapping_url = '/api/v1/safes/:safeId/members/roles',
    mapping_method = 'POST'
WHERE code = 'safe.member.assign_role';

UPDATE permission_definitions SET 
    mapping_type = 'api',
    mapping_url = '/api/v1/safes/:safeId/members/:user_id',
    mapping_method = 'DELETE'
WHERE code = 'safe.member.remove';

-- 更新提案相关权限的映射信息
UPDATE permission_definitions SET 
    mapping_type = 'api',
    mapping_url = '/api/v1/proposals',
    mapping_method = 'GET'
WHERE code = 'safe.proposal.view';

UPDATE permission_definitions SET 
    mapping_type = 'api',
    mapping_url = '/api/v1/proposals',
    mapping_method = 'POST'
WHERE code = 'safe.proposal.create';

UPDATE permission_definitions SET 
    mapping_type = 'api',
    mapping_url = '/api/v1/proposals/:id/sign',
    mapping_method = 'POST'
WHERE code = 'safe.proposal.sign';

UPDATE permission_definitions SET 
    mapping_type = 'api',
    mapping_url = '/api/v1/proposals/:id/execute',
    mapping_method = 'POST'
WHERE code = 'safe.proposal.execute';

-- 更新Safe信息相关权限的映射信息
UPDATE permission_definitions SET 
    mapping_type = 'api',
    mapping_url = '/api/v1/safes/:safeId',
    mapping_method = 'GET'
WHERE code = 'safe.info.view';

UPDATE permission_definitions SET 
    mapping_type = 'api',
    mapping_url = '/api/v1/safes/:safeId',
    mapping_method = 'PUT'
WHERE code = 'safe.info.manage';

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

-- =====================================================
-- 权限映射初始化完成
-- =====================================================

-- 输出统计信息
SELECT 'Permission Mapping Initialization Completed' as status;
SELECT * FROM get_permission_mapping_stats();
