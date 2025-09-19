#!/usr/bin/env node

// 这个脚本帮助调试前端认证token问题
console.log('🔍 权限字典页面调试指南\n');

console.log('1. 检查浏览器localStorage中的认证信息:');
console.log('   打开浏览器开发者工具 -> Application -> Local Storage');
console.log('   查找键名包含 "auth" 的项目\n');

console.log('2. 检查JWT token格式:');
console.log('   应该类似: auth-storage 或 token');
console.log('   值应该是一个JSON字符串，包含token字段\n');

console.log('3. 常见问题排查:');
console.log('   ❌ 401 Unauthorized - JWT token无效或过期');
console.log('   ❌ 404 Not Found - API路由不存在');
console.log('   ❌ 403 Forbidden - 权限不足\n');

console.log('4. 修复步骤:');
console.log('   a) 确保用户已登录 (超管账户)');
console.log('   b) 检查token是否正确存储在localStorage');
console.log('   c) 验证API路由是否正确配置');
console.log('   d) 检查后端权限中间件配置\n');

console.log('5. 测试API端点:');
console.log('   GET /api/v1/permissions/definitions');
console.log('   GET /api/v1/permissions/categories'); 
console.log('   GET /api/v1/permissions/scopes\n');

console.log('6. 前端调试代码:');
console.log(`
// 在浏览器控制台中运行
const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
console.log('Auth data:', authData);
console.log('Token:', authData.token || authData.state?.token);

// 测试API调用
fetch('/api/v1/permissions/definitions', {
  headers: {
    'Authorization': \`Bearer \${authData.token || authData.state?.token}\`,
    'Content-Type': 'application/json'
  }
})
.then(res => {
  console.log('Status:', res.status);
  return res.json();
})
.then(data => console.log('Data:', data))
.catch(err => console.error('Error:', err));
`);

console.log('\n7. 后端日志检查:');
console.log('   查看后端控制台输出，确认:');
console.log('   - 数据库连接正常');
console.log('   - 路由注册成功');
console.log('   - JWT中间件工作正常\n');

console.log('8. 数据库验证:');
console.log('   确认permission_definitions表存在且有数据:');
console.log('   SELECT COUNT(*) FROM permission_definitions;\n');

console.log('🚀 开始调试吧！');
