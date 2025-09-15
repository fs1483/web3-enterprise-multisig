import { useState, useCallback } from 'react';
import type { Notification } from '../stores/notificationStore';

interface NotificationQueue {
  notifications: Notification[];
  current: Notification | null;
}

export const useInPageNotification = () => {
  const [queue, setQueue] = useState<NotificationQueue>({
    notifications: [],
    current: null
  });

  // 添加通知到队列
  const showNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    // 创建完整的通知对象
    const fullNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };
    setQueue(prev => {
      const newQueue = [...prev.notifications, fullNotification];
      
      // 如果当前没有显示通知，立即显示第一个
      if (!prev.current && newQueue.length > 0) {
        return {
          notifications: newQueue.slice(1),
          current: newQueue[0]
        };
      }
      
      return {
        ...prev,
        notifications: newQueue
      };
    });
  }, []);

  // 关闭当前通知并显示下一个
  const closeCurrentNotification = useCallback(() => {
    setQueue(prev => {
      const nextNotification = prev.notifications[0] || null;
      const remainingNotifications = prev.notifications.slice(1);
      
      return {
        notifications: remainingNotifications,
        current: nextNotification
      };
    });
  }, []);

  // 处理通知操作
  const handleNotificationAction = useCallback((action: 'view' | 'ignore') => {
    const currentNotification = queue.current;
    
    if (currentNotification && action === 'view') {
      // 根据通知类型导航到相应页面
      if (currentNotification.type === 'new_proposal_created' && currentNotification.data?.proposal_id) {
        window.location.href = `/proposals/${currentNotification.data.proposal_id}`;
      } else if (currentNotification.type === 'safe_created' && currentNotification.data?.safe_id) {
        window.location.href = `/safes/${currentNotification.data.safe_id}`;
      }
    }
    
    closeCurrentNotification();
  }, [queue.current, closeCurrentNotification]);

  // 清空所有通知
  const clearAllNotifications = useCallback(() => {
    setQueue({
      notifications: [],
      current: null
    });
  }, []);

  return {
    currentNotification: queue.current,
    queueLength: queue.notifications.length,
    showNotification,
    closeCurrentNotification,
    handleNotificationAction,
    clearAllNotifications
  };
};
