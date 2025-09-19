-- 检查权限定义数据的SQL脚本
-- 用于排查权限映射类型问题

-- 1. 查看所有包含"proposal"和"execute"的权限
SELECT 
    id,
    code,
    name,
    description,
    category,
    scope,
    mapping_type,
    mapping_url,
    mapping_method,
    ui_element_id,
    is_system,
    is_active,
    created_at
FROM permission_definitions 
WHERE code LIKE '%proposal%' AND code LIKE '%execute%'
ORDER BY code;

-- 2. 查看所有包含"api.proposals"的权限
SELECT 
    id,
    code,
    name,
    description,
    category,
    scope,
    mapping_type,
    mapping_url,
    mapping_method,
    ui_element_id,
    is_system,
    is_active,
    created_at
FROM permission_definitions 
WHERE code LIKE 'api.proposals%'
ORDER BY code;

-- 3. 查看所有提案相关的权限
SELECT 
    id,
    code,
    name,
    description,
    category,
    scope,
    mapping_type,
    mapping_url,
    mapping_method,
    ui_element_id,
    is_system,
    is_active,
    created_at
FROM permission_definitions 
WHERE category = 'proposal'
ORDER BY code;

-- 4. 查看所有映射类型为NULL的权限
SELECT 
    id,
    code,
    name,
    category,
    scope,
    mapping_type,
    is_system,
    is_active
FROM permission_definitions 
WHERE mapping_type IS NULL
ORDER BY category, code;

-- 5. 查看所有权限的映射类型统计
SELECT 
    mapping_type,
    COUNT(*) as count,
    ARRAY_AGG(code ORDER BY code) as permission_codes
FROM permission_definitions 
GROUP BY mapping_type
ORDER BY mapping_type;

-- 6. 检查是否有重复的权限代码
SELECT 
    code,
    COUNT(*) as count
FROM permission_definitions 
GROUP BY code
HAVING COUNT(*) > 1;

-- 7. 查看最近创建的权限定义
SELECT 
    id,
    code,
    name,
    category,
    mapping_type,
    created_at
FROM permission_definitions 
ORDER BY created_at DESC
LIMIT 20;
