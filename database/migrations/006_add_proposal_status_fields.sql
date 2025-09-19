-- 007_add_proposal_status_fields.sql
-- 为提案表添加新的状态字段和完善状态约束

-- 添加新的时间戳字段
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- 更新状态字段约束，添加新的状态值
ALTER TABLE proposals 
DROP CONSTRAINT IF EXISTS proposals_status_check;

ALTER TABLE proposals 
ADD CONSTRAINT proposals_status_check 
CHECK (status IN ('pending', 'approved', 'executed', 'confirmed', 'failed', 'rejected'));

-- 添加注释说明状态流转
COMMENT ON COLUMN proposals.status IS '提案状态: pending(待签名) -> approved(已获得足够签名) -> executed(已提交区块链) -> confirmed(执行成功)/failed(执行失败)/rejected(被拒绝)';
COMMENT ON COLUMN proposals.confirmed_at IS '区块链确认成功时间';
COMMENT ON COLUMN proposals.failed_at IS '区块链执行失败时间';
COMMENT ON COLUMN proposals.failure_reason IS '失败原因描述';

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_confirmed_at ON proposals(confirmed_at);
CREATE INDEX IF NOT EXISTS idx_proposals_failed_at ON proposals(failed_at);
