-- 企业级多签提案系统数据库表结构
-- 包含提案、签名、策略等核心业务表

-- 创建提案表
CREATE TABLE IF NOT EXISTS proposals (
    -- 主键和基础信息
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    safe_id UUID NOT NULL REFERENCES safes(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 提案基本信息
    title VARCHAR(255) NOT NULL,
    description TEXT,
    proposal_type VARCHAR(50) NOT NULL, -- transfer, contract_call, add_owner, remove_owner, change_threshold
    
    -- 交易参数
    to_address VARCHAR(42), -- 目标地址
    value DECIMAL(78, 0) DEFAULT 0, -- 转账金额（wei）
    data TEXT, -- 合约调用数据
    
    -- 签名管理
    required_signatures INTEGER NOT NULL,
    current_signatures INTEGER DEFAULT 0,
    
    -- 状态管理
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 状态流转: pending -> approved -> executed -> rejected
    
    -- 区块链执行信息
    tx_hash VARCHAR(66), -- 执行交易哈希
    block_number BIGINT, -- 执行区块号
    gas_used BIGINT, -- 消耗的Gas
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP, -- 获得足够签名的时间
    executed_at TIMESTAMP, -- 区块链执行时间
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 审计字段
    nonce BIGINT, -- Safe nonce
    safe_tx_hash VARCHAR(66) -- Safe交易哈希
);

-- 创建签名表
CREATE TABLE IF NOT EXISTS signatures (
    -- 主键和关联
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    signer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 签名数据
    signature_data TEXT NOT NULL, -- 签名数据
    signature_type VARCHAR(20) DEFAULT 'eth_sign', -- 签名类型
    
    -- 状态和时间
    status VARCHAR(20) DEFAULT 'valid', -- valid, invalid, revoked
    signed_at TIMESTAMP DEFAULT NOW(),
    
    -- nonce管理字段
    used_nonce BIGINT, -- 签名时使用的Safe nonce
    safe_tx_hash VARCHAR(66), -- 签名对应的Safe交易哈希
    
    -- 唯一约束：每个用户对每个提案只能签名一次
    UNIQUE(proposal_id, signer_id)
);

-- 创建策略表（用于定义Safe的治理规则）
CREATE TABLE IF NOT EXISTS policies (
    -- 主键和关联
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    safe_id UUID NOT NULL REFERENCES safes(id) ON DELETE CASCADE,
    
    -- 策略信息
    name VARCHAR(255) NOT NULL,
    description TEXT,
    policy_type VARCHAR(50) NOT NULL, -- approval_threshold, time_lock, spending_limit
    
    -- 策略参数（JSON格式存储灵活配置）
    parameters JSONB NOT NULL,
    
    -- 状态管理
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 创建者
    created_by UUID NOT NULL REFERENCES users(id)
);

-- 创建工作流状态表（跟踪提案的工作流状态）
CREATE TABLE IF NOT EXISTS workflow_states (
    -- 主键和关联
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    
    -- 工作流信息
    current_state VARCHAR(50) NOT NULL, -- pending, under_review, approved, executed, rejected
    previous_state VARCHAR(50),
    
    -- 状态变更信息
    changed_by UUID REFERENCES users(id),
    change_reason TEXT,
    
    -- 下一步操作
    next_actions JSONB, -- 可执行的下一步操作列表
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- 确保每个提案只有一个当前状态
    UNIQUE(proposal_id)
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_proposals_safe_id ON proposals(safe_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON proposals(created_by);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_type ON proposals(proposal_type);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at);

CREATE INDEX IF NOT EXISTS idx_signatures_proposal_id ON signatures(proposal_id);
CREATE INDEX IF NOT EXISTS idx_signatures_signer_id ON signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_signatures_status ON signatures(status);

CREATE INDEX IF NOT EXISTS idx_policies_safe_id ON policies(safe_id);
CREATE INDEX IF NOT EXISTS idx_policies_type ON policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_policies_active ON policies(is_active);

CREATE INDEX IF NOT EXISTS idx_workflow_states_proposal_id ON workflow_states(proposal_id);
CREATE INDEX IF NOT EXISTS idx_workflow_states_current_state ON workflow_states(current_state);

-- 创建更新时间戳的触发器
CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_proposals_updated_at();

CREATE OR REPLACE FUNCTION update_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_policies_updated_at
    BEFORE UPDATE ON policies
    FOR EACH ROW
    EXECUTE FUNCTION update_policies_updated_at();

-- 添加约束确保数据完整性
ALTER TABLE proposals 
ADD CONSTRAINT check_proposal_status 
CHECK (status IN ('pending', 'approved', 'executed', 'rejected'));

ALTER TABLE proposals 
ADD CONSTRAINT check_proposal_type 
CHECK (proposal_type IN ('transfer', 'contract_call', 'add_owner', 'remove_owner', 'change_threshold'));

ALTER TABLE proposals 
ADD CONSTRAINT check_required_signatures 
CHECK (required_signatures > 0);

ALTER TABLE proposals 
ADD CONSTRAINT check_current_signatures 
CHECK (current_signatures >= 0);

ALTER TABLE signatures 
ADD CONSTRAINT check_signature_status 
CHECK (status IN ('valid', 'invalid', 'revoked'));

-- 添加表注释
COMMENT ON TABLE proposals IS '多签提案表，存储所有类型的提案信息';
COMMENT ON TABLE signatures IS '提案签名表，记录用户对提案的签名';
COMMENT ON TABLE policies IS '治理策略表，定义Safe的各种治理规则';
COMMENT ON TABLE workflow_states IS '工作流状态表，跟踪提案的状态变更';

-- 添加列注释
COMMENT ON COLUMN proposals.proposal_type IS '提案类型：transfer(转账), contract_call(合约调用), add_owner(添加所有者), remove_owner(移除所有者), change_threshold(修改阈值)';
COMMENT ON COLUMN proposals.status IS '提案状态：pending(待审批), approved(已批准), executed(已执行), rejected(已拒绝)';
COMMENT ON COLUMN proposals.value IS '转账金额，以wei为单位存储';
COMMENT ON COLUMN signatures.signature_data IS '以太坊签名数据，通常为65字节的十六进制字符串';
COMMENT ON COLUMN policies.parameters IS 'JSON格式的策略参数，支持灵活的策略配置';
COMMENT ON COLUMN workflow_states.next_actions IS 'JSON格式的下一步可执行操作列表';
