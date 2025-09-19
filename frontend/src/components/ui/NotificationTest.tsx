// =====================================================
// 通知系统快速测试组件
// 用于验证通知是否正常工作
// =====================================================

import React from 'react';
import { useNotification } from '../../hooks/useNotification';
import { Button } from './Button';

const NotificationTest: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotification();

  const handleTestSuccess = () => {
    console.log('🧪 测试成功通知');
    showSuccess('测试成功', '这是一个测试成功通知');
  };

  const handleTestError = () => {
    console.log('🧪 测试错误通知');
    showError('测试错误', '这是一个测试错误通知');
  };

  const handleTestWarning = () => {
    console.log('🧪 测试警告通知');
    showWarning('测试警告', '这是一个测试警告通知');
  };

  const handleTestInfo = () => {
    console.log('🧪 测试信息通知');
    showInfo('测试信息', '这是一个测试信息通知');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white p-4 rounded-lg shadow-lg border">
      <h3 className="text-sm font-semibold mb-2">🧪 通知测试</h3>
      <div className="space-y-2">
        <Button size="sm" variant="primary" onClick={handleTestSuccess}>
          测试成功
        </Button>
        <Button size="sm" variant="danger" onClick={handleTestError}>
          测试错误
        </Button>
        <Button size="sm" variant="secondary" onClick={handleTestWarning}>
          测试警告
        </Button>
        <Button size="sm" variant="outline" onClick={handleTestInfo}>
          测试信息
        </Button>
      </div>
    </div>
  );
};

export default NotificationTest;
