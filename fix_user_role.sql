-- 检查和修复用户角色问题
-- 这个脚本用于解决权限字典页面401错误

-- 1. 查看当前所有用户及其角色
SELECT id, email, role, is_active, created_at 
FROM users 
ORDER BY created_at;

-- 2. 检查是否有super_admin用户
SELECT COUNT(*) as super_admin_count 
FROM users 
WHERE role = 'super_admin' AND is_active = true;

-- 3. 检查是否有admin用户
SELECT COUNT(*) as admin_count 
FROM users 
WHERE role = 'admin' AND is_active = true;

-- 4. 如果没有super_admin，将第一个admin用户升级为super_admin
-- 注意：请根据实际情况修改email条件
UPDATE users 
SET role = 'super_admin', updated_at = NOW()
WHERE email = 'admin@company.com' 
  AND role = 'admin' 
  AND is_active = true;

-- 5. 验证修改结果
SELECT id, email, role, is_active 
FROM users 
WHERE role = 'super_admin';

-- 6. 检查permission_definitions表是否有数据
SELECT COUNT(*) as permission_count 
FROM permission_definitions;

-- 7. 如果没有权限定义数据，显示示例插入语句
-- INSERT INTO permission_definitions (code, name, description, category, scope, is_system) VALUES
-- ('system.admin.full', '系统管理员权限', '系统完全管理权限', 'system', 'system', true),
-- ('system.user.manage', '用户管理权限', '管理系统用户', 'system', 'system', true),
-- ('system.audit.view', '审计日志查看', '查看系统审计日志', 'system', 'system', true);

-- 8. 显示权限定义示例数据
SELECT code, name, category, scope, is_system, is_active 
FROM permission_definitions 
WHERE is_system = true 
ORDER BY category, code 
LIMIT 10;
