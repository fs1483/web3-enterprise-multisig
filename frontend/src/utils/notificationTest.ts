// 浏览器通知测试工具
export const testBrowserNotification = async () => {
  console.log('🧪 开始测试浏览器通知功能...');
  
  // 1. 检查浏览器支持
  if (!('Notification' in window)) {
    console.error('❌ 此浏览器不支持通知功能');
    return false;
  }
  
  console.log('✅ 浏览器支持通知功能');
  console.log('📋 当前权限状态:', Notification.permission);
  
  // 2. 请求权限
  if (Notification.permission === 'default') {
    console.log('📋 请求通知权限...');
    const permission = await Notification.requestPermission();
    console.log('📋 权限请求结果:', permission);
    
    if (permission !== 'granted') {
      console.warn('⚠️ 用户拒绝了通知权限');
      return false;
    }
  } else if (Notification.permission === 'denied') {
    console.warn('⚠️ 通知权限被拒绝');
    return false;
  }
  
  // 3. 创建测试通知
  try {
    console.log('🔔 创建测试通知...');
    const notification = new Notification('测试通知', {
      body: '这是一个测试通知，如果您看到这个消息，说明通知功能正常工作！',
      icon: '/favicon.ico',
      tag: 'test',
      requireInteraction: false,
    });
    
    notification.onshow = () => {
      console.log('✅ 测试通知已显示');
    };
    
    notification.onerror = (error) => {
      console.error('❌ 测试通知显示失败:', error);
    };
    
    notification.onclick = () => {
      console.log('🖱️ 用户点击了测试通知');
      notification.close();
    };
    
    // 5秒后自动关闭
    setTimeout(() => {
      notification.close();
      console.log('⏰ 测试通知已自动关闭');
    }, 5000);
    
    return true;
  } catch (error) {
    console.error('❌ 创建测试通知失败:', error);
    return false;
  }
};

// 在控制台中运行测试
(window as any).testNotification = testBrowserNotification;
