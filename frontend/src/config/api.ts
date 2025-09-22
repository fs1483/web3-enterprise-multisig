// =====================================================
// API 配置文件
// 版本: v1.0
// 功能: 统一管理 API 基础配置
// 作者: sfan
// 创建时间: 2024-12-21
// =====================================================

// 获取 API 基础 URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// 获取 WebSocket URL
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

// API 路径构建函数
export const buildApiUrl = (path: string): string => {
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 如果 API_BASE_URL 为空（开发环境），直接返回路径用于 Vite 代理
  if (!API_BASE_URL || API_BASE_URL === '') {
    return normalizedPath;
  }
  
  // 移除 API_BASE_URL 末尾的斜杠（如果有）
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  
  return `${baseUrl}${normalizedPath}`;
};

// 常用 API 路径
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    WALLET_REGISTER: '/api/v1/auth/wallet-register',
    WALLET_LOGIN: '/api/v1/auth/wallet-login',
    PROFILE: '/api/v1/auth/profile',
  },
  
  // Safe 相关
  SAFES: {
    LIST: '/api/v1/safes',
    CREATE: '/api/v1/safes',
    DETAIL: (id: string) => `/api/v1/safes/${id}`,
    MEMBERS: (id: string) => `/api/v1/safes/${id}/members`,
    PERMISSIONS: (id: string) => `/api/v1/safes/${id}/permissions`,
  },
  
  // 提案相关
  PROPOSALS: {
    LIST: (safeId: string) => `/api/v1/safes/${safeId}/proposals`,
    CREATE: (safeId: string) => `/api/v1/safes/${safeId}/proposals`,
    DETAIL: (safeId: string, proposalId: string) => `/api/v1/safes/${safeId}/proposals/${proposalId}`,
    SIGN: (safeId: string, proposalId: string) => `/api/v1/safes/${safeId}/proposals/${proposalId}/sign`,
    EXECUTE: (safeId: string, proposalId: string) => `/api/v1/safes/${safeId}/proposals/${proposalId}/execute`,
  },
  
  // 权限相关
  PERMISSIONS: {
    DEFINITIONS: '/api/v1/permissions/definitions',
    CHECK: (safeId: string) => `/api/v1/safes/${safeId}/permissions/check`,
    AUDIT_LOGS: (safeId: string) => `/api/v1/safes/${safeId}/permissions/audit-logs`,
  },
  
  // 仪表板相关
  DASHBOARD: {
    STATS: '/api/v1/dashboard/stats',
    ACTIVITY: '/api/v1/dashboard/activity',
  },
  
  // 用户相关
  USERS: {
    LIST: '/api/v1/users',
    SELECTION: '/api/v1/users/selection',
    PERMISSIONS: (userId: string) => `/api/v1/users/${userId}/permissions`,
  },
} as const;

// 默认请求头
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const;

// 获取认证头
export const getAuthHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// 调试信息
if (import.meta.env.DEV) {
  console.log('🔧 API Configuration:', {
    API_BASE_URL,
    WS_URL,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_WS_URL: import.meta.env.VITE_WS_URL,
  });
}
