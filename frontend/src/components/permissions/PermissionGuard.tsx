import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  menuPermission?: string;
  buttonPermission?: string;
  pagePermission?: string;
  apiPermission?: string;
  elementId?: string;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

/**
 * 权限保护组件
 * 根据用户权限决定是否显示子组件
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  menuPermission,
  buttonPermission,
  pagePermission,
  apiPermission,
  elementId,
  fallback = null,
  showFallback = false
}) => {
  const {
    hasPermission,
    hasMenuPermission,
    hasButtonPermission,
    hasPagePermission,
    hasAPIPermission,
    hasElementPermission,
    loading
  } = usePermissions();

  // 加载中显示占位符
  if (loading) {
    return showFallback ? <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div> : null;
  }

  // 检查各种类型的权限
  let hasAccess = true;

  if (permission && !hasPermission(permission)) {
    hasAccess = false;
  }

  if (menuPermission && !hasMenuPermission(menuPermission)) {
    hasAccess = false;
  }

  if (buttonPermission && !hasButtonPermission(buttonPermission)) {
    hasAccess = false;
  }

  if (pagePermission && !hasPagePermission(pagePermission)) {
    hasAccess = false;
  }

  if (apiPermission && !hasAPIPermission(apiPermission)) {
    hasAccess = false;
  }

  if (elementId && !hasElementPermission(elementId)) {
    hasAccess = false;
  }

  // 如果没有权限，显示fallback或null
  if (!hasAccess) {
    console.log('❌ PermissionGuard: 权限检查失败', { 
      menuPermission, 
      hasAccess, 
      showFallback 
    });
    return showFallback ? <>{fallback}</> : null;
  }

  console.log('✅ PermissionGuard: 权限检查通过，渲染子组件', { menuPermission });
  return <>{children}</>;
};

/**
 * 菜单权限保护组件
 */
export const MenuGuard: React.FC<{
  children: React.ReactNode;
  menuCode: string;
  fallback?: React.ReactNode;
}> = ({ children, menuCode, fallback = null }) => {
  console.log('🔍 MenuGuard 渲染:', { menuCode });
  return (
    <PermissionGuard menuPermission={menuCode} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
};

/**
 * 按钮权限保护组件
 */
export const ButtonGuard: React.FC<{
  children: React.ReactNode;
  buttonCode: string;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}> = ({ children, buttonCode, fallback = null, showFallback = false }) => {
  return (
    <PermissionGuard 
      buttonPermission={buttonCode} 
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </PermissionGuard>
  );
};

/**
 * 页面权限保护组件
 */
export const PageGuard: React.FC<{
  children: React.ReactNode;
  pageCode: string;
  fallback?: React.ReactNode;
}> = ({ children, pageCode, fallback }) => {
  return (
    <PermissionGuard 
      pagePermission={pageCode} 
      fallback={fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl text-gray-400 mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-700 mb-2">访问受限</h1>
            <p className="text-gray-500">您没有权限访问此页面</p>
          </div>
        </div>
      )}
      showFallback={true}
    >
      {children}
    </PermissionGuard>
  );
};

/**
 * API权限保护组件（用于条件渲染依赖API的内容）
 */
export const APIGuard: React.FC<{
  children: React.ReactNode;
  apiCode: string;
  fallback?: React.ReactNode;
}> = ({ children, apiCode, fallback = null }) => {
  return (
    <PermissionGuard apiPermission={apiCode} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
};

/**
 * 元素权限保护组件（通过UI元素ID检查）
 */
export const ElementGuard: React.FC<{
  children: React.ReactNode;
  elementId: string;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}> = ({ children, elementId, fallback = null, showFallback = false }) => {
  return (
    <PermissionGuard 
      elementId={elementId} 
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </PermissionGuard>
  );
};

export default PermissionGuard;
