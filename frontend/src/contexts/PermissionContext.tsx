import React, { createContext, useContext, useEffect, useState } from 'react';
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { useAuthStore } from '../stores/authStore';
import type { UserPermissionMappings } from '../hooks/usePermissions';

interface PermissionContextType {
  permissions: UserPermissionMappings;
  loading: boolean;
  error: string | null;
  hasPermission: (code: string) => boolean;
  hasMenuPermission: (code: string) => boolean;
  hasButtonPermission: (code: string) => boolean;
  hasPagePermission: (code: string) => boolean;
  hasAPIPermission: (code: string) => boolean;
  hasElementPermission: (elementId: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: React.ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { token, user } = useAuthStore();
  const [permissions, setPermissions] = useState<UserPermissionMappings>({
    menu: [],
    button: [],
    api: [],
    page: [],
    feature: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 从JWT中解析权限信息
  const parsePermissionsFromToken = () => {
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.permissions || null;
    } catch (err) {
      console.error('Failed to parse permissions from token:', err);
      return null;
    }
  };

  // 获取用户权限映射
  const fetchPermissions = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // 首先尝试从JWT中获取权限
      const tokenPermissions = parsePermissionsFromToken();
      if (tokenPermissions) {
        setPermissions({
          menu: tokenPermissions.menu || [],
          button: tokenPermissions.button || [],
          api: tokenPermissions.api || [],
          page: tokenPermissions.page || [],
          feature: tokenPermissions.feature || []
        });
        setLoading(false);
        return;
      }

      // 如果JWT中没有权限信息，从API获取
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/permission-mappings/user`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            ...getAuthHeaders()
          }
        }
      );

      if (!response.ok) {
        throw new Error('获取权限映射失败');
      }

      const data = await response.json();
      if (data.success) {
        setPermissions({
          menu: data.data.mappings.menu || [],
          button: data.data.mappings.button || [],
          api: data.data.mappings.api || [],
          page: data.data.mappings.page || [],
          feature: data.data.mappings.feature || []
        });
      } else {
        throw new Error(data.error || '获取权限映射失败');
      }
    } catch (err: any) {
      setError(err.message || '获取权限映射失败');
      console.error('Failed to fetch permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  // 权限检查函数
  const hasPermission = (code: string): boolean => {
    if (!user || !code) return false;
    
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }

    const allPermissions = [
      ...permissions.menu,
      ...permissions.button,
      ...permissions.api,
      ...permissions.page,
      ...permissions.feature
    ];

    return allPermissions.some(p => p.code === code);
  };

  const hasMenuPermission = (code: string): boolean => {
    if (!user || !code) return false;
    
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }

    return permissions.menu.some(p => p.code === code);
  };

  const hasButtonPermission = (code: string): boolean => {
    if (!user || !code) return false;
    
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }

    return permissions.button.some(p => p.code === code);
  };

  const hasPagePermission = (code: string): boolean => {
    if (!user || !code) return false;
    
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }

    return permissions.page.some(p => p.code === code);
  };

  const hasAPIPermission = (code: string): boolean => {
    if (!user || !code) return false;
    
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }

    return permissions.api.some(p => p.code === code);
  };

  const hasElementPermission = (elementId: string): boolean => {
    if (!user || !elementId) return false;
    
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }

    const allPermissions = [
      ...permissions.menu,
      ...permissions.button,
      ...permissions.page,
      ...permissions.feature
    ];

    return allPermissions.some(p => p.ui_element_id === elementId);
  };

  // 初始化权限
  useEffect(() => {
    if (token && user) {
      fetchPermissions();
    }
  }, [token, user]);

  const contextValue: PermissionContextType = {
    permissions,
    loading,
    error,
    hasPermission,
    hasMenuPermission,
    hasButtonPermission,
    hasPagePermission,
    hasAPIPermission,
    hasElementPermission,
    refreshPermissions: fetchPermissions
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissionContext = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissionContext must be used within a PermissionProvider');
  }
  return context;
};

export default PermissionContext;
