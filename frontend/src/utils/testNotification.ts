// =====================================================
// 通知系统测试工具
// 用于调试和验证通知组件是否正常工作
// =====================================================

// 在浏览器控制台中运行这个函数来测试通知
export const testNotificationSystem = () => {
  console.log('🧪 开始测试通知系统...');
  
  // 检查是否有 NotificationProvider
  const notificationElements = document.querySelectorAll('[role="alert"]');
  console.log(`📊 当前页面通知元素数量: ${notificationElements.length}`);
  
  // 检查是否有通知相关的 CSS 动画
  const stylesheets = Array.from(document.styleSheets);
  let hasNotificationAnimation = false;
  
  try {
    stylesheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach(rule => {
          if (rule.cssText && rule.cssText.includes('shrink-progress')) {
            hasNotificationAnimation = true;
          }
        });
      } catch (e) {
        // 跨域样式表可能无法访问
      }
    });
  } catch (e) {
    console.warn('⚠️ 无法检查样式表:', e);
  }
  
  console.log(`🎨 通知动画CSS存在: ${hasNotificationAnimation}`);
  
  // 检查 Tailwind CSS 是否加载
  const testElement = document.createElement('div');
  testElement.className = 'fixed top-0 left-0 opacity-0 pointer-events-none';
  document.body.appendChild(testElement);
  const styles = window.getComputedStyle(testElement);
  const hasTailwind = styles.position === 'fixed';
  document.body.removeChild(testElement);
  
  console.log(`🎯 Tailwind CSS加载: ${hasTailwind}`);
  
  return {
    notificationElements: notificationElements.length,
    hasNotificationAnimation,
    hasTailwind,
    status: hasTailwind ? '✅ 系统正常' : '❌ 样式加载异常'
  };
};

// 在全局对象上暴露测试函数
if (typeof window !== 'undefined') {
  (window as any).testNotificationSystem = testNotificationSystem;
}
