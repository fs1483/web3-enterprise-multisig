// =====================================================
// 通知组件演示页面
// 用于测试和展示优化后的通知组件效果
// =====================================================

import React, { useState } from 'react';
import Notification, { type NotificationType } from './Notification';
import { Button } from './Button';

const NotificationDemo: React.FC = () => {
  const [notifications, setNotifications] = useState<{
    id: number;
    type: NotificationType;
    title: string;
    message: string;
    show: boolean;
  }[]>([]);
  
  const [nextId, setNextId] = useState(1);

  const showNotification = (type: NotificationType, title: string, message: string) => {
    const newNotification = {
      id: nextId,
      type,
      title,
      message,
      show: true
    };
    
    setNotifications(prev => [...prev, newNotification]);
    setNextId(prev => prev + 1);
  };

  const hideNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const demoNotifications = [
    {
      type: 'success' as NotificationType,
      title: '操作成功',
      message: '新成员已成功添加到Safe钱包'
    },
    {
      type: 'error' as NotificationType,
      title: '操作失败',
      message: '网络连接超时，请检查您的网络设置'
    },
    {
      type: 'warning' as NotificationType,
      title: '注意',
      message: '您的账户余额不足，请及时充值'
    },
    {
      type: 'info' as NotificationType,
      title: '系统提示',
      message: '系统将在5分钟后进行维护更新'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🎨 现代化通知组件演示
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            点击下方按钮测试不同类型的通知效果，通知将在页面中央弹出
          </p>

          {/* 功能特性介绍 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl border border-green-200 dark:border-green-700">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-3">
                ✨ 设计特性
              </h3>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-2">
                <li>• 页面中央弹出，更好的视觉焦点</li>
                <li>• 现代化圆角设计和阴影效果</li>
                <li>• 顶部彩色渐变条区分类型</li>
                <li>• 支持深色模式适配</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
                🚀 交互特性
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <li>• 平滑的进入和退出动画</li>
                <li>• 自动倒计时进度条</li>
                <li>• 悬停效果和点击反馈</li>
                <li>• 键盘和屏幕阅读器友好</li>
              </ul>
            </div>
          </div>

          {/* 测试按钮 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {demoNotifications.map((demo, index) => (
              <Button
                key={index}
                onClick={() => showNotification(demo.type, demo.title, demo.message)}
                variant={demo.type === 'error' ? 'danger' : 'primary'}
                size="md"
              >
                {demo.type === 'success' && '✅ 成功通知'}
                {demo.type === 'error' && '❌ 错误通知'}
                {demo.type === 'warning' && '⚠️ 警告通知'}
                {demo.type === 'info' && 'ℹ️ 信息通知'}
              </Button>
            ))}
          </div>

          {/* 技术说明 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              🔧 技术实现
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <strong className="text-gray-900 dark:text-white">定位方式：</strong>
                <p>使用 fixed + flex 居中定位，确保在所有设备上都能正确显示</p>
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">动画效果：</strong>
                <p>CSS transform + transition 实现平滑的进入退出动画</p>
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">样式系统：</strong>
                <p>Tailwind CSS v3 + 自定义 CSS 动画，支持深色模式</p>
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">可访问性：</strong>
                <p>ARIA 标签 + 键盘导航支持，符合 WCAG 标准</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 渲染所有通知 */}
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          show={notification.show}
          duration={4000}
          onClose={() => hideNotification(notification.id)}
        />
      ))}
    </div>
  );
};

export default NotificationDemo;
