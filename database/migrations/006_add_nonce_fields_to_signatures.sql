-- 添加nonce管理字段到signatures表
-- 这是企业级Safe nonce管理的关键升级

-- 添加签名时使用的nonce字段
ALTER TABLE signatures 
ADD COLUMN used_nonce BIGINT;

-- 添加签名对应的Safe交易哈希字段
ALTER TABLE signatures 
ADD COLUMN safe_tx_hash VARCHAR(66);

-- 添加索引以提高查询性能
CREATE INDEX idx_signatures_used_nonce ON signatures(used_nonce);
CREATE INDEX idx_signatures_safe_tx_hash ON signatures(safe_tx_hash);

-- 添加复合索引用于nonce验证查询
CREATE INDEX idx_signatures_proposal_nonce ON signatures(proposal_id, used_nonce, status);

-- 添加注释说明字段用途
COMMENT ON COLUMN signatures.used_nonce IS '签名时使用的Safe合约nonce值，用于企业级nonce管理';
COMMENT ON COLUMN signatures.safe_tx_hash IS '签名对应的Safe交易哈希，用于验证和审计';
