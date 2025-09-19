import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

// 权限映射类型定义
export interface PermissionMapping {
  code: string;
  mapping_type: string;
  mapping_url: string;
  ui_element_id: string;
  display_order: number;
}

// 用户权限映射结构
export interface UserPermissionMappings {
  menu: PermissionMapping[];
  button: PermissionMapping[];
  api: PermissionMapping[];
  page: PermissionMapping[];
  feature: PermissionMapping[];
}

// 权限检查Hook
export const usePermissions = () => {
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
  const parsePermissionsFromToken = useCallback(() => {
    if (!token) return null;
    
    try {
      // 解析JWT payload
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.permissions || null;
    } catch (err) {
      console.error('Failed to parse permissions from token:', err);
      return null;
    }
  }, [token]);

  // 获取用户权限映射
  const fetchUserPermissions = useCallback(async () => {
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
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/permission-mappings/user`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
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
      console.error('Failed to fetch user permissions:', err);
    } finally {
      setLoading(false);
    }
  }, [token, parsePermissionsFromToken]);

  // 检查是否有特定权限
  const hasPermission = useCallback((permissionCode: string): boolean => {
    if (!user || !permissionCode) return false;
    
    // 超级管理员拥有所有权限
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }

    // 检查所有类型的权限映射
    const allPermissions = [
      ...permissions.menu,
      ...permissions.button,
      ...permissions.api,
      ...permissions.page,
      ...permissions.feature
    ];

    return allPermissions.some(p => p.code === permissionCode);
  }, [user, permissions]);

  // 检查菜单权限
  const hasMenuPermission = useCallback((menuCode: string): boolean => {
    if (!user || !menuCode) {
      console.log('🔍 hasMenuPermission: 用户或菜单代码为空', { user: !!user, menuCode });
      return false;
    }
    
    console.log('🔍 hasMenuPermission: 检查菜单权限', { 
      menuCode, 
      userRole: user.role, 
      isAdmin: user.role === 'super_admin' || user.role === 'admin',
      permissionsCount: permissions.menu.length
    });
    
    if (user.role === 'super_admin' || user.role === 'admin') {
      console.log('✅ hasMenuPermission: 管理员权限通过');
      return true;
    }

    const hasPermission = permissions.menu.some(p => p.code === menuCode);
    console.log('🔍 hasMenuPermission: 普通用户权限检查结果', { hasPermission });
    return hasPermission;
  }, [user, permissions.menu]);

  // 检查按钮权限
  const hasButtonPermission = useCallback((buttonCode: string): boolean => {
    if (!user || !buttonCode) return false;
    
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }

    return permissions.button.some(p => p.code === buttonCode);
  }, [user, permissions.button]);

  // 检查页面权限
  const hasPagePermission = useCallback((pageCode: string): boolean => {
    if (!user || !pageCode) return false;
    
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }

    return permissions.page.some(p => p.code === pageCode);
  }, [user, permissions.page]);

  // 检查API权限
  const hasAPIPermission = useCallback((apiCode: string): boolean => {
    if (!user || !apiCode) return false;
    
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }

    return permissions.api.some(p => p.code === apiCode);
  }, [user, permissions.api]);

  // 通过UI元素ID检查权限
  const hasElementPermission = useCallback((elementId: string): boolean => {
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
  }, [user, permissions]);

  // 获取用户可访问的菜单列表
  const getAccessibleMenus = useCallback(() => {
    if (!user) return [];
    
    if (user.role === 'super_admin' || user.role === 'admin') {
      // 管理员返回所有菜单的默认列表
      return [
        { code: 'system.menu.dashboard', name: 'Dashboard', url: '/' },
        { code: 'system.menu.proposals', name: 'Proposals', url: '/proposals' },
        { code: 'system.menu.safes', name: 'Safes', url: '/safes' },
        { code: 'system.menu.transactions', name: 'Transactions', url: '/transactions' },
        { code: 'system.menu.permissions', name: 'Permissions', url: '/permissions' },
        { code: 'system.menu.policies', name: 'Policies', url: '/policies' },
        { code: 'system.menu.analytics', name: 'Analytics', url: '/analytics' },
        { code: 'system.menu.team', name: 'Team', url: '/team' },
        { code: 'system.menu.settings', name: 'Settings', url: '/settings' }
      ];
    }

    return permissions.menu.map(p => ({
      code: p.code,
      name: p.code.split('.').pop() || '',
      url: p.mapping_url
    }));
  }, [user, permissions.menu]);

  // 初始化时获取权限
  useEffect(() => {
    if (token && user) {
      fetchUserPermissions();
    }
  }, [token, user, fetchUserPermissions]);

  return {
    permissions,
    loading,
    error,
    hasPermission,
    hasMenuPermission,
    hasButtonPermission,
    hasPagePermission,
    hasAPIPermission,
    hasElementPermission,
    getAccessibleMenus,
    refetchPermissions: fetchUserPermissions
  };
};

// 权限检查工具函数
export const checkPermission = (userRole: string, permissionCode: string, userPermissions?: UserPermissionMappings): boolean => {
  // 管理员拥有所有权限
  if (userRole === 'super_admin' || userRole === 'admin') {
    return true;
  }

  if (!userPermissions) return false;

  const allPermissions = [
    ...userPermissions.menu,
    ...userPermissions.button,
    ...userPermissions.api,
    ...userPermissions.page,
    ...userPermissions.feature
  ];

  return allPermissions.some(p => p.code === permissionCode);
};

export default usePermissions;
