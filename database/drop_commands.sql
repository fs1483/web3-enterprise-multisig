-- 逐步删除数据库表的命令
-- 可以逐行执行，避免依赖关系错误

-- 方法1: 使用CASCADE强制删除（推荐）
DROP TABLE IF EXISTS workflow_states CASCADE;
DROP TABLE IF EXISTS signatures CASCADE;
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS safe_owners CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS safe_transactions CASCADE;
DROP TABLE IF EXISTS safes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 方法2: 如果上面不行，先删除外键约束再删除表
-- ALTER TABLE signatures DROP CONSTRAINT IF EXISTS signatures_proposal_id_fkey;
-- ALTER TABLE signatures DROP CONSTRAINT IF EXISTS signatures_signer_id_fkey;
-- ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_safe_id_fkey;
-- ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_created_by_fkey;
-- ALTER TABLE safe_owners DROP CONSTRAINT IF EXISTS safe_owners_safe_id_fkey;
-- ALTER TABLE safe_owners DROP CONSTRAINT IF EXISTS safe_owners_user_id_fkey;
-- ALTER TABLE safes DROP CONSTRAINT IF EXISTS safes_created_by_fkey;

-- 然后删除表
-- DROP TABLE signatures;
-- DROP TABLE proposals;
-- DROP TABLE safe_owners;
-- DROP TABLE user_sessions;
-- DROP TABLE safe_transactions;
-- DROP TABLE safes;
-- DROP TABLE users;

-- 删除函数和触发器
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_proposals_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_policies_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_safe_transactions_updated_at() CASCADE;
