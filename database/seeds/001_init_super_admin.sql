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
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: "SuperAdmin@123"
    '0x0000000000000000000000000000000000000001', -- 占位地址
    'super_admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- 为超级管理员分配所有系统权限
DO $$
DECLARE
    admin_user_id UUID;
    perm_record RECORD;
BEGIN
    -- 获取超级管理员用户ID
    SELECT id INTO admin_user_id 
    FROM users 
    WHERE email = 'admin@company.com' AND role = 'super_admin';
    
    -- 如果找到超级管理员用户，为其分配所有系统权限
    IF admin_user_id IS NOT NULL THEN
        -- 为超级管理员分配所有系统级权限
        FOR perm_record IN 
            SELECT code FROM permission_definitions 
            WHERE scope = 'system' AND is_active = true
        LOOP
            INSERT INTO user_custom_permissions (
                id,
                user_id,
                permission_code,
                granted_by,
                granted_at,
                expires_at,
                is_active,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                admin_user_id,
                perm_record.code,
                admin_user_id, -- 自己授权给自己
                NOW(),
                NULL, -- 永不过期
                true,
                NOW(),
                NOW()
            ) ON CONFLICT (user_id, permission_code) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE '超级管理员权限初始化完成，用户ID: %', admin_user_id;
    ELSE
        RAISE NOTICE '未找到超级管理员用户，请检查用户创建是否成功';
    END IF;
END $$;

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
    
    -- 检查超级管理员权限
    RETURN QUERY
    SELECT 
        'SuperAdmin Permissions'::VARCHAR(50),
        CASE 
            WHEN EXISTS(
                SELECT 1 FROM user_custom_permissions ucp
                JOIN users u ON ucp.user_id = u.id
                WHERE u.role = 'super_admin' AND ucp.is_active = true
            )
            THEN 'OK'::VARCHAR(20)
            ELSE 'MISSING'::VARCHAR(20)
        END,
        CASE 
            WHEN EXISTS(
                SELECT 1 FROM user_custom_permissions ucp
                JOIN users u ON ucp.user_id = u.id
                WHERE u.role = 'super_admin' AND ucp.is_active = true
            )
            THEN 'Super admin has system permissions assigned'::TEXT
            ELSE 'Super admin permissions not found'::TEXT
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
