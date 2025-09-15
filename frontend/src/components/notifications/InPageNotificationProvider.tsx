import React, { useEffect } from 'react';
import { useNotificationStore } from '../../stores/notificationStore';
import { useInPageNotification } from '../../hooks/useInPageNotification';
import InPageNotificationModal from './InPageNotificationModal';

const InPageNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setInPageNotificationCallback } = useNotificationStore();
  const {
    currentNotification,
    showNotification,
    closeCurrentNotification,
    handleNotificationAction
  } = useInPageNotification();

  useEffect(() => {
    // 注册页面内通知回调
    setInPageNotificationCallback(showNotification);
    
    // 清理回调
    return () => {
      setInPageNotificationCallback(null);
    };
  }, [setInPageNotificationCallback, showNotification]);

  return (
    <>
      {children}
      <InPageNotificationModal
        notification={currentNotification}
        onClose={closeCurrentNotification}
        onAction={handleNotificationAction}
      />
    </>
  );
};

export default InPageNotificationProvider;
