const axios = require('axios');

// 测试提案通知功能
async function testProposalNotification() {
    const baseURL = 'http://localhost:8080/api/v1';
    
    // 模拟用户登录获取token
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('🔑 用户登录成功，Token:', token.substring(0, 20) + '...');
    
    // 获取用户的Safe列表
    const safesResponse = await axios.get(`${baseURL}/safes`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    const safes = safesResponse.data.safes;
    if (safes.length === 0) {
        console.log('❌ 用户没有Safe钱包，请先创建Safe');
        return;
    }
    
    const safe = safes[0];
    console.log('🔐 使用Safe:', safe.address);
    console.log('👥 Safe所有者:', safe.owners);
    
    // 创建测试提案
    const proposalData = {
        safe_address: safe.address,
        proposal_type: 'transfer',
        title: '测试提案 - WebSocket通知',
        description: '这是一个用于测试WebSocket通知的提案',
        to_address: '0x742d35Cc6634C0532925a3b8D2C8C5e2D6C4b5d6',
        value: '0.001',
        required_signatures: 2
    };
    
    console.log('📝 创建提案...');
    const createResponse = await axios.post(`${baseURL}/proposals`, proposalData, {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    const proposal = createResponse.data.proposal;
    console.log('✅ 提案创建成功:', proposal.id);
    console.log('📋 提案详情:', {
        title: proposal.title,
        safe_id: proposal.safe_id,
        created_by: proposal.created_by,
        required_signatures: proposal.required_signatures
    });
    
    console.log('🔔 请检查后端日志，查看WebSocket通知发送情况');
    console.log('📱 请检查前端浏览器控制台，查看是否收到通知');
}

// 运行测试
testProposalNotification().catch(console.error);
