-- =====================================================
-- 超级管理员初始化脚本
-- 版本: v1.0
-- 功能: 初始化系统超级管理员账户和权限
-- 作者: sfan
-- 创建时间: 2024-02-14
-- =====================================================

-- 插入超级管理员用户（如果不存在）
INSERT INTO users (
    id,
    username,
    email,
    password_hash,
    wallet_address,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'superadmin',
    'admin@company.com',
    '$2a$10$qAtm4z7ZPl2XwOZNaBheI.fOytlZ9.AG1seB2JvEujkOEwenxFJP.', -- password: "SuperAdmin@123"
    '0x0000000000000000000000000000000000000001', -- 占位地址
    'super_admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- 注意：超级管理员不需要在 user_custom_permissions 表中分配具体权限
-- 系统通过 role = 'super_admin' 直接判断，拥有所有权限

-- =====================================================
-- 创建系统初始化检查函数
-- =====================================================

CREATE OR REPLACE FUNCTION check_system_initialization()
RETURNS TABLE(
    component VARCHAR(50),
    status VARCHAR(20),
    details TEXT
) AS $$
BEGIN
    -- 检查超级管理员用户
    RETURN QUERY
    SELECT 
        'SuperAdmin User'::VARCHAR(50),
        CASE 
            WHEN EXISTS(SELECT 1 FROM users WHERE role = 'super_admin' AND is_active = true) 
            THEN 'OK'::VARCHAR(20)
            ELSE 'MISSING'::VARCHAR(20)
        END,
        CASE 
            WHEN EXISTS(SELECT 1 FROM users WHERE role = 'super_admin' AND is_active = true)
            THEN 'Super admin user exists and is active'::TEXT
            ELSE 'No active super admin user found'::TEXT
        END;
    
    -- 检查权限定义
    RETURN QUERY
    SELECT 
        'Permission Definitions'::VARCHAR(50),
        CASE 
            WHEN (SELECT COUNT(*) FROM permission_definitions WHERE is_active = true) > 0
            THEN 'OK'::VARCHAR(20)
            ELSE 'MISSING'::VARCHAR(20)
        END,
        ('Total active permissions: ' || (SELECT COUNT(*) FROM permission_definitions WHERE is_active = true))::TEXT;
    
    -- 检查超级管理员角色（不需要检查具体权限分配）
    RETURN QUERY
    SELECT 
        'SuperAdmin Role'::VARCHAR(50),
        CASE 
            WHEN EXISTS(
                SELECT 1 FROM users u
                WHERE u.role = 'super_admin' AND u.is_active = true
            )
            THEN 'OK'::VARCHAR(20)
            ELSE 'MISSING'::VARCHAR(20)
        END,
        CASE 
            WHEN EXISTS(
                SELECT 1 FROM users u
                WHERE u.role = 'super_admin' AND u.is_active = true
            )
            THEN 'Super admin role exists and is active (inherits all permissions)'::TEXT
            ELSE 'No active super admin user found'::TEXT
        END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 使用说明
-- =====================================================

-- 执行此脚本后，可以使用以下命令检查初始化状态：
-- SELECT * FROM check_system_initialization();

-- 超级管理员登录信息：
-- 用户名: superadmin
-- 邮箱: admin@company.com  
-- 密码: SuperAdmin@123
-- 
-- 注意：生产环境中请立即修改默认密码！

COMMENT ON FUNCTION check_system_initialization() IS '检查系统初始化状态的工具函数';
