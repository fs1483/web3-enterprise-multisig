const http = require('http');

// 测试待处理提案API功能
async function testPendingProposalsAPI() {
    console.log('🧪 测试待处理提案API功能...\n');

    // 模拟JWT token (需要替换为实际的token)
    const token = 'your-jwt-token-here';

    const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/api/v1/dashboard/pending-proposals',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('✅ API响应状态:', res.statusCode);
                    console.log('📋 响应数据:', JSON.stringify(response, null, 2));
                    
                    if (response.success && Array.isArray(response.data)) {
                        console.log(`\n📊 待处理提案数量: ${response.data.length}`);
                        
                        response.data.forEach((proposal, index) => {
                            console.log(`\n提案 ${index + 1}:`);
                            console.log(`  - ID: ${proposal.id}`);
                            console.log(`  - 标题: ${proposal.title}`);
                            console.log(`  - Safe名称: ${proposal.safe_name}`);
                            console.log(`  - 创建者: ${proposal.creator_name}`);
                            console.log(`  - 签名进度: ${proposal.signatures_count}/${proposal.signatures_required}`);
                            console.log(`  - 优先级: ${proposal.priority}`);
                            console.log(`  - 创建时间: ${proposal.created_at}`);
                        });
                    }
                    
                    resolve(response);
                } catch (error) {
                    console.error('❌ 解析响应失败:', error);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ 请求失败:', error);
            reject(error);
        });

        req.end();
    });
}

// 测试Dashboard卡片API
async function testDashboardCardsAPI() {
    console.log('\n🧪 测试Dashboard卡片API功能...\n');

    const token = 'your-jwt-token-here';

    const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/api/v1/dashboard/cards',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('✅ API响应状态:', res.statusCode);
                    console.log('📋 响应数据:', JSON.stringify(response, null, 2));
                    
                    if (response.success && response.data) {
                        const { proposalCenter } = response.data;
                        console.log(`\n📊 提案中心统计:`);
                        console.log(`  - 待签名: ${proposalCenter.pendingSignatures}`);
                        console.log(`  - 紧急提案: ${proposalCenter.urgentCount}`);
                        console.log(`  - 总提案: ${proposalCenter.totalProposals}`);
                        console.log(`  - 已执行: ${proposalCenter.executedProposals}`);
                        console.log(`  - 通过率: ${proposalCenter.approvalRate}%`);
                    }
                    
                    resolve(response);
                } catch (error) {
                    console.error('❌ 解析响应失败:', error);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ 请求失败:', error);
            reject(error);
        });

        req.end();
    });
}

// 主测试函数
async function runTests() {
    console.log('🚀 开始测试待处理提案功能\n');
    console.log('⚠️  注意: 请确保后端服务正在运行，并替换有效的JWT token\n');

    try {
        // 测试Dashboard卡片API
        await testDashboardCardsAPI();
        
        // 测试待处理提案API
        await testPendingProposalsAPI();
        
        console.log('\n✅ 所有测试完成!');
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 解决方案:');
            console.log('1. 确保后端服务正在运行: cd backend && go run cmd/main.go');
            console.log('2. 检查端口8080是否可用');
        }
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.log('\n💡 解决方案:');
            console.log('1. 登录系统获取有效的JWT token');
            console.log('2. 替换脚本中的token变量');
        }
    }
}

// 运行测试
runTests();
