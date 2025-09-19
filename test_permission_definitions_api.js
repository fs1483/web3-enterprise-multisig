#!/usr/bin/env node

const http = require('http');

// 测试配置
const BASE_URL = 'http://localhost:8080';
const TEST_TOKEN = 'your-jwt-token-here'; // 需要替换为实际的JWT token

// 测试用例
const testCases = [
  {
    name: '测试获取权限定义列表',
    method: 'GET',
    path: '/api/v1/permissions/definitions',
    expectedStatus: 200
  },
  {
    name: '测试获取权限分类',
    method: 'GET', 
    path: '/api/v1/permissions/categories',
    expectedStatus: 200
  },
  {
    name: '测试获取权限作用域',
    method: 'GET',
    path: '/api/v1/permissions/scopes', 
    expectedStatus: 200
  }
];

// HTTP请求函数
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 运行测试
async function runTests() {
  console.log('🚀 开始测试权限定义API...\n');
  
  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}`);
    
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: testCase.path,
      method: testCase.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    };
    
    try {
      const response = await makeRequest(options, testCase.data);
      
      console.log(`   状态码: ${response.statusCode}`);
      console.log(`   预期状态码: ${testCase.expectedStatus}`);
      
      if (response.statusCode === testCase.expectedStatus) {
        console.log('   ✅ 测试通过');
        if (response.data && typeof response.data === 'object') {
          console.log(`   📊 响应数据: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...`);
        }
      } else {
        console.log('   ❌ 测试失败');
        console.log(`   📄 响应内容: ${JSON.stringify(response.data, null, 2)}`);
      }
      
    } catch (error) {
      console.log('   ❌ 请求失败');
      console.log(`   错误信息: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('🏁 测试完成');
}

// 检查后端服务是否运行
async function checkBackendHealth() {
  console.log('🔍 检查后端服务状态...');
  
  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/health',
    method: 'GET',
    timeout: 2000
  };
  
  try {
    const response = await makeRequest(options);
    if (response.statusCode === 200 || response.statusCode === 404) {
      console.log('✅ 后端服务正在运行\n');
      return true;
    } else {
      console.log(`❌ 后端服务状态异常: ${response.statusCode}\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 无法连接到后端服务: ${error.message}`);
    console.log('请确保后端服务已启动 (go run cmd/main.go)\n');
    return false;
  }
}

// 主函数
async function main() {
  const isBackendRunning = await checkBackendHealth();
  
  if (!isBackendRunning) {
    console.log('请先启动后端服务，然后重新运行此测试脚本');
    process.exit(1);
  }
  
  if (TEST_TOKEN === 'your-jwt-token-here') {
    console.log('⚠️  请在脚本中设置有效的JWT token');
    console.log('可以从浏览器开发者工具中获取登录后的token\n');
  }
  
  await runTests();
}

main().catch(console.error);
