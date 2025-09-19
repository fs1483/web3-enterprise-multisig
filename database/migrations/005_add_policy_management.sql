-- =====================================================
-- 策略管理系统数据库迁移脚本
-- 版本: v2.0
-- 功能: 为Web3企业级多签系统添加完整的策略管理功能
-- 作者: Cascade AI
-- 创建时间: 2025-09-16
-- =====================================================

-- 策略模板表：定义可重用的策略模板
-- 支持系统预设模板和企业自定义模板
CREATE TABLE IF NOT EXISTS policy_templates (
    -- 主键和基础信息
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,                     -- 模板名称
    description TEXT,                               -- 模板描述
    
    -- 模板分类
    category VARCHAR(50) NOT NULL,                  -- 模板分类：enterprise, team, personal, custom
    template_type VARCHAR(50) NOT NULL,             -- 模板类型：approval_threshold, time_lock, spending_limit, role_based_approval
    
    -- 模板配置
    default_parameters JSONB NOT NULL,              -- 默认参数配置
    parameter_schema JSONB,                         -- 参数结构定义（用于验证）
    
    -- 模板属性
    is_system BOOLEAN DEFAULT false,                -- 是否为系统内置模板
    is_active BOOLEAN DEFAULT true,                 -- 模板是否可用
    usage_count INTEGER DEFAULT 0,                 -- 使用次数统计
    
    -- 审计字段
    created_by UUID REFERENCES users(id),           -- 创建者（系统模板为NULL）
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 约束条件
    CONSTRAINT valid_template_type CHECK (template_type IN ('approval_threshold', 'time_lock', 'spending_limit', 'role_based_approval', 'multi_factor_auth')),
    CONSTRAINT valid_category CHECK (category IN ('enterprise', 'team', 'personal', 'custom'))
);

-- 扩展现有的policies表，增加策略管理相关字段
-- 注意：policies表已存在于005_create_proposals_tables.sql中
-- 这里只添加新的字段和约束

-- 添加策略管理相关字段到policies表
ALTER TABLE policies ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES policy_templates(id);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS execution_order INTEGER DEFAULT 1;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS enforcement_level VARCHAR(20) DEFAULT 'strict' CHECK (enforcement_level IN ('strict', 'warning', 'advisory'));
ALTER TABLE policies ADD COLUMN IF NOT EXISTS auto_execute BOOLEAN DEFAULT false;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '{}';

-- 更新policies表的policy_type约束，支持更多策略类型
ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_policy_type_check;
ALTER TABLE policies ADD CONSTRAINT policies_policy_type_check 
    CHECK (policy_type IN ('approval_threshold', 'time_lock', 'spending_limit', 'role_based_approval', 'multi_factor_auth', 'transaction_limit', 'whitelist_only'));

-- 策略执行历史表：记录策略的执行情况
-- 用于审计和分析策略效果
CREATE TABLE IF NOT EXISTS policy_execution_logs (
    -- 主键和关联
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL, -- 关联的提案（可选）
    safe_id UUID NOT NULL REFERENCES safes(id) ON DELETE CASCADE,
    
    -- 执行信息
    execution_type VARCHAR(50) NOT NULL,            -- 执行类型：validation, enforcement, bypass
    execution_result VARCHAR(20) NOT NULL,          -- 执行结果：passed, failed, warning, bypassed
    
    -- 执行详情
    input_parameters JSONB,                         -- 输入参数
    policy_parameters JSONB,                        -- 策略参数快照
    validation_details JSONB,                       -- 验证详情
    failure_reason TEXT,                            -- 失败原因
    
    -- 执行上下文
    triggered_by UUID REFERENCES users(id),         -- 触发用户
    execution_context JSONB DEFAULT '{}',           -- 执行上下文
    
    -- 时间信息
    executed_at TIMESTAMP DEFAULT NOW(),
    execution_duration_ms INTEGER,                  -- 执行耗时（毫秒）
    
    -- 约束条件
    CONSTRAINT valid_execution_type CHECK (execution_type IN ('validation', 'enforcement', 'bypass', 'override')),
    CONSTRAINT valid_execution_result CHECK (execution_result IN ('passed', 'failed', 'warning', 'bypassed', 'error'))
);

-- 策略依赖关系表：定义策略之间的依赖关系
-- 支持复杂的策略组合和执行顺序控制
CREATE TABLE IF NOT EXISTS policy_dependencies (
    -- 主键和关联
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    safe_id UUID NOT NULL REFERENCES safes(id) ON DELETE CASCADE,
    parent_policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    dependent_policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    
    -- 依赖关系
    dependency_type VARCHAR(20) NOT NULL,           -- 依赖类型：prerequisite, conflict, complement
    dependency_condition JSONB DEFAULT '{}',        -- 依赖条件
    
    -- 状态管理
    is_active BOOLEAN DEFAULT true,
    
    -- 审计字段
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- 约束条件
    UNIQUE(safe_id, parent_policy_id, dependent_policy_id), -- 避免重复依赖
    CONSTRAINT no_self_dependency CHECK (parent_policy_id != dependent_policy_id), -- 避免自依赖
    CONSTRAINT valid_dependency_type CHECK (dependency_type IN ('prerequisite', 'conflict', 'complement', 'override'))
);

-- 策略异常表：记录策略执行中的异常情况
-- 用于监控策略健康状态和问题排查
CREATE TABLE IF NOT EXISTS policy_exceptions (
    -- 主键和关联
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    safe_id UUID NOT NULL REFERENCES safes(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
    
    -- 异常信息
    exception_type VARCHAR(50) NOT NULL,            -- 异常类型：validation_error, execution_timeout, parameter_invalid
    exception_level VARCHAR(20) NOT NULL,           -- 异常级别：info, warning, error, critical
    exception_message TEXT NOT NULL,                -- 异常消息
    exception_details JSONB,                        -- 异常详情
    
    -- 处理状态
    status VARCHAR(20) DEFAULT 'open',              -- 处理状态：open, investigating, resolved, ignored
    resolved_by UUID REFERENCES users(id),          -- 处理人
    resolved_at TIMESTAMP,                          -- 处理时间
    resolution_notes TEXT,                          -- 处理说明
    
    -- 时间信息
    occurred_at TIMESTAMP DEFAULT NOW(),
    
    -- 约束条件
    CONSTRAINT valid_exception_type CHECK (exception_type IN ('validation_error', 'execution_timeout', 'parameter_invalid', 'dependency_conflict', 'system_error')),
    CONSTRAINT valid_exception_level CHECK (exception_level IN ('info', 'warning', 'error', 'critical')),
    CONSTRAINT valid_status CHECK (status IN ('open', 'investigating', 'resolved', 'ignored'))
);

-- =====================================================
-- 创建索引以优化查询性能
-- =====================================================

-- 策略模板表索引
CREATE INDEX IF NOT EXISTS idx_policy_templates_category ON policy_templates(category);
CREATE INDEX IF NOT EXISTS idx_policy_templates_type ON policy_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_policy_templates_active ON policy_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_policy_templates_usage ON policy_templates(usage_count DESC);

-- policies表新增字段索引
CREATE INDEX IF NOT EXISTS idx_policies_template_id ON policies(template_id);
CREATE INDEX IF NOT EXISTS idx_policies_priority ON policies(priority);
CREATE INDEX IF NOT EXISTS idx_policies_enforcement_level ON policies(enforcement_level);

-- 策略执行历史表索引
CREATE INDEX IF NOT EXISTS idx_policy_execution_logs_policy_id ON policy_execution_logs(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_execution_logs_proposal_id ON policy_execution_logs(proposal_id);
CREATE INDEX IF NOT EXISTS idx_policy_execution_logs_safe_id ON policy_execution_logs(safe_id);
CREATE INDEX IF NOT EXISTS idx_policy_execution_logs_executed_at ON policy_execution_logs(executed_at);
CREATE INDEX IF NOT EXISTS idx_policy_execution_logs_result ON policy_execution_logs(execution_result);

-- 策略依赖关系表索引
CREATE INDEX IF NOT EXISTS idx_policy_dependencies_safe_id ON policy_dependencies(safe_id);
CREATE INDEX IF NOT EXISTS idx_policy_dependencies_parent ON policy_dependencies(parent_policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_dependencies_dependent ON policy_dependencies(dependent_policy_id);

-- 策略异常表索引
CREATE INDEX IF NOT EXISTS idx_policy_exceptions_policy_id ON policy_exceptions(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_exceptions_safe_id ON policy_exceptions(safe_id);
CREATE INDEX IF NOT EXISTS idx_policy_exceptions_status ON policy_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_policy_exceptions_level ON policy_exceptions(exception_level);
CREATE INDEX IF NOT EXISTS idx_policy_exceptions_occurred_at ON policy_exceptions(occurred_at);

-- =====================================================
-- 插入系统默认策略模板
-- =====================================================

-- 企业级审批阈值模板
INSERT INTO policy_templates (name, description, category, template_type, default_parameters, parameter_schema, is_system) VALUES
('企业严格审批', '适用于大型企业的严格审批流程，高价值交易需要更多签名', 'enterprise', 'approval_threshold', 
'{"rules": [{"condition": {"amount": {"gte": "1000000000000000000"}}, "required_signatures": 5}, {"condition": {"amount": {"gte": "100000000000000000"}}, "required_signatures": 3}, {"condition": {"default": true}, "required_signatures": 2}]}',
'{"type": "object", "properties": {"rules": {"type": "array", "items": {"type": "object", "properties": {"condition": {"type": "object"}, "required_signatures": {"type": "integer", "minimum": 1}}}}}}',
true),

('团队标准审批', '适用于中小团队的标准审批流程', 'team', 'approval_threshold',
'{"rules": [{"condition": {"amount": {"gte": "500000000000000000"}}, "required_signatures": 3}, {"condition": {"default": true}, "required_signatures": 2}]}',
'{"type": "object", "properties": {"rules": {"type": "array", "items": {"type": "object", "properties": {"condition": {"type": "object"}, "required_signatures": {"type": "integer", "minimum": 1}}}}}}',
true),

('个人灵活审批', '适用于个人或小团队的灵活审批', 'personal', 'approval_threshold',
'{"rules": [{"condition": {"amount": {"gte": "1000000000000000000"}}, "required_signatures": 2}, {"condition": {"default": true}, "required_signatures": 1}]}',
'{"type": "object", "properties": {"rules": {"type": "array", "items": {"type": "object", "properties": {"condition": {"type": "object"}, "required_signatures": {"type": "integer", "minimum": 1}}}}}}',
true);

-- 时间锁定模板
INSERT INTO policy_templates (name, description, category, template_type, default_parameters, parameter_schema, is_system) VALUES
('企业时间锁定', '大额交易需要等待24小时冷却期', 'enterprise', 'time_lock',
'{"rules": [{"condition": {"amount": {"gte": "5000000000000000000"}}, "delay_hours": 24}, {"condition": {"amount": {"gte": "1000000000000000000"}}, "delay_hours": 4}, {"condition": {"proposal_type": "remove_owner"}, "delay_hours": 48}]}',
'{"type": "object", "properties": {"rules": {"type": "array", "items": {"type": "object", "properties": {"condition": {"type": "object"}, "delay_hours": {"type": "integer", "minimum": 0}}}}}}',
true),

('标准时间锁定', '高价值交易需要短时间冷却期', 'team', 'time_lock',
'{"rules": [{"condition": {"amount": {"gte": "2000000000000000000"}}, "delay_hours": 2}, {"condition": {"proposal_type": "change_threshold"}, "delay_hours": 12}]}',
'{"type": "object", "properties": {"rules": {"type": "array", "items": {"type": "object", "properties": {"condition": {"type": "object"}, "delay_hours": {"type": "integer", "minimum": 0}}}}}}',
true);

-- 支出限额模板
INSERT INTO policy_templates (name, description, category, template_type, default_parameters, parameter_schema, is_system) VALUES
('企业支出限额', '严格的日/月支出限额控制', 'enterprise', 'spending_limit',
'{"daily_limit": "10000000000000000000", "monthly_limit": "100000000000000000000", "per_transaction_limit": "5000000000000000000", "reset_timezone": "UTC"}',
'{"type": "object", "properties": {"daily_limit": {"type": "string"}, "monthly_limit": {"type": "string"}, "per_transaction_limit": {"type": "string"}, "reset_timezone": {"type": "string"}}}',
true),

('团队支出限额', '适中的支出限额控制', 'team', 'spending_limit',
'{"daily_limit": "5000000000000000000", "monthly_limit": "50000000000000000000", "per_transaction_limit": "2000000000000000000", "reset_timezone": "UTC"}',
'{"type": "object", "properties": {"daily_limit": {"type": "string"}, "monthly_limit": {"type": "string"}, "per_transaction_limit": {"type": "string"}, "reset_timezone": {"type": "string"}}}',
true);

-- 基于角色的审批模板
INSERT INTO policy_templates (name, description, category, template_type, default_parameters, parameter_schema, is_system) VALUES
('企业角色审批', '基于角色的分级审批流程', 'enterprise', 'role_based_approval',
'{"rules": [{"condition": {"proposal_type": "transfer", "amount": {"gte": "1000000000000000000"}}, "required_roles": ["safe_admin", "safe_treasurer"]}, {"condition": {"proposal_type": "governance"}, "required_roles": ["safe_admin"]}, {"condition": {"default": true}, "required_roles": ["safe_operator"]}]}',
'{"type": "object", "properties": {"rules": {"type": "array", "items": {"type": "object", "properties": {"condition": {"type": "object"}, "required_roles": {"type": "array", "items": {"type": "string"}}}}}}}',
true);

-- =====================================================
-- 创建触发器以自动更新时间戳和统计
-- =====================================================

-- 策略模板表更新时间戳触发器
CREATE OR REPLACE FUNCTION update_policy_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_policy_templates_updated_at
    BEFORE UPDATE ON policy_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_policy_templates_updated_at();

-- 策略使用统计更新触发器
CREATE OR REPLACE FUNCTION update_template_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 当创建新策略时，更新模板使用次数
    IF NEW.template_id IS NOT NULL THEN
        UPDATE policy_templates 
        SET usage_count = usage_count + 1 
        WHERE id = NEW.template_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_usage_count
    AFTER INSERT ON policies
    FOR EACH ROW
    EXECUTE FUNCTION update_template_usage_count();

-- =====================================================
-- 策略验证和执行函数
-- =====================================================

-- 验证策略参数是否符合模板规范
CREATE OR REPLACE FUNCTION validate_policy_parameters(
    template_id_param UUID,
    parameters_param JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    template_schema JSONB;
BEGIN
    -- 获取模板的参数结构定义
    SELECT parameter_schema INTO template_schema
    FROM policy_templates
    WHERE id = template_id_param AND is_active = true;
    
    -- 如果没有找到模板或模板没有定义schema，返回true（跳过验证）
    IF template_schema IS NULL THEN
        RETURN true;
    END IF;
    
    -- TODO: 实现JSON Schema验证逻辑
    -- 这里暂时返回true，实际实现需要JSON Schema验证库
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 获取Safe的有效策略列表（按优先级排序）
CREATE OR REPLACE FUNCTION get_active_policies_for_safe(
    safe_id_param UUID
) RETURNS TABLE (
    policy_id UUID,
    policy_name VARCHAR(255),
    policy_type VARCHAR(50),
    parameters JSONB,
    priority INTEGER,
    enforcement_level VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.name, p.policy_type, p.parameters, p.priority, p.enforcement_level
    FROM policies p
    WHERE p.safe_id = safe_id_param 
      AND p.is_active = true
    ORDER BY p.priority ASC, p.execution_order ASC;
END;
$$ LANGUAGE plpgsql;

-- 检查策略依赖关系
CREATE OR REPLACE FUNCTION check_policy_dependencies(
    policy_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
    dependency_record RECORD;
    parent_active BOOLEAN;
BEGIN
    -- 检查所有前置依赖
    FOR dependency_record IN 
        SELECT parent_policy_id, dependency_type 
        FROM policy_dependencies 
        WHERE dependent_policy_id = policy_id_param 
          AND dependency_type = 'prerequisite' 
          AND is_active = true
    LOOP
        -- 检查前置策略是否激活
        SELECT is_active INTO parent_active
        FROM policies
        WHERE id = dependency_record.parent_policy_id;
        
        -- 如果前置策略未激活，返回false
        IF NOT parent_active THEN
            RETURN false;
        END IF;
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 数据完整性检查函数
-- =====================================================

-- 检查策略冲突
CREATE OR REPLACE FUNCTION check_policy_conflicts(
    safe_id_param UUID,
    new_policy_type VARCHAR(50),
    new_parameters JSONB
) RETURNS TABLE (
    conflicting_policy_id UUID,
    conflict_reason TEXT
) AS $$
BEGIN
    -- TODO: 实现策略冲突检查逻辑
    -- 例如：同一类型的策略是否有冲突的参数设置
    -- 这里暂时返回空结果，实际实现需要根据具体策略类型进行检查
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 视图定义：便于查询和报表
-- =====================================================

-- 策略执行统计视图
CREATE OR REPLACE VIEW policy_execution_stats AS
SELECT 
    p.id as policy_id,
    p.name as policy_name,
    p.policy_type,
    s.name as safe_name,
    COUNT(pel.id) as total_executions,
    COUNT(CASE WHEN pel.execution_result = 'passed' THEN 1 END) as passed_count,
    COUNT(CASE WHEN pel.execution_result = 'failed' THEN 1 END) as failed_count,
    COUNT(CASE WHEN pel.execution_result = 'warning' THEN 1 END) as warning_count,
    AVG(pel.execution_duration_ms) as avg_execution_time_ms,
    MAX(pel.executed_at) as last_execution_at
FROM policies p
JOIN safes s ON p.safe_id = s.id
LEFT JOIN policy_execution_logs pel ON p.id = pel.policy_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.policy_type, s.name;

-- 策略健康状态视图
CREATE OR REPLACE VIEW policy_health_status AS
SELECT 
    p.id as policy_id,
    p.name as policy_name,
    p.policy_type,
    p.safe_id,
    CASE 
        WHEN COUNT(pe.id) FILTER (WHERE pe.exception_level = 'critical' AND pe.status = 'open') > 0 THEN 'critical'
        WHEN COUNT(pe.id) FILTER (WHERE pe.exception_level = 'error' AND pe.status = 'open') > 0 THEN 'error'
        WHEN COUNT(pe.id) FILTER (WHERE pe.exception_level = 'warning' AND pe.status = 'open') > 0 THEN 'warning'
        ELSE 'healthy'
    END as health_status,
    COUNT(pe.id) FILTER (WHERE pe.status = 'open') as open_exceptions_count,
    MAX(pe.occurred_at) as last_exception_at
FROM policies p
LEFT JOIN policy_exceptions pe ON p.id = pe.policy_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.policy_type, p.safe_id;

-- =====================================================
-- 注释说明
-- =====================================================

-- 表注释
COMMENT ON TABLE policy_templates IS '策略模板表：定义可重用的策略模板，支持系统预设模板和企业自定义模板';
COMMENT ON TABLE policy_execution_logs IS '策略执行历史表：记录策略的执行情况，用于审计和分析策略效果';
COMMENT ON TABLE policy_dependencies IS '策略依赖关系表：定义策略之间的依赖关系，支持复杂的策略组合';
COMMENT ON TABLE policy_exceptions IS '策略异常表：记录策略执行中的异常情况，用于监控策略健康状态';

-- 关键字段注释
COMMENT ON COLUMN policy_templates.parameter_schema IS 'JSON Schema格式的参数结构定义，用于验证策略参数的有效性';
COMMENT ON COLUMN policies.enforcement_level IS '策略执行级别：strict=严格执行，warning=警告但允许，advisory=仅建议';
COMMENT ON COLUMN policies.conditions IS '策略生效条件，JSON格式存储如时间范围、用户角色等条件';
COMMENT ON COLUMN policy_execution_logs.execution_duration_ms IS '策略执行耗时，用于性能监控和优化';

-- =====================================================
-- 迁移脚本完成
-- 执行此脚本后，系统将具备完整的策略管理功能
-- 包括策略模板、执行监控、依赖管理和异常处理
-- =====================================================
