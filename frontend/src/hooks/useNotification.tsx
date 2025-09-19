// =====================================================
// 通知管理 Hook
// 版本: v1.0
// 功能: 提供简单易用的通知管理功能
// 作者: Cascade AI
// 创建时间: 2025-09-19
// =====================================================

import React, { useState, useCallback, createContext, useContext } from 'react';
import Notification, { type NotificationType } from '../components/ui/Notification';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (notification: Omit<NotificationItem, 'id'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const showNotification = useCallback((notification: Omit<NotificationItem, 'id'>) => {
    const id = Date.now().toString();
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    showNotification({ type: 'success', title, message });
  }, [showNotification]);

  const showError = useCallback((title: string, message?: string) => {
    showNotification({ type: 'error', title, message, duration: 6000 }); // 错误消息显示更久
  }, [showNotification]);

  const showWarning = useCallback((title: string, message?: string) => {
    showNotification({ type: 'warning', title, message, duration: 5000 });
  }, [showNotification]);

  const showInfo = useCallback((title: string, message?: string) => {
    showNotification({ type: 'info', title, message });
  }, [showNotification]);

  const contextValue: NotificationContextType = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* 渲染通知 - 中央弹出式，只显示最新的一个 */}
      {notifications.length > 0 && (
        <Notification
          key={notifications[notifications.length - 1].id}
          type={notifications[notifications.length - 1].type}
          title={notifications[notifications.length - 1].title}
          message={notifications[notifications.length - 1].message}
          duration={notifications[notifications.length - 1].duration}
          show={true}
          onClose={() => removeNotification(notifications[notifications.length - 1].id)}
        />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
