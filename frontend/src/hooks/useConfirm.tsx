// =====================================================
// 确认对话框管理 Hook
// 版本: v1.0
// 功能: 提供简单易用的确认对话框功能
// 作者: Cascade AI
// 创建时间: 2025-09-19
// =====================================================

import React, { useState, useCallback, createContext, useContext } from 'react';
import ConfirmDialog, { type ConfirmType } from '../components/ui/ConfirmDialog';

interface ConfirmOptions {
  type?: ConfirmType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState) {
      confirmState.resolve(true);
      setConfirmState(null);
    }
  }, [confirmState]);

  const handleCancel = useCallback(() => {
    if (confirmState) {
      confirmState.resolve(false);
      setConfirmState(null);
    }
  }, [confirmState]);

  const contextValue: ConfirmContextType = {
    confirm,
  };

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}
      
      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          type={confirmState.options.type}
          title={confirmState.options.title}
          message={confirmState.options.message}
          confirmText={confirmState.options.confirmText}
          cancelText={confirmState.options.cancelText}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmContextType => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
