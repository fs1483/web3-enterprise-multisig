// =====================================================
// 权限服务 API 调用
// 版本: v2.0
// 功能: 提供权限管理相关的API调用服务
// 作者: sfan
// 创建时间: 2024-04-23
// =====================================================

import React from 'react';
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../config/api';

// =====================================================
// 类型定义
// =====================================================

export interface SafeMember {
  user_id: string;
  username: string;
  email: string;
  wallet_address: string;
  role: string;
  restrictions: Record<string, any>;
  is_active: boolean;
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
}

export interface PermissionDefinition {
  code: string;
  name: string;
  description: string;
  category: string;
  scope: string;
  is_active: boolean;
}

export interface PermissionCheckRequest {
  permission: string;
  context?: Record<string, any>;
}

export interface PermissionCheckResult {
  granted: boolean;
  denial_reason?: string;
  user_role?: string;
  required_permission: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  permission_granted: boolean;
  required_permission?: string;
  user_role?: string;
  denial_reason?: string;
  request_context: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AssignRoleRequest {
  user_id: string;
  role: string;
  restrictions?: Record<string, any>;
  expires_at?: string;
}

export interface CreatePermissionRequest {
  code: string;
  name: string;
  description: string;
  category: string;
  scope: string;
}

// =====================================================
// 权限服务类
// =====================================================

export class PermissionService {
  // 获取token的统一方法
  private static getAuthToken(): string | null {
    const authStorage = localStorage.getItem('auth-storage');
    const authData = authStorage ? JSON.parse(authStorage) : null;
    return authData?.token || authData?.state?.token || localStorage.getItem('token');
  }

  // Safe成员管理
  static async getSafeMembers(safeId: string): Promise<{ members: SafeMember[] }> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(buildApiUrl(API_ENDPOINTS.SAFES.MEMBERS(safeId)), {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data as { members: SafeMember[] };
  }

  static async assignSafeRole(safeId: string, request: AssignRoleRequest): Promise<void> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(buildApiUrl(`/api/v1/safes/${safeId}/members/roles`), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getAuthHeaders(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  static async removeSafeMember(safeId: string, userId: string): Promise<void> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(buildApiUrl(`/api/v1/safes/${safeId}/members/${userId}`), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  static async getUserRole(safeId: string, userId: string): Promise<{ role: string; restrictions: Record<string, any> }> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(buildApiUrl(`/api/v1/safes/${safeId}/members/${userId}/role`), {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data as { role: string; restrictions: Record<string, any> };
  }

  // 权限检查
  static async checkPermission(safeId: string, request: PermissionCheckRequest): Promise<PermissionCheckResult> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(buildApiUrl(API_ENDPOINTS.PERMISSIONS.CHECK(safeId)), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getAuthHeaders(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data as PermissionCheckResult;
  }

  // 权限定义管理
  static async getPermissionDefinitions(): Promise<{ definitions: PermissionDefinition[] }> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(buildApiUrl(API_ENDPOINTS.PERMISSIONS.DEFINITIONS), {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data as { definitions: PermissionDefinition[] };
  }

  static async createCustomPermission(request: CreatePermissionRequest): Promise<void> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(buildApiUrl(API_ENDPOINTS.PERMISSIONS.DEFINITIONS), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getAuthHeaders(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  // 审计日志
  static async getPermissionAuditLogs(safeId: string, params?: { page?: number; limit?: number }): Promise<{ logs: AuditLog[] }> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    let url = buildApiUrl(API_ENDPOINTS.PERMISSIONS.AUDIT_LOGS(safeId));
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data as { logs: AuditLog[] };
  }

  // 权限验证辅助方法
  static async hasPermission(safeId: string, permission: string, context?: Record<string, any>): Promise<boolean> {
    try {
      const result = await this.checkPermission(safeId, { permission, context });
      return result.granted;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  // 批量权限检查
  static async checkMultiplePermissions(
    safeId: string, 
    permissions: string[], 
    context?: Record<string, any>
  ): Promise<Record<string, PermissionCheckResult>> {
    const results: Record<string, PermissionCheckResult> = {};
    
    // 并行检查所有权限
    const promises = permissions.map(async (permission) => {
      try {
        const result = await this.checkPermission(safeId, { permission, context });
        results[permission] = result;
      } catch (error) {
        results[permission] = {
          granted: false,
          denial_reason: 'Permission check failed',
          required_permission: permission,
        };
      }
    });

    await Promise.all(promises);
    return results;
  }

  // 获取用户在Safe中的所有权限
  static async getUserPermissions(safeId: string, userId?: string): Promise<string[]> {
    try {
      const userRole = userId 
        ? await this.getUserRole(safeId, userId)
        : null;
      
      const definitions = await this.getPermissionDefinitions();
      const userPermissions: string[] = [];

      // 基于角色获取权限（这里简化处理，实际应该从后端获取）
      if (userRole?.role === 'safe_admin') {
        userPermissions.push(...definitions.definitions.map((d: any) => d.code));
      } else if (userRole?.role === 'safe_treasurer') {
        userPermissions.push(
          ...definitions.definitions
            .filter((d: any) => d.category === 'safe' || d.category === 'proposal')
            .map((d: any) => d.code)
        );
      } else if (userRole?.role === 'safe_operator') {
        userPermissions.push(
          ...definitions.definitions
            .filter((d: any) => d.code.includes('view') || d.code.includes('create'))
            .map((d: any) => d.code)
        );
      }

      return userPermissions;
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return [];
    }
  }
}

// =====================================================
// React Hook for Permission Management
// =====================================================

export const usePermissions = (safeId: string) => {
  const [permissions, setPermissions] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(false);

  const checkPermission = React.useCallback(async (permission: string, context?: Record<string, any>) => {
    if (!safeId) return false;
    
    try {
      const result = await PermissionService.checkPermission(safeId, { permission, context });
      setPermissions(prev => ({ ...prev, [permission]: result.granted }));
      return result.granted;
    } catch (error) {
      setPermissions(prev => ({ ...prev, [permission]: false }));
      return false;
    }
  }, [safeId]);

  const checkMultiplePermissions = React.useCallback(async (permissionList: string[], context?: Record<string, any>) => {
    if (!safeId) return {};
    
    setLoading(true);
    try {
      const results = await PermissionService.checkMultiplePermissions(safeId, permissionList, context);
      const permissionMap: Record<string, boolean> = {};
      
      Object.entries(results).forEach(([permission, result]) => {
        permissionMap[permission] = result.granted;
      });
      
      setPermissions(prev => ({ ...prev, ...permissionMap }));
      return permissionMap;
    } catch (error) {
      console.error('Multiple permission check failed:', error);
      return {};
    } finally {
      setLoading(false);
    }
  }, [safeId]);

  const hasPermission = React.useCallback((permission: string) => {
    return permissions[permission] ?? false;
  }, [permissions]);

  return {
    permissions,
    loading,
    checkPermission,
    checkMultiplePermissions,
    hasPermission,
  };
};

export default PermissionService;
