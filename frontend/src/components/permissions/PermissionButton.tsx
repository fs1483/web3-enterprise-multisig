import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: string;
  buttonCode?: string;
  elementId?: string;
  children: React.ReactNode;
  fallbackText?: string;
  showDisabled?: boolean;
  disabledClassName?: string;
}

/**
 * 权限控制按钮组件
 * 根据用户权限决定按钮是否可用或显示
 */
export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  buttonCode,
  elementId,
  children,
  fallbackText,
  showDisabled = false,
  disabledClassName = 'opacity-50 cursor-not-allowed',
  className = '',
  disabled,
  ...props
}) => {
  const {
    hasPermission,
    hasButtonPermission,
    hasElementPermission,
    loading
  } = usePermissions();

  // 检查权限
  let hasAccess = true;
  
  if (permission && !hasPermission(permission)) {
    hasAccess = false;
  }
  
  if (buttonCode && !hasButtonPermission(buttonCode)) {
    hasAccess = false;
  }
  
  if (elementId && !hasElementPermission(elementId)) {
    hasAccess = false;
  }

  // 加载中状态
  if (loading) {
    return (
      <button
        {...props}
        disabled={true}
        className={`${className} ${disabledClassName}`}
      >
        <div className="animate-pulse">Loading...</div>
      </button>
    );
  }

  // 没有权限时的处理
  if (!hasAccess) {
    if (!showDisabled) {
      return null; // 不显示按钮
    }
    
    return (
      <button
        {...props}
        disabled={true}
        className={`${className} ${disabledClassName}`}
        title="您没有权限执行此操作"
      >
        {fallbackText || children}
      </button>
    );
  }

  // 有权限，正常显示按钮
  return (
    <button
      {...props}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
};

export default PermissionButton;
