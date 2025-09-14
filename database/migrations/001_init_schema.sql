-- 企业级多签系统初始化数据库Schema
-- 创建基础用户和Safe管理表

-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    -- 主键和基础信息
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 用户基本信息
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- 可为空，支持钱包登录
    
    -- Web3钱包信息
    wallet_address VARCHAR(42) UNIQUE, -- 以太坊地址
    
    -- 用户状态
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    
    -- 用户角色和权限
    role VARCHAR(50) DEFAULT 'user', -- user, admin, super_admin
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

-- 创建Safe多签钱包表
CREATE TABLE IF NOT EXISTS safes (
    -- 主键和基础信息
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Safe基本信息
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(42) UNIQUE NOT NULL, -- Safe合约地址
    
    -- 区块链信息
    chain_id INTEGER NOT NULL DEFAULT 11155111, -- 链ID（默认Sepolia）
    safe_version VARCHAR(20) DEFAULT '1.4.1', -- Safe合约版本
    
    -- 多签配置
    threshold INTEGER NOT NULL, -- 签名阈值
    owners JSONB NOT NULL, -- 所有者地址数组
    
    -- 创建信息
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- 状态管理
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, deprecated
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 关联交易ID（用于异步创建流程）
    transaction_id UUID
);

-- 创建Safe所有者关联表（多对多关系）
CREATE TABLE IF NOT EXISTS safe_owners (
    -- 主键和关联
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    safe_id UUID NOT NULL REFERENCES safes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 所有者信息
    owner_address VARCHAR(42) NOT NULL, -- 所有者钱包地址
    
    -- 权限和状态
    is_active BOOLEAN DEFAULT true,
    added_at TIMESTAMP DEFAULT NOW(),
    added_by UUID REFERENCES users(id),
    
    -- 唯一约束：每个Safe中每个用户只能有一个所有者记录
    UNIQUE(safe_id, user_id),
    UNIQUE(safe_id, owner_address)
);

-- 创建用户会话表（JWT token管理）
CREATE TABLE IF NOT EXISTS user_sessions (
    -- 主键和关联
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 会话信息
    token_hash VARCHAR(255) NOT NULL, -- JWT token哈希
    device_info TEXT, -- 设备信息
    ip_address INET, -- IP地址
    
    -- 会话状态
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_safes_address ON safes(address);
CREATE INDEX IF NOT EXISTS idx_safes_created_by ON safes(created_by);
CREATE INDEX IF NOT EXISTS idx_safes_chain_id ON safes(chain_id);
CREATE INDEX IF NOT EXISTS idx_safes_status ON safes(status);

CREATE INDEX IF NOT EXISTS idx_safe_owners_safe_id ON safe_owners(safe_id);
CREATE INDEX IF NOT EXISTS idx_safe_owners_user_id ON safe_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_safe_owners_address ON safe_owners(owner_address);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 创建更新时间戳的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_safes_updated_at
    BEFORE UPDATE ON safes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 添加约束确保数据完整性
ALTER TABLE users 
ADD CONSTRAINT check_user_role 
CHECK (role IN ('user', 'admin', 'super_admin'));

ALTER TABLE safes 
ADD CONSTRAINT check_safe_status 
CHECK (status IN ('active', 'inactive', 'deprecated'));

ALTER TABLE safes 
ADD CONSTRAINT check_threshold_positive 
CHECK (threshold > 0);

ALTER TABLE safes 
ADD CONSTRAINT check_chain_id_positive 
CHECK (chain_id > 0);

-- 添加表注释
COMMENT ON TABLE users IS '用户表，支持传统邮箱密码和Web3钱包两种登录方式';
COMMENT ON TABLE safes IS 'Safe多签钱包表，存储Safe合约的基本信息和配置';
COMMENT ON TABLE safe_owners IS 'Safe所有者关联表，管理Safe与用户的多对多关系';
COMMENT ON TABLE user_sessions IS '用户会话表，管理JWT token和登录状态';

-- 添加列注释
COMMENT ON COLUMN users.wallet_address IS '用户的以太坊钱包地址，支持Web3登录';
COMMENT ON COLUMN users.password_hash IS '密码哈希，钱包登录用户可为空';
COMMENT ON COLUMN safes.owners IS 'JSONB格式存储的所有者地址数组';
COMMENT ON COLUMN safes.threshold IS '多签阈值，需要的最少签名数量';
COMMENT ON COLUMN safe_owners.owner_address IS '所有者的钱包地址，与users.wallet_address关联';
