-- 验证权限映射数据的SQL脚本
-- 检查002_permission_mappings.sql种子文件是否已正确执行

-- 1. 检查api.proposals.execute权限是否存在且映射类型正确
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
    display_order,
    is_system,
    is_active,
    created_at
FROM permission_definitions 
WHERE code = 'api.proposals.execute';

-- 2. 检查所有api.proposals.*权限的映射状态
SELECT 
    code,
    name,
    mapping_type,
    mapping_url,
    mapping_method,
    display_order
FROM permission_definitions 
WHERE code LIKE 'api.proposals.%'
ORDER BY display_order;

-- 3. 检查是否有重复的提案执行权限
SELECT 
    code,
    name,
    mapping_type,
    COUNT(*) as count
FROM permission_definitions 
WHERE code LIKE '%proposal%' AND code LIKE '%execute%'
GROUP BY code, name, mapping_type
ORDER BY code;

-- 4. 检查mapping_type为NULL的权限数量
SELECT 
    COUNT(*) as null_mapping_count,
    ARRAY_AGG(code) as codes_without_mapping
FROM permission_definitions 
WHERE mapping_type IS NULL;

-- 5. 如果api.proposals.execute不存在，手动插入
INSERT INTO permission_definitions (code, name, description, category, scope, is_system, mapping_type, mapping_url, mapping_method, display_order) 
VALUES ('api.proposals.execute', '执行提案API', '执行已批准的提案', 'proposal', 'operation', true, 'api', '/api/v1/proposals/:id/execute', 'POST', 13)
ON CONFLICT (code) DO UPDATE SET
    mapping_type = EXCLUDED.mapping_type,
    mapping_url = EXCLUDED.mapping_url,
    mapping_method = EXCLUDED.mapping_method,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- 6. 验证插入/更新结果
SELECT 
    code,
    name,
    mapping_type,
    mapping_url,
    mapping_method,
    updated_at
FROM permission_definitions 
WHERE code = 'api.proposals.execute';
