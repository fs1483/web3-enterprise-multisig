-- 修复数据库迁移脚本
-- 按正确顺序执行所有必要的迁移

\echo '开始修复数据库迁移...'

-- 0. 首先创建 safe_transactions 表（如果不存在）
\echo '创建 safe_transactions 表...'

CREATE TABLE IF NOT EXISTS safe_transactions (
    -- 主键和基础信息
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 区块链交易信息
    tx_hash VARCHAR(66) UNIQUE NOT NULL, -- 以太坊交易哈希
    safe_address VARCHAR(42), -- Safe合约地址（确认后填入）
    block_number BIGINT, -- 区块号
    gas_used BIGINT, -- 实际消耗的Gas
    
    -- 业务状态管理
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED', 
    -- 状态流转: SUBMITTED -> PENDING -> CONFIRMED -> PROCESSED -> COMPLETED
    -- SUBMITTED: 交易已提交到区块链
    -- PENDING: 等待区块链确认
    -- CONFIRMED: 区块链已确认，Safe地址已获取
    -- PROCESSED: 数据库已保存Safe信息
    -- COMPLETED: 流程完全完成
    -- FAILED: 交易失败或处理异常
    
    -- Safe创建参数（用于确认后创建Safe记录）
    safe_name VARCHAR(255) NOT NULL,
    safe_description TEXT,
    owners JSONB NOT NULL, -- 所有者地址数组
    threshold INTEGER NOT NULL, -- 签名阈值
    chain_id INTEGER NOT NULL DEFAULT 11155111, -- 链ID
    
    -- 错误处理
    error_message TEXT, -- 错误信息
    retry_count INTEGER DEFAULT 0, -- 重试次数
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 约束
    CHECK (threshold > 0),
    CHECK (retry_count >= 0),
    CHECK (status IN ('SUBMITTED', 'PENDING', 'CONFIRMED', 'PROCESSED', 'COMPLETED', 'FAILED'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_safe_transactions_user_id ON safe_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_safe_transactions_tx_hash ON safe_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_safe_transactions_status ON safe_transactions(status);
CREATE INDEX IF NOT EXISTS idx_safe_transactions_safe_address ON safe_transactions(safe_address);
CREATE INDEX IF NOT EXISTS idx_safe_transactions_created_at ON safe_transactions(created_at);

\echo 'safe_transactions 表创建完成'

-- 1. 首先创建 safe_role_templates 表（如果不存在）
\echo '创建 safe_role_templates 表...'

CREATE TABLE IF NOT EXISTS safe_role_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    safe_id UUID NOT NULL REFERENCES safes(id) ON DELETE CASCADE,
    template_id VARCHAR(100) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    template_display_name VARCHAR(200) NOT NULL,
    template_category VARCHAR(50) NOT NULL DEFAULT 'safe',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    restrictions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    applied_by UUID NOT NULL REFERENCES users(id),
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(safe_id, template_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_safe_role_templates_safe_id ON safe_role_templates(safe_id);
CREATE INDEX IF NOT EXISTS idx_safe_role_templates_template_id ON safe_role_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_safe_role_templates_active ON safe_role_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_safe_role_templates_category ON safe_role_templates(template_category);

-- 创建更新触发器
CREATE OR REPLACE FUNCTION update_safe_role_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_safe_role_templates_updated_at ON safe_role_templates;
CREATE TRIGGER update_safe_role_templates_updated_at
    BEFORE UPDATE ON safe_role_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_safe_role_templates_updated_at();

\echo 'safe_role_templates 表创建完成'

-- 2. 创建 safe_custom_roles 表（如果不存在）
\echo '创建 safe_custom_roles 表...'

CREATE TABLE IF NOT EXISTS safe_custom_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    safe_id UUID NOT NULL REFERENCES safes(id) ON DELETE CASCADE,
    role_id VARCHAR(100) NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    role_description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    restrictions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(safe_id, role_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_safe_custom_roles_safe_id ON safe_custom_roles(safe_id);
CREATE INDEX IF NOT EXISTS idx_safe_custom_roles_role_id ON safe_custom_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_safe_custom_roles_active ON safe_custom_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_safe_custom_roles_created_by ON safe_custom_roles(created_by);

-- 创建更新触发器
CREATE OR REPLACE FUNCTION update_safe_custom_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_safe_custom_roles_updated_at ON safe_custom_roles;
CREATE TRIGGER update_safe_custom_roles_updated_at
    BEFORE UPDATE ON safe_custom_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_safe_custom_roles_updated_at();

\echo 'safe_custom_roles 表创建完成'

-- 3. 创建角色使用情况统计视图（修复版本）
\echo '创建角色使用情况统计视图...'

CREATE OR REPLACE VIEW safe_role_usage_stats AS
SELECT 
    scr.safe_id,
    scr.role_id,
    scr.role_name,
    COALESCE(COUNT(smr.id), 0) as member_count,
    scr.is_active,
    scr.created_at
FROM safe_custom_roles scr
LEFT JOIN safe_member_roles smr ON smr.safe_id = scr.safe_id AND smr.role = scr.role_id AND smr.is_active = true
GROUP BY scr.safe_id, scr.role_id, scr.role_name, scr.is_active, scr.created_at;

\echo '视图创建完成'

-- 4. 添加注释
COMMENT ON TABLE safe_role_templates IS 'Safe角色模板关联表，记录哪些权限模板被应用到哪些Safe';
COMMENT ON TABLE safe_custom_roles IS 'Safe自定义角色表，存储每个Safe的自定义角色定义';
COMMENT ON VIEW safe_role_usage_stats IS 'Safe自定义角色使用情况统计视图';

-- 5. 验证表是否创建成功
\echo '验证表创建结果...'

SELECT 'safe_role_templates' as table_name, count(*) as record_count FROM safe_role_templates
UNION ALL
SELECT 'safe_custom_roles' as table_name, count(*) as record_count FROM safe_custom_roles;

\echo '✅ 数据库迁移修复完成！'
\echo '🔄 请重启后端服务以应用更改'
