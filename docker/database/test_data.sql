-- Web3 企业多签系统测试数据
-- 注意：密码哈希对应的明文密码都是 "password123"

-- 插入测试用户
INSERT INTO users (id, email, password_hash, username, full_name, role, is_active, email_verified) VALUES
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@multisig.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.Uo8.OvOVvVEjkmncVn.fUX.lDhnau6',
    'admin',
    'System Administrator',
    'admin',
    true,
    true
),
(
    'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'alice@company.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.Uo8.OvOVvVEjkmncVn.fUX.lDhnau6',
    'alice',
    'Alice Johnson',
    'user',
    true,
    true
),
(
    'c2abde99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'bob@company.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.Uo8.OvOVvVEjkmncVn.fUX.lDhnau6',
    'bob',
    'Bob Smith',
    'user',
    true,
    true
),
(
    'd3abef99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'charlie@company.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.Uo8.OvOVvVEjkmncVn.fUX.lDhnau6',
    'charlie',
    'Charlie Brown',
    'user',
    true,
    true
);

-- 插入测试 Safe 钱包
INSERT INTO safes (id, name, description, address, chain_id, threshold, owners, created_by) VALUES
(
    'e4aafc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    'Company Treasury',
    'Main company treasury for operational funds',
    '0x1234567890123456789012345678901234567890',
    11155111,
    2,
    ARRAY['0xA0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '0xB1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22', '0xC2abde99-9c0b-4ef8-bb6d-6bb9bd380a33'],
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
),
(
    'f5aac999-9c0b-4ef8-bb6d-6bb9bd380a66',
    'Development Fund',
    'Wallet for development team expenses and payments',
    '0x2345678901234567890123456789012345678901',
    11155111,
    2,
    ARRAY['0xB1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22', '0xD3abef99-9c0b-4ef8-bb6d-6bb9bd380a44'],
    'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22'
);

-- 插入测试策略
INSERT INTO policies (id, safe_id, name, description, rules, created_by) VALUES
(
    'a6aac999-9c0b-4ef8-bb6d-6bb9bd380a77',
    'e4aafc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    'Treasury Spending Policy',
    'Policy for treasury fund spending approval',
    '{"max_amount": "1000000000000000000", "require_admin_approval": true, "cooling_period": 86400}',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
),
(
    'a7aac999-9c0b-4ef8-bb6d-6bb9bd380a88',
    'f5aac999-9c0b-4ef8-bb6d-6bb9bd380a66',
    'Development Expenses',
    'Policy for development team expense approvals',
    '{"max_amount": "500000000000000000", "require_admin_approval": false, "auto_approve_under": "100000000000000000"}',
    'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22'
);

-- 插入测试提案
INSERT INTO proposals (id, safe_id, title, description, to_address, value, data, signatures_required, created_by) VALUES
(
    'a8aac999-9c0b-4ef8-bb6d-6bb9bd380a99',
    'e4aafc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    'Transfer to Marketing Budget',
    'Transfer 0.5 ETH to marketing wallet for Q1 campaigns',
    '0x3456789012345678901234567890123456789012',
    '500000000000000000',
    '0x',
    2,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
),
(
    'a9aac999-9c0b-4ef8-bb6d-6bb9bd380aaa',
    'f5aac999-9c0b-4ef8-bb6d-6bb9bd380a66',
    'Pay Development Contractor',
    'Payment for smart contract audit services',
    '0x4567890123456789012345678901234567890123',
    '200000000000000000',
    '0x',
    2,
    'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22'
);

-- 插入测试签名
INSERT INTO signatures (id, proposal_id, user_id, ethereum_address, signature_data, signature_type) VALUES
(
    'a0aac999-9c0b-4ef8-bb6d-6bb9bd380bbb',
    'a8aac999-9c0b-4ef8-bb6d-6bb9bd380a99',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '0xA0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b',
    'eth_sign'
),
(
    'a1aac999-9c0b-4ef8-bb6d-6bb9bd380ccc',
    'a8aac999-9c0b-4ef8-bb6d-6bb9bd380a99',
    'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22',
    '0xB1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22',
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678901c',
    'eth_sign'
);

