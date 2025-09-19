-- 企业级Safe交易状态管理表
-- 用于异步处理Safe创建流程的状态跟踪

-- 创建Safe交易状态表
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
    chain_id INTEGER NOT NULL DEFAULT 11155111, -- 链ID（默认Sepolia）
    
    -- 时间戳管理
    created_at TIMESTAMP DEFAULT NOW(), -- 交易提交时间
    confirmed_at TIMESTAMP, -- 区块链确认时间
    processed_at TIMESTAMP, -- 数据库处理完成时间
    
    -- 错误处理和重试机制
    retry_count INTEGER DEFAULT 0, -- 重试次数
    error_message TEXT, -- 错误信息
    
    -- 审计字段
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_safe_tx_status ON safe_transactions(status);
CREATE INDEX IF NOT EXISTS idx_safe_tx_user ON safe_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_safe_tx_hash ON safe_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_safe_tx_created ON safe_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_safe_tx_chain ON safe_transactions(chain_id);

-- 为现有safes表添加transaction_id关联字段
ALTER TABLE safes ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES safe_transactions(id);

-- 创建更新时间戳的触发器
CREATE OR REPLACE FUNCTION update_safe_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_safe_transactions_updated_at
    BEFORE UPDATE ON safe_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_safe_transactions_updated_at();

-- 添加状态约束确保数据完整性
ALTER TABLE safe_transactions 
ADD CONSTRAINT check_status 
CHECK (status IN ('SUBMITTED', 'PENDING', 'CONFIRMED', 'PROCESSED', 'COMPLETED', 'FAILED'));

-- 添加阈值约束
ALTER TABLE safe_transactions 
ADD CONSTRAINT check_threshold 
CHECK (threshold > 0);

-- 添加注释说明表结构
COMMENT ON TABLE safe_transactions IS '企业级Safe创建交易状态管理表，支持异步处理流程';
COMMENT ON COLUMN safe_transactions.status IS '交易状态：SUBMITTED->PENDING->CONFIRMED->PROCESSED->COMPLETED';
COMMENT ON COLUMN safe_transactions.tx_hash IS '区块链交易哈希，用于监听交易状态';
COMMENT ON COLUMN safe_transactions.safe_address IS 'Safe合约地址，区块链确认后填入';
COMMENT ON COLUMN safe_transactions.retry_count IS '处理失败时的重试次数，最大重试3次';




-- =====================================================
-- 添加成员角色信息到Safe交易表
-- 版本: v1.0
-- 功能: 支持Safe创建时的成员角色分配信息存储
-- =====================================================

-- 为safe_transactions表添加member_roles字段
ALTER TABLE safe_transactions 
ADD COLUMN IF NOT EXISTS member_roles JSONB DEFAULT '[]'::jsonb;

-- 添加字段注释
COMMENT ON COLUMN safe_transactions.member_roles IS '成员角色分配信息，JSON格式存储地址和角色ID的映射关系';

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_safe_transactions_member_roles 
ON safe_transactions USING GIN (member_roles);

-- 添加示例数据说明
-- member_roles字段格式示例：
-- [
--   {"address": "0x1234...", "role_id": "founder_ceo"},
--   {"address": "0x5678...", "role_id": "finance_director"}
-- ]