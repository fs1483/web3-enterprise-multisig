// =====================================================
// 应用程序 Provider 组合
// 版本: v1.0
// 功能: 组合所有需要的 Context Provider
// 作者: Cascade AI
// 创建时间: 2025-09-19
// =====================================================

import React from 'react';
import { NotificationProvider } from '../../hooks/useNotification';
import { ConfirmProvider } from '../../hooks/useConfirm';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <NotificationProvider>
      <ConfirmProvider>
        {children}
      </ConfirmProvider>
    </NotificationProvider>
  );
};
