import { safeService } from '../services/safeService';

export async function testSafeIntegration() {
  try {
    console.log('🧪 Testing Safe SDK integration...');

    // 初始化 Safe SDK
    await safeService.initialize();
    console.log('✅ Safe SDK initialized');

    // 测试创建 Safe（需要 MetaMask 连接）
    // const owners = ['0x...', '0x...'];
    // const threshold = 2;
    // const safeAddress = await safeService.createSafe(owners, threshold);
    // console.log('✅ Safe created:', safeAddress);

    console.log('🎉 Safe SDK integration test completed');
  } catch (error) {
    console.error('❌ Safe SDK integration test failed:', error);
  }
}

// 运行测试 - 注释掉自动执行，避免页面加载时出错
// testSafeIntegration();

// 如果需要测试，可以在浏览器控制台手动调用：
// testSafeIntegration();
