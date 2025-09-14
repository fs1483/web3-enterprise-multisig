-- Web3 企业多签系统核心表结构
-- 创建时间：2024-01-01
-- 版本：v1.0

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- 2. Safe 钱包表
CREATE TABLE safes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(42) UNIQUE NOT NULL, -- Safe 合约地址
    chain_id INTEGER NOT NULL DEFAULT 11155111, -- Sepolia testnet
    threshold INTEGER NOT NULL CHECK (threshold > 0),
    owners TEXT[] NOT NULL, -- 所有者地址数组
    safe_version VARCHAR(20),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'frozen')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safe 表索引
CREATE INDEX idx_safes_address ON safes(address);
CREATE INDEX idx_safes_chain_id ON safes(chain_id);
CREATE INDEX idx_safes_status ON safes(status);
CREATE INDEX idx_safes_created_by ON safes(created_by);

-- 3. 策略表
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    safe_id UUID NOT NULL REFERENCES safes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rules JSONB NOT NULL DEFAULT '{}', -- 策略规则配置
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 策略表索引
CREATE INDEX idx_policies_safe_id ON policies(safe_id);
CREATE INDEX idx_policies_is_active ON policies(is_active);
CREATE INDEX idx_policies_created_by ON policies(created_by);

-- 4. 提案表
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    safe_id UUID NOT NULL REFERENCES safes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    to_address VARCHAR(42) NOT NULL,
    value DECIMAL(78, 0) DEFAULT 0, -- Wei 单位，支持大数
    data TEXT, -- 交易数据（hex）
    operation INTEGER DEFAULT 0 CHECK (operation IN (0, 1)), -- 0: Call, 1: DelegateCall
    safe_tx_hash VARCHAR(66), -- Safe 交易哈希
    ethereum_tx_hash VARCHAR(66), -- 以太坊交易哈希
    nonce INTEGER,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executed', 'rejected', 'cancelled')),
    signatures_required INTEGER NOT NULL,
    signatures_count INTEGER DEFAULT 0,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 提案表索引
CREATE INDEX idx_proposals_safe_id ON proposals(safe_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_safe_tx_hash ON proposals(safe_tx_hash);
CREATE INDEX idx_proposals_created_by ON proposals(created_by);
CREATE INDEX idx_proposals_created_at ON proposals(created_at);

-- 5. 签名表
CREATE TABLE signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    ethereum_address VARCHAR(42) NOT NULL,
    signature_data TEXT NOT NULL, -- 签名数据（hex）
    signature_type VARCHAR(50) DEFAULT 'eth_sign' CHECK (signature_type IN ('eth_sign', 'eth_signTypedData', 'contract')),
    status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'rejected')),
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(proposal_id, user_id) -- 每个用户对每个提案只能签名一次
);

-- 签名表索引
CREATE INDEX idx_signatures_proposal_id ON signatures(proposal_id);
CREATE INDEX idx_signatures_user_id ON signatures(user_id);
CREATE INDEX idx_signatures_ethereum_address ON signatures(ethereum_address);
CREATE INDEX idx_signatures_status ON signatures(status);
CREATE INDEX idx_signatures_signed_at ON signatures(signed_at);

-- 创建视图：Safe 统计信息
CREATE VIEW safe_stats AS
SELECT
    s.id,
    s.name,
    s.address,
    s.threshold,
    array_length(s.owners, 1) as total_owners,
    COUNT(DISTINCT p.id) as total_proposals,
    COUNT(DISTINCT CASE WHEN p.status = 'pending' THEN p.id END) as pending_proposals,
    COUNT(DISTINCT CASE WHEN p.status = 'executed' THEN p.id END) as executed_proposals
FROM safes s
LEFT JOIN proposals p ON s.id = p.safe_id
GROUP BY s.id, s.name, s.address, s.threshold, s.owners;

-- 创建视图：用户活动统计
CREATE VIEW user_activity AS
SELECT
    u.id,
    u.username,
    u.email,
    COUNT(DISTINCT s.id) as created_safes,
    COUNT(DISTINCT p.id) as created_proposals,
    COUNT(DISTINCT sig.id) as total_signatures
FROM users u
LEFT JOIN safes s ON u.id = s.created_by
LEFT JOIN proposals p ON u.id = p.created_by
LEFT JOIN signatures sig ON u.id = sig.user_id
GROUP BY u.id, u.username, u.email;

