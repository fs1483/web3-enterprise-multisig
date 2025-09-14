const http = require('http');

// 简单测试Dashboard API是否可访问
async function testDashboardAPI() {
    console.log('🧪 测试Dashboard API连接...\n');

    const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/api/v1/dashboard/pending-proposals',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('📡 响应状态码:', res.statusCode);
                console.log('📋 响应内容:', data);
                
                if (res.statusCode === 401) {
                    console.log('✅ API端点存在，需要认证 (正常)');
                } else if (res.statusCode === 404) {
                    console.log('❌ API端点不存在');
                } else {
                    console.log('✅ API端点响应正常');
                }
                
                resolve({ statusCode: res.statusCode, data });
            });
        });

        req.on('error', (error) => {
            if (error.code === 'ECONNREFUSED') {
                console.log('❌ 无法连接到后端服务');
                console.log('💡 请启动后端服务: cd backend && go run cmd/main.go');
            } else {
                console.log('❌ 请求失败:', error.message);
            }
            reject(error);
        });

        req.end();
    });
}

// 测试Dashboard Cards API
async function testDashboardCardsAPI() {
    console.log('\n🧪 测试Dashboard Cards API连接...\n');

    const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/api/v1/dashboard/cards',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('📡 响应状态码:', res.statusCode);
                console.log('📋 响应内容:', data);
                
                if (res.statusCode === 401) {
                    console.log('✅ API端点存在，需要认证 (正常)');
                } else if (res.statusCode === 404) {
                    console.log('❌ API端点不存在');
                } else {
                    console.log('✅ API端点响应正常');
                }
                
                resolve({ statusCode: res.statusCode, data });
            });
        });

        req.on('error', (error) => {
            if (error.code === 'ECONNREFUSED') {
                console.log('❌ 无法连接到后端服务');
            } else {
                console.log('❌ 请求失败:', error.message);
            }
            reject(error);
        });

        req.end();
    });
}

// 运行测试
async function runTests() {
    console.log('🚀 开始测试Dashboard API连接\n');

    try {
        await testDashboardCardsAPI();
        await testDashboardAPI();
        
        console.log('\n✅ API连接测试完成');
        console.log('\n📝 下一步:');
        console.log('1. 启动后端服务 (如果未启动)');
        console.log('2. 登录前端获取JWT token');
        console.log('3. 在Dashboard页面查看待处理提案区域');
        
    } catch (error) {
        console.log('\n❌ 测试失败');
    }
}

runTests();
