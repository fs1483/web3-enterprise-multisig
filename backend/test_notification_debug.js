const axios = require('axios');

// 调试WebSocket通知的详细测试脚本
async function debugNotificationFlow() {
    const baseURL = 'http://localhost:8080/api/v1';
    
    console.log('🔍 开始调试WebSocket通知流程...\n');
    
    try {
        // 1. 用户登录
        console.log('1️⃣ 用户登录测试...');
        const loginResponse = await axios.post(`${baseURL}/auth/login`, {
            email: 'test@example.com',
            password: 'password123'
        });
        
        const token = loginResponse.data.token;
        const userInfo = loginResponse.data.user;
        console.log('✅ 登录成功');
        console.log('   用户ID:', userInfo.id);
        console.log('   钱包地址:', userInfo.wallet_address);
        console.log('   Token:', token.substring(0, 20) + '...\n');
        
        // 2. 获取用户的Safe列表
        console.log('2️⃣ 获取Safe列表...');
        const safesResponse = await axios.get(`${baseURL}/safes`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const safes = safesResponse.data.safes;
        if (safes.length === 0) {
            console.log('❌ 用户没有Safe钱包，请先创建Safe');
            return;
        }
        
        const safe = safes[0];
        console.log('✅ 找到Safe钱包');
        console.log('   Safe ID:', safe.id);
        console.log('   Safe地址:', safe.address);
        console.log('   创建者:', safe.created_by);
        console.log('   所有者列表:', safe.owners);
        console.log('   阈值:', safe.threshold);
        console.log('');
        
        // 3. 分析所有者信息
        console.log('3️⃣ 分析Safe所有者信息...');
        for (let i = 0; i < safe.owners.length; i++) {
            const ownerAddress = safe.owners[i];
            console.log(`   所有者 ${i + 1}: ${ownerAddress}`);
            
            // 查询对应的用户信息
            try {
                const userResponse = await axios.get(`${baseURL}/users/by-wallet/${ownerAddress}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log(`     -> 用户ID: ${userResponse.data.user.id}`);
                console.log(`     -> 用户名: ${userResponse.data.user.name}`);
            } catch (err) {
                console.log(`     -> ⚠️ 未找到对应用户: ${err.response?.data?.error || err.message}`);
            }
        }
        console.log('');
        
        // 4. 创建提案
        console.log('4️⃣ 创建测试提案...');
        const proposalData = {
            safe_address: safe.address,
            proposal_type: 'transfer',
            title: `测试提案 - ${new Date().toLocaleTimeString()}`,
            description: '这是一个用于测试WebSocket通知的提案',
            to_address: '0x742d35Cc6634C0532925a3b8D2C8C5e2D6C4b5d6',
            value: '0.001',
            required_signatures: Math.min(2, safe.threshold)
        };
        
        const createResponse = await axios.post(`${baseURL}/proposals`, proposalData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const proposal = createResponse.data.proposal;
        console.log('✅ 提案创建成功');
        console.log('   提案ID:', proposal.id);
        console.log('   标题:', proposal.title);
        console.log('   创建者:', proposal.created_by);
        console.log('   Safe ID:', proposal.safe_id);
        console.log('');
        
        // 5. 提示检查日志
        console.log('5️⃣ 检查要点:');
        console.log('📋 后端日志应显示:');
        console.log('   - 🚀 Initializing workflow for proposal [ID]');
        console.log('   - 🔍 Safe所有者列表(钱包地址): [地址数组]');
        console.log('   - 🔍 处理所有者地址: [每个地址]');
        console.log('   - 🔍 找到用户: 地址=[地址], 用户ID=[ID]');
        console.log('   - 📤 向用户发送通知: 用户ID=[ID], 钱包地址=[地址]');
        console.log('   - 📤 已向用户 [ID] 发送消息 (类型: new_proposal_created)');
        console.log('');
        console.log('📱 前端控制台应显示:');
        console.log('   - 📡 收到WebSocket消息: {type: "new_proposal_created"}');
        console.log('   - 🔔 收到新提案通知');
        console.log('   - ✅ 新提案通知已添加到通知列表');
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.response?.data || error.message);
    }
}

// 运行调试测试
debugNotificationFlow();
