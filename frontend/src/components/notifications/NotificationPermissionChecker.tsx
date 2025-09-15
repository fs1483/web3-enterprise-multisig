import React, { useEffect, useState } from 'react';
import { Bell, AlertTriangle, CheckCircle, Settings } from 'lucide-react';

const NotificationPermissionChecker: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // 检查浏览器支持
    setIsSupported('Notification' in window);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        // 显示测试通知
        const testNotification = new Notification('通知权限已启用', {
          body: '您现在可以接收实时通知了！',
          icon: '/favicon.ico',
        });
        
        setTimeout(() => testNotification.close(), 3000);
      }
    }
  };


  if (!isSupported) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800 font-medium">浏览器不支持通知功能</span>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <div>
              <p className="text-red-800 font-medium">通知权限被拒绝</p>
              <p className="text-red-600 text-sm">请在浏览器设置中手动启用通知权限</p>
            </div>
          </div>
          <button
            onClick={() => {
              // 显示如何启用通知的说明
              alert(`请按以下步骤启用通知权限：

Chrome/Edge:
1. 点击地址栏左侧的锁图标
2. 找到"通知"选项
3. 选择"允许"

Firefox:
1. 点击地址栏左侧的盾牌图标
2. 找到"通知"选项
3. 选择"允许"

Safari:
1. 在菜单栏选择 Safari > 偏好设置
2. 点击"网站"标签
3. 在左侧选择"通知"
4. 找到当前网站并设置为"允许"`);
            }}
            className="flex items-center px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            <Settings className="w-4 h-4 mr-1" />
            查看设置方法
          </button>
        </div>
      </div>
    );
  }

  if (permission === 'granted') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-green-800 font-medium">通知权限已启用</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Bell className="w-5 h-5 text-yellow-600 mr-2" />
          <div>
            <p className="text-yellow-800 font-medium">启用通知权限</p>
            <p className="text-yellow-700 text-sm">接收实时提案和签名通知</p>
          </div>
        </div>
        <button
          onClick={requestPermission}
          className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          <Bell className="w-4 h-4 mr-1" />
          启用通知
        </button>
      </div>
    </div>
  );
};

export default NotificationPermissionChecker;
